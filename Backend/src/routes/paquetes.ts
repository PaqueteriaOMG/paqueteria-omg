import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { models as defaultModels } from '../db/sequelize';
import { PaquetesController } from '../controllers/paquetesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Endpoint público de rastreo
/**
 * @swagger
 * /api/paquetes/public/track/{code}:
 *   get:
 *     summary: Rastrear paquete públicamente por código
 *     tags: [Paquetes]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de rastreo público del paquete
 *     responses:
 *       200:
 *         description: Información del paquete obtenida correctamente
 *       404:
 *         description: Paquete no encontrado
 */
router.get('/public/track/:code', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getByPublicCode(req, res);
});

// Aplicar autenticación a todas las rutas restantes
router.use(authenticateToken);

// Validaciones
const paqueteValidation = [
  body('cliente_id').isInt({ min: 1 }).withMessage('El ID del cliente es requerido y debe ser válido'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('peso').isFloat({ min: 0.1 }).withMessage('El peso debe ser mayor a 0'),
  body('dimensiones').notEmpty().withMessage('Las dimensiones son requeridas'),
  body('valor_declarado').isFloat({ min: 0 }).withMessage('El valor declarado debe ser mayor o igual a 0'),
  body('direccion_origen').notEmpty().withMessage('La dirección de origen es requerida'),
  body('direccion_destino').notEmpty().withMessage('La dirección de destino es requerida'),
  body('fragil').isBoolean().withMessage('El campo frágil debe ser un booleano')
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
/**
 * @swagger
 * /api/paquetes:
 *   get:
 *     summary: Obtener lista de paquetes paginada
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de elementos por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [numero_seguimiento, descripcion, peso, fecha_creacion, estado]
 *           default: numero_seguimiento
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de paquetes obtenida correctamente
 *       400:
 *         description: Parámetros de paginación inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/', paginationValidation, async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getAll(req, res);
});

// Obtener paquete por ID
/**
 * @swagger
 * /api/paquetes/{id}:
 *   get:
 *     summary: Obtener paquete por ID
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     responses:
 *       200:
 *         description: Paquete obtenido correctamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Paquete no encontrado
 */
router.get('/:id', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getById(req, res);
});

// Buscar paquete por número de seguimiento
/**
 * @swagger
 * /api/paquetes/tracking/{numero}:
 *   get:
 *     summary: Buscar paquete por número de seguimiento
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numero
 *         required: true
 *         schema:
 *           type: string
 *         description: Número de seguimiento del paquete
 *     responses:
 *       200:
 *         description: Paquete encontrado correctamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Paquete no encontrado
 */
router.get('/tracking/:numero', async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getByTracking(req, res);
});

// Crear nuevo paquete
/**
 * @swagger
 * /api/paquetes:
 *   post:
 *     summary: Crear nuevo paquete
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cliente_id
 *               - descripcion
 *               - peso
 *               - dimensiones
 *               - valor_declarado
 *               - direccion_origen
 *               - direccion_destino
 *               - fragil
 *             properties:
 *               cliente_id:
 *                 type: integer
 *                 minimum: 1
 *                 description: ID del cliente que envía el paquete
 *               descripcion:
 *                 type: string
 *               peso:
 *                 type: number
 *                 minimum: 0.1
 *               dimensiones:
 *                 type: string
 *               valor_declarado:
 *                 type: number
 *                 minimum: 0
 *               direccion_origen:
 *                 type: string
 *               direccion_destino:
 *                 type: string
 *               fragil:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Paquete creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authorizeRoles('admin', 'empleado'), paqueteValidation, validateAndPassToController, async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.create(req, res);
});

// Creación masiva de paquetes
/**
 * @swagger
 * /api/paquetes/bulk:
 *   post:
 *     summary: Crear múltiples paquetes
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - cliente_id
 *                     - descripcion
 *                     - peso
 *                     - dimensiones
 *                     - valor_declarado
 *                     - direccion_origen
 *                     - direccion_destino
 *                   properties:
 *                     cliente_id:
 *                       type: integer
 *                       minimum: 1
 *                     descripcion:
 *                       type: string
 *                     peso:
 *                       type: number
 *                       minimum: 0.1
 *                     dimensiones:
 *                       type: string
 *                     valor_declarado:
 *                       type: number
 *                       minimum: 0
 *                     direccion_origen:
 *                       type: string
 *                     direccion_destino:
 *                       type: string
 *     responses:
 *       201:
 *         description: Paquetes creados correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
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
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.bulkCreate(req, res);
});

// Obtener etiqueta SVG del paquete
/**
 * @swagger
 * /api/paquetes/{id}/etiqueta:
 *   get:
 *     summary: Obtener etiqueta SVG del paquete
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     responses:
 *       200:
 *         description: Etiqueta SVG obtenida correctamente
 *         content:
 *           image/svg+xml:
 *             schema:
 *               type: string
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete no encontrado
 */
router.get('/:id/etiqueta', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getLabel(req, res);
});

// Historial del paquete
/**
 * @swagger
 * /api/paquetes/{id}/historial:
 *   get:
 *     summary: Obtener historial del paquete
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     responses:
 *       200:
 *         description: Historial obtenido correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete no encontrado
 */
router.get('/:id/historial', authorizeRoles('admin', 'empleado'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.getHistory(req, res);
});

// Actualizar paquete
/**
 * @swagger
 * /api/paquetes/{id}:
 *   put:
 *     summary: Actualizar paquete
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - descripcion
 *               - peso
 *               - dimensiones
 *               - valor_declarado
 *               - fragil
 *             properties:
 *               descripcion:
 *                 type: string
 *               peso:
 *                 type: number
 *                 minimum: 0.1
 *               dimensiones:
 *                 type: string
 *               valor_declarado:
 *                 type: number
 *                 minimum: 0
 *               fragil:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Paquete actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete no encontrado
 */
// Validaciones para actualización
const updatePaqueteValidation = [
  body('descripcion').optional().notEmpty().withMessage('La descripción no puede estar vacía'),
  body('peso').optional().isFloat({ min: 0.1 }).withMessage('El peso debe ser mayor a 0.1'),
  body('dimensiones').optional().notEmpty().withMessage('Las dimensiones no pueden estar vacías'),
  body('valor_declarado').optional().isFloat({ min: 0 }).withMessage('El valor declarado debe ser mayor o igual a 0'),
  body('direccion_origen').optional().notEmpty().withMessage('La dirección de origen no puede estar vacía'),
  body('direccion_destino').optional().notEmpty().withMessage('La dirección de destino no puede estar vacía')
];

router.put('/:id', authorizeRoles('admin', 'empleado'), updatePaqueteValidation, validateAndPassToController, async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.update(req, res);
});

// Actualizar estado del paquete
/**
 * @swagger
 * /api/paquetes/{id}/estado:
 *   patch:
 *     summary: Actualizar estado del paquete
 *     description: |
 *       Actualiza el estado de un paquete siguiendo las transiciones permitidas:
 *       
 *       Transiciones permitidas:
 *       - De "pendiente" → "en_transito"
 *       - De "en_transito" → "entregado" o "devuelto"
 *       - De "devuelto" → "pendiente"
 *       - De "entregado" → ninguna transición permitida
 *       
 *       Diagrama de estados:
 *       ```
 *       pendiente ──→ en_transito ──→ entregado
 *           ↑              │
 *           └──── devuelto ←┘
 *       ```
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
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
 *                 enum: [pendiente, en_transito, entregado, devuelto]
 *                 description: |
 *                   Nuevo estado del paquete. Las transiciones permitidas son:
 *                   - pendiente → en_transito
 *                   - en_transito → entregado, devuelto
 *                   - devuelto → pendiente
 *                   - entregado → (ninguna transición permitida)
 *               comentario:
 *                 type: string
 *                 description: Comentario opcional sobre el cambio de estado
 *     responses:
 *       200:
 *         description: Estado del paquete actualizado correctamente
 *       400:
 *         description: Estado inválido o transición no permitida
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete no encontrado
 *       409:
 *         description: Transición de estado no permitida
 */
router.patch('/:id/estado', authorizeRoles('admin', 'empleado'), [
  body('estado').isIn(['pendiente', 'en_transito', 'entregado', 'devuelto']).withMessage('Estado inválido')
], async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.updateStatus(req, res);
});

// Eliminar paquete
/**
 * @swagger
 * /api/paquetes/{id}:
 *   delete:
 *     summary: Eliminar paquete
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete
 *     responses:
 *       200:
 *         description: Paquete eliminado correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete no encontrado
 */
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.delete(req, res);
});

/**
 * @swagger
 * /api/paquetes/{id}/restore:
 *   post:
 *     summary: Restaurar un paquete eliminado
 *     tags: [Paquetes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paquete a restaurar
 *     responses:
 *       200:
 *         description: Paquete restaurado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     paqu_id:
 *                       type: integer
 *                     paqu_estado:
 *                       type: string
 *                     cliente:
 *                       type: object
 *                     historial:
 *                       type: array
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Paquete eliminado no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/:id/restore', authorizeRoles('admin'), async (req: any, res: any) => {
  const mdl = req.app.locals.models || defaultModels;
  const paquetesController = new PaquetesController(mdl);
  await paquetesController.restore(req, res);
});

export default router;