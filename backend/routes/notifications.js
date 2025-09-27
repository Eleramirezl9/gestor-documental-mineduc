const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const auditService = require('../services/auditService');
const { notificationCache, statsCache } = require('../middleware/cache');

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
 *           enum: [info, success, warning, error, document, user, system]
 *           description: Tipo de notificación
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Prioridad de la notificación
 *         is_read:
 *           type: boolean
 *           description: Si la notificación ha sido leída
 *         data:
 *           type: object
 *           description: Datos adicionales de la notificación
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         read_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de lectura
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Obtener notificaciones del usuario
 *     description: Obtiene las notificaciones del usuario autenticado con paginación
 *     tags: [Notifications]
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
 *           default: 20
 *         description: Número de notificaciones por página
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Solo notificaciones no leídas
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, document, user, system]
 *         description: Filtrar por tipo de notificación
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas exitosamente
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
 *                     unreadCount: { type: integer }
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('unread_only').optional().isBoolean().toBoolean(),
  query('type').optional().isIn(['info', 'success', 'warning', 'error', 'document', 'user', 'system'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      page = 1, 
      limit = 20, 
      unread_only = false, 
      type 
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    // Aplicar filtros
    if (unread_only) {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Paginación y ordenamiento
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Obtener conteo de no leídas
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      notifications: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        unreadCount: unreadCount || 0
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
 *     description: Obtiene el número de notificaciones no leídas del usuario
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
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones no leídas
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/unread-count', verifyToken, notificationCache, async (req, res) => {
  try {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({ count: count || 0 });

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
 *         description: Notificación marcada como leída
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notificación no encontrada
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la notificación existe y pertenece al usuario
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
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
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
 *     description: Marca todas las notificaciones del usuario como leídas
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
 *                 count:
 *                   type: integer
 *                   description: Número de notificaciones marcadas
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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
 *     description: Elimina una notificación específica
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
 *         description: Notificación eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Notificación no encontrada
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la notificación existe y pertenece al usuario
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
 * /api/notifications:
 *   post:
 *     summary: Crear nueva notificación
 *     description: Crear una nueva notificación para uno o múltiples usuarios
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título de la notificación
 *               message:
 *                 type: string
 *                 description: Contenido de la notificación
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, document, user, system]
 *                 description: Tipo de notificación
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: Prioridad de la notificación
 *               target_users:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de usuarios destinatarios (opcional)
 *               requires_approval:
 *                 type: boolean
 *                 default: false
 *                 description: Si requiere aprobación antes de enviarse
 *               send_email:
 *                 type: boolean
 *                 default: false
 *                 description: Si debe enviarse por email
 *               data:
 *                 type: object
 *                 description: Datos adicionales
 *     responses:
 *       201:
 *         description: Notificación creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('message').notEmpty().withMessage('El mensaje es requerido'),
  body('type').isIn(['info', 'success', 'warning', 'error', 'document', 'user', 'system']).withMessage('Tipo de notificación inválido'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('target_users').optional().isArray().withMessage('target_users debe ser un array'),
  body('requires_approval').optional().isBoolean().withMessage('requires_approval debe ser booleano'),
  body('send_email').optional().isBoolean().withMessage('send_email debe ser booleano')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      message,
      type,
      priority = 'medium',
      target_users,
      requires_approval = false,
      send_email = false,
      data = {}
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Determinar usuarios destinatarios
    let recipients = target_users || [userId];

    // Si no es admin y quiere enviar a otros usuarios, requerir aprobación
    const needsApproval = requires_approval || (userRole !== 'admin' && target_users && target_users.length > 1);
    const status = needsApproval ? 'pending_approval' : 'active';

    // Si requiere aprobación, solo crear una notificación pendiente
    if (needsApproval) {
      const { data: pendingNotification, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId, // Temporal, será reemplazado cuando se apruebe
          title,
          message,
          type,
          priority,
          status: 'pending_approval',
          created_by: userId,
          data: {
            ...data,
            target_users: recipients,
            send_email,
            pending_approval: true
          }
        }])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        message: 'Notificación enviada para aprobación',
        notification: pendingNotification,
        requires_approval: true
      });
    }

    // Crear notificaciones para todos los destinatarios
    const notificationsToCreate = recipients.map(recipient_id => ({
      user_id: recipient_id,
      title,
      message,
      type,
      priority,
      status: 'active',
      created_by: userId,
      data: {
        ...data,
        send_email
      }
    }));

    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // TODO: Enviar por email si se solicita
    if (send_email && (priority === 'high' || priority === 'urgent')) {
      console.log('📧 Enviando notificaciones por email...');
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: userId,
      action: 'create_notification',
      resource_type: 'notification',
      resource_id: createdNotifications[0]?.id,
      details: {
        title,
        type,
        priority,
        recipients_count: recipients.length
      }
    });

    res.status(201).json({
      message: `Notificación enviada a ${recipients.length} usuario(s)`,
      notifications: createdNotifications,
      requires_approval: false
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/pending-approval:
 *   get:
 *     summary: Obtener notificaciones pendientes de aprobación (solo admins)
 *     description: Lista todas las notificaciones que requieren aprobación
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones pendientes
 *       403:
 *         description: Acceso denegado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/pending-approval', verifyToken, async (req, res) => {
  try {
    // Solo administradores pueden ver notificaciones pendientes
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        creator:users!created_by (
          id,
          email,
          name
        )
      `)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      notifications: pendingNotifications || [],
      count: pendingNotifications?.length || 0
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/approve:
 *   put:
 *     summary: Aprobar notificación pendiente (solo admins)
 *     description: Aprueba y envía una notificación pendiente
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
 *         description: ID de la notificación pendiente
 *     responses:
 *       200:
 *         description: Notificación aprobada y enviada
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Notificación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/approve', verifyToken, async (req, res) => {
  try {
    // Solo administradores pueden aprobar notificaciones
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { id } = req.params;

    // Obtener la notificación pendiente
    const { data: pendingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending_approval')
      .single();

    if (fetchError || !pendingNotification) {
      return res.status(404).json({ error: 'Notificación pendiente no encontrada' });
    }

    const targetUsers = pendingNotification.data?.target_users || [pendingNotification.user_id];

    // Crear notificaciones para todos los usuarios destinatarios
    const notificationsToCreate = targetUsers.map(user_id => ({
      user_id,
      title: pendingNotification.title,
      message: pendingNotification.message,
      type: pendingNotification.type,
      priority: pendingNotification.priority,
      status: 'active',
      created_by: pendingNotification.created_by,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      data: {
        ...pendingNotification.data,
        original_pending_id: id
      }
    }));

    const { data: createdNotifications, error: createError } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    // Eliminar la notificación pendiente
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'approve_notification',
      resource_type: 'notification',
      resource_id: id,
      details: {
        original_title: pendingNotification.title,
        recipients_count: targetUsers.length,
        creator_id: pendingNotification.created_by
      }
    });

    res.json({
      message: `Notificación aprobada y enviada a ${targetUsers.length} usuario(s)`,
      notifications: createdNotifications
    });

  } catch (error) {
    console.error('Error aprobando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/reject:
 *   put:
 *     summary: Rechazar notificación pendiente (solo admins)
 *     description: Rechaza una notificación pendiente de aprobación
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
 *         description: ID de la notificación pendiente
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón del rechazo
 *     responses:
 *       200:
 *         description: Notificación rechazada
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Notificación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/reject', verifyToken, [
  body('reason').optional().isString().withMessage('La razón debe ser un texto')
], async (req, res) => {
  try {
    // Solo administradores pueden rechazar notificaciones
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Actualizar el estado a rechazado
    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'rejected',
        rejected_by: req.user.id,
        rejected_at: new Date().toISOString(),
        data: {
          rejection_reason: reason
        }
      })
      .eq('id', id)
      .eq('status', 'pending_approval')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notificación pendiente no encontrada' });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'reject_notification',
      resource_type: 'notification',
      resource_id: id,
      details: {
        reason,
        original_title: data.title,
        creator_id: data.created_by
      }
    });

    res.json({
      message: 'Notificación rechazada',
      reason
    });

  } catch (error) {
    console.error('Error rechazando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     summary: Obtener estadísticas de notificaciones
 *     description: Obtiene estadísticas detalladas de las notificaciones del usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener estadísticas básicas en paralelo
    const [
      totalResult,
      unreadResult,
      todayResult,
      urgentResult,
      typeStatsResult
    ] = await Promise.all([
      // Total de notificaciones activas
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'),
      
      // No leídas
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('status', 'active'),
      
      // De hoy
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .eq('status', 'active'),
      
      // Urgentes no leídas
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('priority', 'urgent')
        .eq('is_read', false)
        .eq('status', 'active'),
      
      // Por tipo y prioridad
      supabase
        .from('notifications')
        .select('type, priority')
        .eq('user_id', userId)
        .eq('status', 'active')
    ]);

    // Procesar estadísticas por tipo y prioridad
    const typeStats = {};
    const priorityStats = { low: 0, medium: 0, high: 0, urgent: 0 };

    if (typeStatsResult.data) {
      typeStatsResult.data.forEach(notif => {
        typeStats[notif.type] = (typeStats[notif.type] || 0) + 1;
        priorityStats[notif.priority] = (priorityStats[notif.priority] || 0) + 1;
      });
    }

    res.json({
      total: totalResult.count || 0,
      unread: unreadResult.count || 0,
      today: todayResult.count || 0,
      urgent_unread: urgentResult.count || 0,
      by_type: typeStats,
      by_priority: priorityStats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notifications/admin/stats:
 *   get:
 *     summary: Obtener estadísticas globales de notificaciones (solo admins)
 *     description: Obtiene estadísticas del sistema completo de notificaciones
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas globales obtenidas exitosamente
 *       403:
 *         description: Acceso denegado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    // Solo administradores
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const [
      totalResult,
      unreadResult,
      pendingResult,
      rejectedResult,
      todayResult
    ] = await Promise.all([
      // Total de notificaciones
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true }),
      
      // No leídas globales
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('status', 'active'),
      
      // Pendientes de aprobación
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      
      // Rechazadas
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected'),
      
      // Creadas hoy
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0])
    ]);

    res.json({
      total: totalResult.count || 0,
      unread_global: unreadResult.count || 0,
      pending_approval: pendingResult.count || 0,
      rejected: rejectedResult.count || 0,
      created_today: todayResult.count || 0,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;