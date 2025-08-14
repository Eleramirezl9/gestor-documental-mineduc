const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios del sistema
 * 
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         first_name:
 *           type: string
 *           description: Nombre del usuario
 *         last_name:
 *           type: string
 *           description: Apellido del usuario
 *         role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *           description: Rol del usuario
 *         department:
 *           type: string
 *           description: Departamento del usuario
 *         position:
 *           type: string
 *           description: Posición del usuario
 *         phone:
 *           type: string
 *           description: Teléfono del usuario
 *         is_active:
 *           type: boolean
 *           description: Si el usuario está activo
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *     
 *     UserUpdate:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           description: Nuevo nombre del usuario
 *         lastName:
 *           type: string
 *           minLength: 2
 *           description: Nuevo apellido del usuario
 *         role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *           description: Nuevo rol del usuario
 *         department:
 *           type: string
 *           description: Nuevo departamento del usuario
 *         isActive:
 *           type: boolean
 *           description: Estado de actividad del usuario
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener lista de usuarios
 *     description: Obtiene una lista paginada de usuarios con filtros opcionales (solo admins)
 *     tags: [Users]
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
 *         description: Número de usuarios por página
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Búsqueda en nombre, apellido y email
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [admin, editor, viewer]
 *         description: Filtrar por rol
 *       - in: query
 *         name: department
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por departamento
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProfile'
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
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, requireRole(['admin']), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('role').optional().isIn(['admin', 'editor', 'viewer']),
  query('department').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, role, department } = req.query;

    let query = require('../config/supabase').supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (department) {
      query = query.eq('department', department);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      users: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/stats/overview:
 *   get:
 *     summary: Obtener estadísticas de usuarios
 *     description: Obtiene estadísticas sobre la distribución de usuarios por rol y estado
 *     tags: [Users]
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
 *                 roleDistribution:
 *                   type: object
 *                   properties:
 *                     admin: { type: integer }
 *                     editor: { type: integer }
 *                     viewer: { type: integer }
 *                 statusDistribution:
 *                   type: object
 *                   properties:
 *                     active: { type: integer }
 *                     inactive: { type: integer }
 *                 totalUsers:
 *                   type: integer
 *       400:
 *         description: Error al obtener estadísticas
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats/overview', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    // Obtener conteos por rol
    const { data: roleStats, error: roleError } = await require('../config/supabase').supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('is_active', true);

    if (roleError) {
      return res.status(400).json({ error: roleError.message });
    }

    // Contar por rol
    const roleCounts = roleStats.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    // Obtener usuarios activos vs inactivos
    const { data: statusStats, error: statusError } = await require('../config/supabase').supabaseAdmin
      .from('user_profiles')
      .select('is_active');

    if (statusError) {
      return res.status(400).json({ error: statusError.message });
    }

    const statusCounts = statusStats.reduce((acc, user) => {
      const status = user.is_active ? 'active' : 'inactive';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      roleDistribution: roleCounts,
      statusDistribution: statusCounts,
      totalUsers: statusStats.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     description: Obtiene la información detallada de un usuario específico
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: data });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     description: Actualiza la información de un usuario existente (solo admins)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario actualizado exitosamente"
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, requireRole(['admin']), [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['admin', 'editor', 'viewer']),
  body('department').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { firstName, lastName, role, department, isActive } = req.body;

    // Verificar que el usuario existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Preparar datos de actualización
    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.is_active = isActive;
    updateData.updated_at = new Date().toISOString();

    // Actualizar usuario
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'USER_UPDATED',
      details: { 
        target_user_id: id,
        changes: updateData,
        previous_data: existingUser
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: data
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Desactivar usuario
 *     description: Desactiva un usuario en lugar de eliminarlo permanentemente (solo admins)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario a desactivar
 *     responses:
 *       200:
 *         description: Usuario desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario desactivado exitosamente"
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Error (ej. intentar eliminar cuenta propia)
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que un admin se elimine a sí mismo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    // Verificar que el usuario existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Desactivar usuario en lugar de eliminar
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'USER_DEACTIVATED',
      details: { 
        target_user_id: id,
        target_user_email: existingUser.email
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Usuario desactivado exitosamente',
      user: data
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
