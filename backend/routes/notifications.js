const express = require('express');
const { query, body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

// Obtener notificaciones del usuario
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

// Obtener conteo de notificaciones no leídas
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

// Marcar notificación como leída
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

// Marcar todas las notificaciones como leídas
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

// Eliminar notificación
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

// Eliminar todas las notificaciones leídas
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

// Crear notificación (solo para admins)
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

// Crear notificación masiva (solo para admins)
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

// Obtener estadísticas de notificaciones (solo para admins)
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

