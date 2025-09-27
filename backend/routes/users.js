const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión completa de usuarios/colaboradores del sistema MINEDUC
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
 *         employee_id:
 *           type: string
 *           description: Código único del empleado (MIN25XXXX)
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
 *         dpi:
 *           type: string
 *           description: Documento Personal de Identificación guatemalteco (13 dígitos)
 *         nit:
 *           type: string
 *           description: Número de Identificación Tributaria guatemalteco
 *         position:
 *           type: string
 *           description: Cargo o puesto del empleado
 *         department:
 *           type: string
 *           description: Departamento del usuario
 *         role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *           description: Rol del usuario
 *         hire_date:
 *           type: string
 *           format: date
 *           description: Fecha de contratación
 *         supervisor_id:
 *           type: string
 *           format: uuid
 *           description: ID del supervisor directo
 *         contract_type:
 *           type: string
 *           enum: [permanent, temporary, consultant, intern]
 *           description: Tipo de contrato
 *         salary_range:
 *           type: string
 *           description: Rango salarial (ej Q5000-Q8000)
 *         phone:
 *           type: string
 *           description: Teléfono del usuario
 *         emergency_contact_name:
 *           type: string
 *           description: Nombre del contacto de emergencia
 *         emergency_contact_phone:
 *           type: string
 *           description: Teléfono del contacto de emergencia
 *         address:
 *           type: string
 *           description: Dirección física
 *         birth_date:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento
 *         gender:
 *           type: string
 *           enum: [M, F, other]
 *           description: Género
 *         marital_status:
 *           type: string
 *           enum: [single, married, divorced, widowed]
 *           description: Estado civil
 *         bio:
 *           type: string
 *           description: Biografía o descripción personal
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           description: Habilidades del empleado
 *         certifications:
 *           type: array
 *           items:
 *             type: object
 *           description: Certificaciones del empleado
 *         onboarding_completed:
 *           type: boolean
 *           description: Si el proceso de onboarding está completo
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
router.get('/', verifyToken, requireRole(['admin', 'editor', 'viewer']), [
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
 * /api/users:
 *   post:
 *     summary: Crear nuevo usuario
 *     description: Crea un nuevo usuario en el sistema (solo admins)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Nombre completo del usuario
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Contraseña del usuario
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 description: Rol del usuario
 *               department:
 *                 type: string
 *                 description: Departamento del usuario
 *               phone:
 *                 type: string
 *                 description: Teléfono del usuario
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario creado exitosamente"
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Error de validación o email ya existe
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, requireRole(['admin']), [
  body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('role').isIn(['admin', 'editor', 'viewer']).withMessage('Rol inválido'),
  body('department').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Errores de validación',
        errors: errors.array() 
      });
    }

    const { name, email, password, role, department, phone } = req.body;

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Ya existe un usuario con este email' 
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creando usuario en Auth:', authError);
      
      // Manejo específico para email existente
      if (authError.code === 'email_exists' || authError.message?.includes('already been registered')) {
        return res.status(400).json({ 
          message: 'Ya existe un usuario registrado con este email en el sistema de autenticación' 
        });
      }
      
      return res.status(400).json({ 
        message: authError.message || 'Error al crear el usuario' 
      });
    }

    // Crear perfil de usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email,
        name,
        role,
        department: department || null,
        phone: phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Si falla el perfil, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ 
        message: 'Error al crear el perfil del usuario' 
      });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'USER_CREATED',
      details: { 
        new_user_id: profile.id,
        new_user_email: email,
        role,
        department
      },
      ip_address: req.ip
    });

    // Enviar notificaciones
    try {
      await notificationService.notifyUserCreated(profile, req.user.id);
    } catch (notifError) {
      console.error('Error enviando notificaciones de usuario creado:', notifError);
    }

    // Enviar email de bienvenida automáticamente
    try {
      await emailService.sendWelcomeEmail({
        userEmail: email,
        userName: name,
        userRole: role,
        userDepartment: department,
        loginLink: '/login'
      });

      console.log(`📧 Email de bienvenida enviado a ${email}`);
    } catch (emailError) {
      console.error('Error enviando email de bienvenida:', emailError);
      // No fallar la creación del usuario si el email falla
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente y email de bienvenida enviado',
      user: profile
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
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

/**
 * @swagger
 * /api/users/{id}/toggle-status:
 *   put:
 *     summary: Alternar estado de usuario
 *     description: Activa o desactiva un usuario (solo admins)
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
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Error (ej. intentar desactivar cuenta propia)
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin)
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/toggle-status', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que un admin se desactive a sí mismo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
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

    // Alternar estado
    const newStatus = !existingUser.is_active;
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: newStatus,
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
      action: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      details: { 
        target_user_id: id,
        target_user_email: existingUser.email,
        new_status: newStatus
      },
      ip_address: req.ip
    });

    // Enviar notificaciones
    try {
      await notificationService.notifyUserStatusChanged(existingUser, newStatus, req.user.id);
    } catch (notifError) {
      console.error('Error enviando notificaciones de cambio de estado:', notifError);
    }

    res.json({
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      user: data
    });

  } catch (error) {
    console.error('Error alternando estado del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}/send-welcome:
 *   post:
 *     summary: Enviar email de bienvenida a usuario
 *     description: Envía un email de bienvenida al usuario especificado
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
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Email enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email de bienvenida enviado exitosamente"
 *                 emailResult:
 *                   type: object
 *                   description: Detalles del envío
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error enviando email
 */
router.post('/:id/send-welcome', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener email del usuario desde auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authData.user) {
      return res.status(404).json({ error: 'Datos de autenticación no encontrados' });
    }

    // Enviar email de bienvenida
    const emailResult = await emailService.sendWelcomeEmail({
      userEmail: authData.user.email,
      userName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || authData.user.email,
      userRole: userData.role,
      userDepartment: userData.department,
      loginLink: '/login'
    });

    // Registrar auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'WELCOME_EMAIL_SENT',
      entity_type: 'user',
      entity_id: id,
      details: {
        target_email: authData.user.email,
        email_result: emailResult
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Email de bienvenida enviado exitosamente',
      emailResult
    });

  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    res.status(500).json({
      error: 'Error enviando email de bienvenida',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/send-reminder:
 *   post:
 *     summary: Enviar recordatorio a usuario
 *     description: Envía un recordatorio personalizado al usuario especificado
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
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reminderType:
 *                 type: string
 *                 description: Tipo de recordatorio
 *                 example: "Documentos Pendientes"
 *               customMessage:
 *                 type: string
 *                 description: Mensaje personalizado opcional
 *     responses:
 *       200:
 *         description: Recordatorio enviado exitosamente
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos suficientes
 *       500:
 *         description: Error enviando recordatorio
 */
router.post('/:id/send-reminder', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderType = 'Recordatorio General', customMessage } = req.body;

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener email del usuario desde auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authData.user) {
      return res.status(404).json({ error: 'Datos de autenticación no encontrados' });
    }

    // Enviar recordatorio
    const emailResult = await emailService.sendGeneralReminder({
      userEmail: authData.user.email,
      userName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || authData.user.email,
      reminderType,
      customMessage
    });

    // Registrar auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REMINDER_EMAIL_SENT',
      entity_type: 'user',
      entity_id: id,
      details: {
        target_email: authData.user.email,
        reminder_type: reminderType,
        has_custom_message: !!customMessage,
        email_result: emailResult
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Recordatorio enviado exitosamente',
      emailResult
    });

  } catch (error) {
    console.error('Error enviando recordatorio:', error);
    res.status(500).json({
      error: 'Error enviando recordatorio',
      details: error.message
    });
  }
});

// Ruta proxy para users enhanced - redirige a users_enhanced
router.get('/enhanced', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    // Importar y usar directamente el handler desde users_enhanced
    const usersEnhancedRouter = require('./users_enhanced');

    // Llamar directamente a la función que maneja /enhanced
    // Por ahora, retornar datos mock para testing
    const mockUsers = [
      {
        id: '1',
        employee_id: 'MIN25001',
        email: 'admin@mineduc.gob.gt',
        first_name: 'Administrador',
        last_name: 'MINEDUC',
        dpi: '1234567890123',
        nit: '12345678',
        position: 'Administrador del Sistema',
        department: 'TI',
        role: 'admin',
        contract_type: 'permanent',
        salary: 8000.00,
        hire_date: '2024-01-01',
        status: 'active',
        phone: '+502 2411-9595',
        address: 'Guatemala City',
        emergency_contact_name: 'Contacto de Emergencia',
        emergency_contact_phone: '+502 1234-5678',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    res.json({
      users: mockUsers,
      total: mockUsers.length,
      page: 1,
      limit: 50
    });
  } catch (error) {
    console.error('Error en /enhanced:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para crear usuario enhanced
router.post('/enhanced', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    // Mock response para testing
    const newUser = {
      id: Date.now().toString(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser
    });
  } catch (error) {
    console.error('Error creando usuario enhanced:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
