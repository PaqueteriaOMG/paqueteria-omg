import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { models as defaultModels } from '../db/sequelize';
import { ClientesController } from '../controllers/clientesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Endpoints para gestión de clientes
 */

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
/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida correctamente
 *       401:
 *         description: No autorizado
 */
router.get('/', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.getAll(req, res);
});

// Obtener cliente por ID
/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Obtener cliente por ID
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente obtenido correctamente
 *       404:
 *         description: Cliente no encontrado
 *       401:
 *         description: No autorizado
 */
router.get('/:id', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.getById(req, res);
});

// Crear nuevo cliente
/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *               - telefono
 *               - direccion
 *               - ciudad
 *               - codigo_postal
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               ciudad:
 *                 type: string
 *               codigo_postal:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authorizeRoles('admin', 'empleado'), clienteValidation, validateAndPassToController, async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.create(req, res);
});

// Actualizar cliente
/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Actualizar un cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClienteUpdateInput'
 *     responses:
 *       200:
 *         description: Cliente actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:id', authorizeRoles('admin', 'empleado'), clienteValidation, validateAndPassToController, async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.update(req, res);
});

// Eliminar cliente (soft delete)
/**
 * @swagger
 * /api/clientes/{id}:
 *   delete:
 *     summary: Eliminar un cliente (soft delete)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente eliminado correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Cliente no encontrado
 */
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.delete(req, res);
});

// Restaurar cliente (soft-deleted)
/**
 * @swagger
 * /api/clientes/{id}/restore:
 *   patch:
 *     summary: Restaurar un cliente eliminado
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente restaurado correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/restore', authorizeRoles('admin'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.restore(req, res);
});

// Buscar clientes
/**
 * @swagger
 * /api/clientes/search/{term}:
 *   get:
 *     summary: Buscar clientes por término
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: term
 *         required: true
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Lista de clientes encontrados
 *       401:
 *         description: No autorizado
 */
router.get('/search/:term', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const clientesController = new ClientesController(mdl);
  await clientesController.search(req, res);
});

export default router;