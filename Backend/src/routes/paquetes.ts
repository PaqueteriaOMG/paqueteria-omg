import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Pool } from 'mysql2/promise';
import { PaquetesController } from '../controllers/paquetesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Endpoint público de rastreo
router.get('/public/track/:code', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getByPublicCode(req, res);
});

// Aplicar autenticación a todas las rutas restantes
router.use(authenticateToken);

// Validaciones
const paqueteValidation = [
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('peso').isFloat({ min: 0.1 }).withMessage('El peso debe ser mayor a 0'),
  body('dimensiones').notEmpty().withMessage('Las dimensiones son requeridas'),
  body('valor_declarado').isFloat({ min: 0 }).withMessage('El valor declarado debe ser mayor o igual a 0'),
  body('fragil').isBoolean().withMessage('El campo frágil debe ser verdadero o falso')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['numero_seguimiento', 'descripcion', 'peso', 'fecha_creacion', 'estado']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden inválido')
];

// Función para generar número de seguimiento único
const generateTrackingNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PKG${timestamp.slice(-6)}${random}`;
};

// Middleware para validar entrada y pasar al controlador
const validateAndPassToController = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
  }
  next();
};

// Obtener todos los paquetes con paginación
router.get('/', paginationValidation, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getAll(req, res);
});

// Obtener paquete por ID
router.get('/:id', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getById(req, res);
});

// Buscar paquete por número de seguimiento
router.get('/tracking/:numero', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getByTracking(req, res);
});

// Crear nuevo paquete
router.post('/', authorizeRoles('admin', 'empleado'), paqueteValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.create(req, res);
});

// Creación masiva de paquetes
router.post('/bulk', authorizeRoles('admin', 'empleado'), [
  body('items').isArray({ min: 1 }).withMessage('items debe ser un arreglo con al menos un elemento'),
  body('items.*.cliente_id').isInt({ min: 1 }).withMessage('cliente_id inválido'),
  body('items.*.descripcion').notEmpty().withMessage('descripcion requerida'),
  body('items.*.peso').isFloat({ min: 0.1 }).withMessage('peso inválido'),
  body('items.*.dimensiones').notEmpty().withMessage('dimensiones requeridas'),
  body('items.*.valor_declarado').isFloat({ min: 0 }).withMessage('valor_declarado inválido'),
  body('items.*.direccion_origen').notEmpty().withMessage('direccion_origen requerida'),
  body('items.*.direccion_destino').notEmpty().withMessage('direccion_destino requerida')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.bulkCreate(req, res);
});

// Obtener etiqueta SVG del paquete
router.get('/:id/etiqueta', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getLabel(req, res);
});

// Historial del paquete
router.get('/:id/historial', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.getHistory(req, res);
});

// Actualizar paquete
router.put('/:id', authorizeRoles('admin', 'empleado'), paqueteValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.update(req, res);
});

// Actualizar estado del paquete
router.patch('/:id/estado', authorizeRoles('admin', 'empleado'), [
  body('estado').isIn(['pendiente', 'en_transito', 'entregado', 'devuelto']).withMessage('Estado inválido')
], async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.updateStatus(req, res);
});

// Eliminar paquete
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const paquetesController = new PaquetesController(db);
  await paquetesController.delete(req, res);
});

export default router;