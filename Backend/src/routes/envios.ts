import { Router } from 'express';
import { body, validationResult, query, param } from 'express-validator';
import { Pool } from 'mysql2/promise';
import { EnviosController } from '../controllers/enviosController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

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

// Validaciones
const envioValidation = [
  body('paquete_id').isInt({ min: 1 }).withMessage('El ID del paquete es requerido y debe ser válido'),
  body('direccion_origen').notEmpty().withMessage('La dirección de origen es requerida'),
  body('direccion_destino').notEmpty().withMessage('La dirección de destino es requerida'),
  body('fecha_envio_estimada').optional().isISO8601().withMessage('La fecha de envío estimada debe ser válida')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['numero_envio', 'fecha_envio_estimada', 'estado']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden inválido')
];

// Función para generar número de envío único
const generateShipmentNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ENV${timestamp.slice(-6)}${random}`;
};

// Obtener todos los envíos con paginación
router.get('/', paginationValidation, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getAll(req, res);
});

// Obtener envío por ID
router.get('/:id', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getById(req, res);
});

// Rastrear envío por número
router.get('/tracking/:numero', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getByTracking(req, res);
});

// Crear nuevo envío
router.post('/', authorizeRoles('admin', 'empleado'), envioValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.create(req, res);
});

// Actualización general del envío
router.put('/:id', authorizeRoles('admin', 'empleado'), [
  body('direccion_origen').optional().notEmpty().withMessage('direccion_origen inválida'),
  body('direccion_destino').optional().notEmpty().withMessage('direccion_destino inválida'),
  body('fecha_envio_estimada').optional().isISO8601().withMessage('fecha_envio_estimada inválida'),
  body('paquete_id').optional().isInt({ min: 1 }).withMessage('paquete_id inválido')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.update(req, res);
});

// Actualizar estado del envío
router.patch('/:id/estado', authorizeRoles('admin', 'empleado'), [
  body('estado').isIn(['pendiente', 'en_transito', 'entregado', 'devuelto', 'cancelado']).withMessage('Estado inválido'),
  body('fecha_entrega_real').optional().isISO8601().withMessage('Fecha de entrega real inválida')
], async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.updateStatus(req, res);
});

// Eliminar envío
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.delete(req, res);
});

// Gestión de paquetes asociados al envío
// Listar paquetes del envío
router.get('/:id/paquetes', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.listPackages(req, res);
});

// Agregar paquetes al envío
router.post('/:id/paquetes', authorizeRoles('admin', 'empleado'), [
  body('paquetes').isArray({ min: 1 }).withMessage('Debe enviar un arreglo "paquetes" con al menos 1 ID'),
  body('paquetes.*').isInt({ min: 1 }).withMessage('Cada paquete debe ser un ID válido')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.addPackages(req, res);
});

// Remover un paquete del envío
router.delete('/:id/paquetes/:paqueteId', authorizeRoles('admin', 'empleado'), [
  param('id').isInt({ min: 1 }).withMessage('Envío inválido'),
  param('paqueteId').isInt({ min: 1 }).withMessage('Paquete inválido')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.removePackage(req, res);
});

export default router;