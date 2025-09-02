import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Cargar variables de entorno
dotenv.config();

// Validación de variables de entorno (antes de usar process.env)
const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().optional().default(''),
  DB_NAME: z.string().min(1),
  DB_PORT: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  COOKIE_SAMESITE: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional()
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error('Variables de entorno inválidas:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  // Necesario para que cookies Secure funcionen detrás de proxy/reverse proxy (X-Forwarded-Proto)
  app.set('trust proxy', 1);
}

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:65140')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares de seguridad
app.use(helmet());
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // máx solicitudes por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes, intenta de nuevo más tarde' }
});
app.use('/api/auth', authLimiter);

const metrics: {
  totalRequests: number;
  totalDurationMs: number;
  perRoute: Record<string, { count: number; totalMs: number; lastMs: number }>;
} = {
  totalRequests: 0,
  totalDurationMs: 0,
  perRoute: {}
};

// Rutas que deben mantener su respuesta original
const skipEnvelopePaths = new Set<string>(['/api/health', '/api/readiness']);

// Envoltura de res.json para estandarizar { success, data/error }
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  (res as any).originalJson = originalJson;
  res.json = ((body?: any) => {
    // Saltar si se pidió explícitamente o si está en la lista blanca
    if ((res.locals && res.locals.skipEnvelope) || skipEnvelopePaths.has(req.path)) {
      return originalJson(body);
    }
    // No envolver si ya viene con la clave success
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
      return originalJson(body);
    }
    const status = res.statusCode;
    if (status >= 400 || (body && typeof body === 'object' && (Object.prototype.hasOwnProperty.call(body, 'error')))) {
      const errorMsg = typeof body === 'string' ? body : (body?.error || body?.message || 'Error');
      return originalJson({ success: false, error: errorMsg });
    }
    return originalJson({ success: true, data: body });
  }) as any;
  next();
});

// Logger + métricas por solicitud
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const method = req.method;
  // Usamos originalUrl para mayor detalle
  const path = req.originalUrl.split('?')[0];
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // ns -> ms
    metrics.totalRequests += 1;
    metrics.totalDurationMs += durationMs;
    const key = `${method} ${path}`;
    if (!metrics.perRoute[key]) metrics.perRoute[key] = { count: 0, totalMs: 0, lastMs: 0 };
    metrics.perRoute[key].count += 1;
    metrics.perRoute[key].totalMs += durationMs;
    metrics.perRoute[key].lastMs = durationMs;

    // Log estructurado (JSON)
    try {
      const log = {
        ts: new Date().toISOString(),
        method,
        path,
        status: res.statusCode,
        duration_ms: Math.round(durationMs * 1000) / 1000
      };
      console.log(JSON.stringify(log));
    } catch {}
  });
  next();
});

// Endpoint de métricas básicas
app.get('/api/metrics', (req: Request, res: Response) => {
  const avg = metrics.totalRequests ? metrics.totalDurationMs / metrics.totalRequests : 0;
  const perRoute = Object.fromEntries(
    Object.entries(metrics.perRoute).map(([k, v]) => [k, {
      count: v.count,
      avg_ms: v.count ? v.totalMs / v.count : 0,
      last_ms: v.lastMs
    }])
  );
  res.json({ success: true, data: { total_requests: metrics.totalRequests, avg_ms: avg, per_route: perRoute } });
});

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'paqueteria_app',
  port: parseInt(process.env.DB_PORT || '3306', 10)
};

// Crear pool de conexiones
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.locals.db = pool;



// Rutas
import authRoutes from './routes/auth';
import clientesRoutes from './routes/clientes';
import enviosRoutes from './routes/envios';
import paquetesRoutes from './routes/paquetes';
import usuariosRoutes from './routes/usuarios';

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/envios', enviosRoutes);
app.use('/api/paquetes', paquetesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta de prueba
app.get('/api/health', async (req: Request, res: Response) => {
  res.locals.skipEnvelope = true;
  const corsInfo = {
    allowedOrigins,
    credentials: true
  };
  const cookiesInfo = {
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    secure: isProd || ((process.env.COOKIE_SAMESITE || '').toLowerCase() === 'none'),
    domain: process.env.COOKIE_DOMAIN || null
  };
  let db = { connected: false as boolean, error: undefined as string | undefined };
  try {
    await app.locals.db.query('SELECT 1');
    db.connected = true;
  } catch (e: any) {
    db.connected = false;
    db.error = process.env.NODE_ENV === 'development' ? (e?.message || 'DB error') : undefined;
  }
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    cors: corsInfo,
    cookies: cookiesInfo,
    db
  });
});

// Readiness probe: retorna 200 si la BD responde, 503 en caso contrario
app.get('/api/readiness', async (req: Request, res: Response) => {
  res.locals.skipEnvelope = true;
  try {
    await app.locals.db.query('SELECT 1');
    res.json({ status: 'READY' });
  } catch (e: any) {
    const errMsg = process.env.NODE_ENV === 'development' ? (e?.message || 'DB error') : undefined;
    res.status(503).json({ status: 'NOT_READY', db: { connected: false, error: errMsg } });
  }
});

// Middleware de manejo de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, async () => {
  try {
    // Probar conexión a la base de datos
    await pool.getConnection();
    console.log('Conexión a la base de datos establecida');
  } catch (error: any) {
    console.warn('No se pudo establecer conexión inicial con la base de datos:', error?.message);
  }
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\nCerrando servidor...');
  await pool.end();
  console.log('Conexiones de base de datos cerradas');
  process.exit(0);
});