import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Pool } from 'mysql2/promise';
import { ClientesController } from '../controllers/clientesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones
const clienteValidation = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido').notEmpty().withMessage('El apellido es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido'),
  body('direccion').notEmpty().withMessage('La dirección es requerida'),
  body('ciudad').notEmpty().withMessage('La ciudad es requerida'),
  body('codigo_postal').notEmpty().withMessage('El código postal es requerido')
];

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

// Obtener todos los clientes con paginación
router.get('/', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.getAll(req, res);
});

// Obtener cliente por ID
router.get('/:id', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.getById(req, res);
});

// Crear nuevo cliente
router.post('/', authorizeRoles('admin', 'empleado'), clienteValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.create(req, res);
});

// Actualizar cliente
router.put('/:id', authorizeRoles('admin', 'empleado'), clienteValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.update(req, res);
});

// Eliminar cliente (soft delete)
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.delete(req, res);
});

// Restaurar cliente (soft-deleted)
router.patch('/:id/restore', authorizeRoles('admin'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.restore(req, res);
});

// Buscar clientes
router.get('/search/:term', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const clientesController = new ClientesController(db);
  await clientesController.search(req, res);
});

export default router;