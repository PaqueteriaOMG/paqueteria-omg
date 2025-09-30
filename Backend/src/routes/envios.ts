import { Router } from 'express';
import { body, validationResult, query, param } from 'express-validator';
import { Pool } from 'mysql2/promise';
import { EnviosController } from '../controllers/enviosController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Envios
 *   description: Endpoints para gestión de envíos
 */

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
/**
 * @swagger
 * /api/envios:
 *   get:
 *     summary: Obtener todos los envíos
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Límite de resultados por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [numero_envio, fecha_envio_estimada, estado]
 *         description: Campo para ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de envíos obtenida correctamente
 *       401:
 *         description: No autorizado
 */
router.get('/', paginationValidation, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getAll(req, res);
});

// Obtener envío por ID
/**
 * @swagger
 * /api/envios/{id}:
 *   get:
 *     summary: Obtener envío por ID
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     responses:
 *       200:
 *         description: Envío obtenido correctamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Envío no encontrado
 */
router.get('/:id', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getById(req, res);
});

// Rastrear envío por número
/**
 * @swagger
 * /api/envios/tracking/{numero}:
 *   get:
 *     summary: Rastrear envío por número
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numero
 *         required: true
 *         schema:
 *           type: string
 *         description: Número de rastreo del envío
 *     responses:
 *       200:
 *         description: Información de rastreo obtenida correctamente
 *       404:
 *         description: Envío no encontrado
 */
router.get('/tracking/:numero', async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.getByTracking(req, res);
});

// Crear nuevo envío
/**
 * @swagger
 * /api/envios:
 *   post:
 *     summary: Crear nuevo envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paquete_id
 *               - direccion_origen
 *               - direccion_destino
 *             properties:
 *               paquete_id:
 *                 type: integer
 *               direccion_origen:
 *                 type: string
 *               direccion_destino:
 *                 type: string
 *               fecha_envio_estimada:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Envío creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authorizeRoles('admin', 'empleado'), envioValidation, validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.create(req, res);
});

// Actualización general del envío
/**
 * @swagger
 * /api/envios/{id}:
 *   put:
 *     summary: Actualizar envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               direccion_origen:
 *                 type: string
 *               direccion_destino:
 *                 type: string
 *               fecha_envio_estimada:
 *                 type: string
 *                 format: date-time
 *               paquete_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Envío actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío no encontrado
 */
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
/**
 * @swagger
 * /api/envios/{id}/estado:
 *   patch:
 *     summary: Actualizar estado del envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en_transito, entregado, devuelto, cancelado]
 *               fecha_entrega_real:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Estado del envío actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío no encontrado
 */
router.patch('/:id/estado', authorizeRoles('admin', 'empleado'), [
  body('estado').isIn(['pendiente', 'en_transito', 'entregado', 'devuelto', 'cancelado']).withMessage('Estado inválido'),
  body('fecha_entrega_real').optional().isISO8601().withMessage('Fecha de entrega real inválida')
], async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.updateStatus(req, res);
});

// Eliminar envío
/**
 * @swagger
 * /api/envios/{id}:
 *   delete:
 *     summary: Eliminar envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     responses:
 *       200:
 *         description: Envío eliminado correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío no encontrado
 */
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.delete(req, res);
});

// Gestión de paquetes asociados al envío
// Listar paquetes del envío
/**
 * @swagger
 * /api/envios/{id}/paquetes:
 *   get:
 *     summary: Listar paquetes del envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     responses:
 *       200:
 *         description: Lista de paquetes obtenida correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío no encontrado
 */
router.get('/:id/paquetes', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.listPackages(req, res);
});

// Agregar paquetes al envío
/**
 * @swagger
 * /api/envios/{id}/paquetes:
 *   post:
 *     summary: Agregar paquetes al envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paquetes
 *             properties:
 *               paquetes:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Paquetes agregados correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío no encontrado
 */
router.post('/:id/paquetes', authorizeRoles('admin', 'empleado'), [
  body('paquetes').isArray({ min: 1 }).withMessage('Debe enviar un arreglo "paquetes" con al menos 1 ID'),
  body('paquetes.*').isInt({ min: 1 }).withMessage('Cada paquete debe ser un ID válido')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.addPackages(req, res);
});

// Remover un paquete del envío
/**
 * @swagger
 * /api/envios/{id}/paquetes/{paqueteId}:
 *   delete:
 *     summary: Remover un paquete del envío
 *     tags: [Envios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del envío
 *       - in: path
 *         name: paqueteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     responses:
 *       200:
 *         description: Paquete removido correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Envío o paquete no encontrado
 */
router.delete('/:id/paquetes/:paqueteId', authorizeRoles('admin', 'empleado'), [
  param('id').isInt({ min: 1 }).withMessage('Envío inválido'),
  param('paqueteId').isInt({ min: 1 }).withMessage('Paquete inválido')
], validateAndPassToController, async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const enviosController = new EnviosController(db);
  await enviosController.removePackage(req, res);
});

export default router;