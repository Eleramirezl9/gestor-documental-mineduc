const express = require('express');
const { query, body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestión de notificaciones del sistema
 * 
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único de la notificación
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID del usuario destinatario
 *         title:
 *           type: string
 *           description: Título de la notificación
 *         message:
 *           type: string
 *           description: Mensaje de la notificación
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: Tipo de notificación
 *         is_read:
 *           type: boolean
 *           description: Si la notificación ha sido leída
 *         action_url:
 *           type: string
 *           description: URL de acción opcional
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *     
 *     NotificationCreate:
 *       type: object
 *       required:
 *         - userId
 *         - title
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID del usuario destinatario
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           description: Título de la notificación
 *         message:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Mensaje de la notificación
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           default: info
 *           description: Tipo de notificación
 *         actionUrl:
 *           type: string
 *           format: uri
 *           description: URL de acción opcional
 *     
 *     NotificationBroadcast:
 *       type: object
 *       required:
 *         - userIds
 *         - title
 *         - message
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           minItems: 1
 *           description: Lista de IDs de usuarios destinatarios
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           description: Título de la notificación
 *         message:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Mensaje de la notificación
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           default: info
 *           description: Tipo de notificación
 *         actionUrl:
 *           type: string
 *           format: uri
 *           description: URL de acción opcional
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Obtener notificaciones del usuario
 *     description: Obtiene una lista paginada de notificaciones del usuario actual
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de notificaciones por página
 *       - in: query
 *         name: unreadOnly
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Solo notificaciones no leídas
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [info, warning, error, success]
 *         description: Filtrar por tipo de notificación
 *     responses:
 *       200:
 *         description: Lista de notificaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       400:
 *         description: Error de validación
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('unreadOnly').optional().isBoolean(),
  query('type').optional().isIn(['info', 'warning', 'error', 'success'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { unreadOnly, type } = req.query;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      notifications: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Obtener conteo de notificaciones no leídas
 *     description: Obtiene el número total de notificaciones no leídas del usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   description: Número de notificaciones no leídas
 *       400:
 *         description: Error al obtener el conteo
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ unreadCount: count || 0 });

  } catch (error) {
    console.error('Error obteniendo conteo de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marcar notificación como leída
 *     description: Marca una notificación específica como leída
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notificación marcada como leída"
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notificación no encontrada
 *       400:
 *         description: Error al marcar como leída
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la notificación pertenece al usuario
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Marcar como leída
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Notificación marcada como leída',
      notification: data
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marcar todas las notificaciones como leídas
 *     description: Marca todas las notificaciones no leídas del usuario como leídas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Todas las notificaciones marcadas como leídas"
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones marcadas
 *       400:
 *         description: Error al marcar notificaciones
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'NOTIFICATIONS_MARKED_ALL_READ',
      details: { count: data.length },
      ip_address: req.ip
    });

    res.json({
      message: 'Todas las notificaciones marcadas como leídas',
      count: data.length
    });

  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Eliminar notificación
 *     description: Elimina una notificación específica del usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la notificación a eliminar
 *     responses:
 *       200:
 *         description: Notificación eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notificación eliminada exitosamente"
 *       404:
 *         description: Notificación no encontrada
 *       400:
 *         description: Error al eliminar notificación
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la notificación pertenece al usuario
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Eliminar notificación
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Notificación eliminada exitosamente' });

  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   delete:
 *     summary: Eliminar todas las notificaciones leídas
 *     description: Elimina todas las notificaciones leídas del usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones leídas eliminadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Todas las notificaciones leídas eliminadas"
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones eliminadas
 *       400:
 *         description: Error al eliminar notificaciones
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/read-all', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.id)
      .eq('is_read', true)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'NOTIFICATIONS_DELETED_ALL_READ',
      details: { count: data.length },
      ip_address: req.ip
    });

    res.json({
      message: 'Todas las notificaciones leídas eliminadas',
      count: data.length
    });

  } catch (error) {
    console.error('Error eliminando notificaciones leídas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Crear nueva notificación
 *     description: Crea una nueva notificación para un usuario específico (solo admins)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreate'
 *     responses:
 *       201:
 *         description: Notificación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notificación creada exitosamente"
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Usuario destinatario no encontrado
 *       403:
 *         description: Solo los administradores pueden crear notificaciones
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, [
  body('userId').isUUID().withMessage('ID de usuario inválido'),
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('El título debe tener entre 3 y 255 caracteres'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('El mensaje debe tener entre 10 y 1000 caracteres'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']),
  body('actionUrl').optional().isURL()
], async (req, res) => {
  try {
    // Solo admins pueden crear notificaciones
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden crear notificaciones' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, message, type = 'info', actionUrl } = req.body;

    // Verificar que el usuario destinatario existe
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'Usuario destinatario no encontrado' });
    }

    // Crear notificación
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl || null
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'NOTIFICATION_CREATED',
      entity_type: 'notification',
      entity_id: data.id,
      details: { target_user_id: userId, title, type },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Notificación creada exitosamente',
      notification: data
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     summary: Crear notificación masiva
 *     description: Crea notificaciones para múltiples usuarios simultáneamente (solo admins)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationBroadcast'
 *     responses:
 *       201:
 *         description: Notificaciones enviadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notificaciones enviadas exitosamente"
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones creadas
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Error de validación o algunos usuarios no encontrados
 *       403:
 *         description: Solo los administradores pueden crear notificaciones masivas
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.post('/broadcast', verifyToken, [
  body('userIds').isArray({ min: 1 }).withMessage('Debe especificar al menos un usuario'),
  body('userIds.*').isUUID().withMessage('ID de usuario inválido'),
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('El título debe tener entre 3 y 255 caracteres'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('El mensaje debe tener entre 10 y 1000 caracteres'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']),
  body('actionUrl').optional().isURL()
], async (req, res) => {
  try {
    // Solo admins pueden crear notificaciones masivas
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden crear notificaciones masivas' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userIds, title, message, type = 'info', actionUrl } = req.body;

    // Verificar que todos los usuarios existen
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')
      .in('id', userIds);

    if (usersError) {
      return res.status(400).json({ error: usersError.message });
    }

    if (users.length !== userIds.length) {
      return res.status(400).json({ error: 'Algunos usuarios no fueron encontrados' });
    }

    // Crear notificaciones para todos los usuarios
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl || null
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'NOTIFICATIONS_BROADCAST',
      details: { 
        user_count: userIds.length,
        title,
        type
      },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Notificaciones enviadas exitosamente',
      count: data.length,
      notifications: data
    });

  } catch (error) {
    console.error('Error creando notificaciones masivas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/stats/overview:
 *   get:
 *     summary: Obtener estadísticas de notificaciones
 *     description: Obtiene estadísticas generales sobre notificaciones del sistema (solo admins)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total de notificaciones en el sistema
 *                 byType:
 *                   type: object
 *                   properties:
 *                     info: { type: integer }
 *                     warning: { type: integer }
 *                     error: { type: integer }
 *                     success: { type: integer }
 *                 byStatus:
 *                   type: object
 *                   properties:
 *                     read: { type: integer }
 *                     unread: { type: integer }
 *                 recent:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                   description: Últimas 10 notificaciones creadas
 *       400:
 *         description: Error al obtener estadísticas
 *       403:
 *         description: Solo los administradores pueden ver estadísticas
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden ver estadísticas' });
    }

    // Obtener conteos por tipo
    const { data: typeStats, error: typeError } = await supabase
      .from('notifications')
      .select('type');

    if (typeError) {
      return res.status(400).json({ error: typeError.message });
    }

    const typeCounts = typeStats.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {});

    // Obtener conteos de leídas vs no leídas
    const { data: readStats, error: readError } = await supabase
      .from('notifications')
      .select('is_read');

    if (readError) {
      return res.status(400).json({ error: readError.message });
    }

    const readCounts = readStats.reduce((acc, notification) => {
      const status = notification.is_read ? 'read' : 'unread';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Obtener notificaciones recientes
    const { data: recentNotifications, error: recentError } = await supabase
      .from('notifications')
      .select(`
        *,
        user_profiles(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      return res.status(400).json({ error: recentError.message });
    }

    res.json({
      total: typeStats.length,
      byType: typeCounts,
      byStatus: readCounts,
      recent: recentNotifications
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

