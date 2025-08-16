const express = require('express');
const { body, validationResult, query } = require('express-validator');
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
router.get('/unread-count', verifyToken, async (req, res) => {
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

module.exports = router;