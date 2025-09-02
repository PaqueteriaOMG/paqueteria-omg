import { Router } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Pool } from 'mysql2/promise';
import { Usuario, ApiResponse, PaginatedResponse, PaginationParams, AuthRequest } from '../types';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { UsuariosController } from '../controllers/usuariosController';

const router = Router();

// Proteger todas las rutas de usuarios por defecto
router.use(authenticateToken);

// Validaciones
const usuarioValidation = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['admin', 'empleado', 'cliente']).withMessage('Rol inválido')
];

const usuarioCreateValidation = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['admin', 'empleado', 'cliente']).withMessage('Rol inválido')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['nombre', 'email', 'rol', 'fecha_creacion']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden inválido')
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

// Obtener todos los usuarios con paginación (solo admins)
router.get('/', authorizeRoles('admin'), paginationValidation, async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.getAll(req, res);
});

// Obtener usuario por ID (admins pueden ver cualquier usuario, otros solo su propio perfil)
router.get('/:id', async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.getById(req, res);
});

// Crear nuevo usuario (solo admins)
router.post('/', authorizeRoles('admin'), usuarioCreateValidation, validateAndPassToController, async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.create(req, res);
});

// Actualizar usuario
router.put('/:id', usuarioValidation, validateAndPassToController, async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.update(req, res);
});

// Cambiar contraseña
router.patch('/:id/password', [
  body('current_password').notEmpty().withMessage('La contraseña actual es requerida'),
  body('new_password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial')
], validateAndPassToController, async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.changePassword(req, res);
});

// Desactivar usuario (soft delete) - solo admins
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.delete(req, res);
});

// Obtener perfil del usuario actual
router.get('/me/profile', async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.getProfile(req, res);
});

// Editar perfil del usuario actual
router.patch('/me/profile', [
  body('nombre').optional().isString().notEmpty().withMessage('Nombre inválido'),
  body('email').optional().isEmail().withMessage('Email inválido')
], validateAndPassToController, async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.updateProfile(req, res);
});

// Restaurar usuario (solo admins)
router.patch('/:id/restore', authorizeRoles('admin'), async (req: any, res: any) => {
  const db: Pool = req.app.locals.db;
  const usuariosController = new UsuariosController(db);
  await usuariosController.restore(req, res);
});

export default router;