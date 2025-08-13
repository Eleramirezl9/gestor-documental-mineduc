const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

// Obtener todos los usuarios (solo admin)
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

    let query = supabase
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

// Obtener estadísticas de usuarios
router.get('/stats/overview', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    // Obtener conteos por rol
    const { data: roleStats, error: roleError } = await supabase
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
    const { data: statusStats, error: statusError } = await supabase
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

// Obtener usuario por ID
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

// Actualizar usuario
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

// Eliminar usuario (desactivar)
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
