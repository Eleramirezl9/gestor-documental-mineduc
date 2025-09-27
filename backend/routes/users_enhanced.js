const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users Enhanced
 *   description: Sistema completo de gestión de usuarios/colaboradores MINEDUC Guatemala
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EnhancedUserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         employee_id:
 *           type: string
 *           description: Código único del empleado (MIN25XXXX)
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         dpi:
 *           type: string
 *           description: DPI guatemalteco (13 dígitos)
 *         nit:
 *           type: string
 *           description: NIT guatemalteco
 *         position:
 *           type: string
 *           description: Cargo o puesto
 *         department:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *         hire_date:
 *           type: string
 *           format: date
 *         supervisor_id:
 *           type: string
 *           format: uuid
 *         contract_type:
 *           type: string
 *           enum: [permanent, temporary, consultant, intern]
 *         salary_range:
 *           type: string
 *         phone:
 *           type: string
 *         emergency_contact_name:
 *           type: string
 *         emergency_contact_phone:
 *           type: string
 *         address:
 *           type: string
 *         birth_date:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [M, F, other]
 *         marital_status:
 *           type: string
 *           enum: [single, married, divorced, widowed]
 *         bio:
 *           type: string
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         certifications:
 *           type: array
 *         onboarding_completed:
 *           type: boolean
 *         is_active:
 *           type: boolean
 */

// Validaciones para campos guatemaltecos
const validateDPI = (value) => {
  if (!value) return true; // Opcional
  return /^[0-9]{13}$/.test(value);
};

const validateNIT = (value) => {
  if (!value) return true; // Opcional
  return /^[0-9]{8,12}(-[0-9])?$/.test(value);
};

/**
 * @swagger
 * /api/users/enhanced:
 *   get:
 *     summary: Obtener usuarios con campos completos
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre, email, employee_id, DPI
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, editor, viewer]
 *       - in: query
 *         name: contract_type
 *         schema:
 *           type: string
 *           enum: [permanent, temporary, consultant, intern]
 *       - in: query
 *         name: supervisor_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Lista de usuarios con información completa
 */
router.get('/enhanced', verifyToken, requireRole(['admin', 'editor']), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('department').optional().trim(),
  query('role').optional().isIn(['admin', 'editor', 'viewer']),
  query('contract_type').optional().isIn(['permanent', 'temporary', 'consultant', 'intern']),
  query('supervisor_id').optional().isUUID(),
  query('include_inactive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, department, role, contract_type, supervisor_id, include_inactive } = req.query;

    // Query con joins para supervisor
    let query = supabaseAdmin
      .from('user_profiles')
      .select(`
        *,
        supervisor:supervisor_id(
          id,
          first_name,
          last_name,
          position,
          employee_id
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtros
    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`
        first_name.ilike.%${search}%,
        last_name.ilike.%${search}%,
        email.ilike.%${search}%,
        employee_id.ilike.%${search}%,
        dpi.ilike.%${search}%,
        position.ilike.%${search}%
      `);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (contract_type) {
      query = query.eq('contract_type', contract_type);
    }

    if (supervisor_id) {
      query = query.eq('supervisor_id', supervisor_id);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error obteniendo usuarios:', error);
      return res.status(400).json({ error: error.message });
    }

    // Enriquecer datos con estadísticas
    const enrichedUsers = await Promise.all(data.map(async (user) => {
      // Contar subordinados si es supervisor
      const { count: subordinatesCount } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_id', user.id);

      return {
        ...user,
        subordinates_count: subordinatesCount || 0,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        is_supervisor: subordinatesCount > 0
      };
    }));

    res.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error en GET /enhanced:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/enhanced/{id}:
 *   get:
 *     summary: Obtener usuario específico con información completa
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/enhanced/:id', verifyToken, requireRole(['admin', 'editor']), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Obtener usuario con relaciones
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        *,
        supervisor:supervisor_id(
          id,
          first_name,
          last_name,
          position,
          employee_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    // Obtener subordinados
    const { data: subordinates, error: subError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, position, employee_id, email')
      .eq('supervisor_id', id)
      .eq('is_active', true);

    if (subError) {
      console.warn('Error obteniendo subordinados:', subError);
    }

    // Obtener estadísticas de documentos del usuario
    const { count: documentsCount } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', id);

    const enrichedUser = {
      ...user,
      subordinates: subordinates || [],
      subordinates_count: subordinates?.length || 0,
      documents_count: documentsCount || 0,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      is_supervisor: (subordinates?.length || 0) > 0
    };

    res.json({ user: enrichedUser });

  } catch (error) {
    console.error('Error en GET /enhanced/:id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/enhanced:
 *   post:
 *     summary: Crear usuario con información completa
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               dpi:
 *                 type: string
 *               nit:
 *                 type: string
 *               position:
 *                 type: string
 *               department:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *               hire_date:
 *                 type: string
 *                 format: date
 *               supervisor_id:
 *                 type: string
 *                 format: uuid
 *               contract_type:
 *                 type: string
 *                 enum: [permanent, temporary, consultant, intern]
 *               salary_range:
 *                 type: string
 *               phone:
 *                 type: string
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_phone:
 *                 type: string
 *               address:
 *                 type: string
 *               birth_date:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [M, F, other]
 *               marital_status:
 *                 type: string
 *                 enum: [single, married, divorced, widowed]
 *               bio:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/enhanced', verifyToken, requireRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('first_name').trim().isLength({ min: 2, max: 100 }),
  body('last_name').trim().isLength({ min: 2, max: 100 }),
  body('role').isIn(['admin', 'editor', 'viewer']),
  body('dpi').optional().custom(validateDPI).withMessage('DPI debe tener 13 dígitos'),
  body('nit').optional().custom(validateNIT).withMessage('Formato de NIT inválido'),
  body('position').optional().trim().isLength({ max: 150 }),
  body('department').optional().trim().isLength({ max: 100 }),
  body('hire_date').optional().isISO8601().toDate(),
  body('supervisor_id').optional().isUUID(),
  body('contract_type').optional().isIn(['permanent', 'temporary', 'consultant', 'intern']),
  body('salary_range').optional().trim().isLength({ max: 50 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('emergency_contact_name').optional().trim().isLength({ max: 200 }),
  body('emergency_contact_phone').optional().trim().isLength({ max: 20 }),
  body('birth_date').optional().isISO8601().toDate(),
  body('gender').optional().isIn(['M', 'F', 'other']),
  body('marital_status').optional().isIn(['single', 'married', 'divorced', 'widowed']),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('skills').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userData = req.body;

    // Verificar que el email no exista
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Verificar DPI único si se proporciona
    if (userData.dpi) {
      const { data: existingDPI } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('dpi', userData.dpi)
        .single();

      if (existingDPI) {
        return res.status(400).json({ error: 'El DPI ya está registrado' });
      }
    }

    // Crear usuario en auth.users primero (sin password, será invitado)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      email_confirm: false // Will be confirmed via invitation
    });

    if (authError) {
      return res.status(400).json({ error: 'Error creando usuario en auth: ' + authError.message });
    }

    // Crear perfil completo
    const profileData = {
      id: authUser.user.id,
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) {
      // Rollback: eliminar usuario de auth si falla el perfil
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ error: 'Error creando perfil: ' + profileError.message });
    }

    // Registrar en auditoría
    if (auditService.logAction) {
      await auditService.logAction(
        req.user.id,
        'user_created',
        'user_profiles',
        profile.id,
        { email: userData.email, role: userData.role }
      );
    }

    // Crear notificación de bienvenida
    if (notificationService.createNotification) {
      await notificationService.createNotification({
        user_id: profile.id,
        title: 'Bienvenido al Sistema MINEDUC',
        message: `Tu cuenta ha sido creada exitosamente. Tu código de empleado es: ${profile.employee_id}`,
        type: 'success'
      });
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: profile
    });

  } catch (error) {
    console.error('Error en POST /enhanced:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/enhanced/{id}:
 *   put:
 *     summary: Actualizar usuario con información completa
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 */
router.put('/enhanced/:id', verifyToken, requireRole(['admin']), [
  param('id').isUUID(),
  body('email').optional().isEmail().normalizeEmail(),
  body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['admin', 'editor', 'viewer']),
  body('dpi').optional().custom(validateDPI).withMessage('DPI debe tener 13 dígitos'),
  body('nit').optional().custom(validateNIT).withMessage('Formato de NIT inválido'),
  body('supervisor_id').optional({ nullable: true }).isUUID(),
  body('contract_type').optional().isIn(['permanent', 'temporary', 'consultant', 'intern']),
  body('gender').optional().isIn(['M', 'F', 'other']),
  body('marital_status').optional().isIn(['single', 'married', 'divorced', 'widowed']),
  body('is_active').optional().isBoolean(),
  body('onboarding_completed').optional().isBoolean(),
  body('skills').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Verificar que el usuario existe
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar unicidad de email y DPI si se están actualizando
    if (updateData.email && updateData.email !== existingUser.email) {
      const { data: emailExists } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', id)
        .single();

      if (emailExists) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
    }

    if (updateData.dpi && updateData.dpi !== existingUser.dpi) {
      const { data: dpiExists } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('dpi', updateData.dpi)
        .neq('id', id)
        .single();

      if (dpiExists) {
        return res.status(400).json({ error: 'El DPI ya está registrado' });
      }
    }

    // Actualizar perfil
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: 'Error actualizando usuario: ' + updateError.message });
    }

    // Registrar en auditoría
    if (auditService.logAction) {
      await auditService.logAction(
        req.user.id,
        'user_updated',
        'user_profiles',
        id,
        { changes: updateData }
      );
    }

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error en PUT /enhanced/:id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/organizational-structure:
 *   get:
 *     summary: Obtener estructura organizacional
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estructura organizacional obtenida exitosamente
 */
router.get('/organizational-structure', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizational_structure')
      .select('*')
      .order('department', { ascending: true })
      .order('position', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Organizar en estructura jerárquica
    const departments = {};
    const supervisors = {};

    data.forEach(user => {
      // Agrupar por departamento
      if (!departments[user.department]) {
        departments[user.department] = [];
      }
      departments[user.department].push(user);

      // Mapear supervisores
      if (user.supervisor_employee_id) {
        if (!supervisors[user.supervisor_employee_id]) {
          supervisors[user.supervisor_employee_id] = [];
        }
        supervisors[user.supervisor_employee_id].push(user);
      }
    });

    res.json({
      departments,
      supervisors,
      totalEmployees: data.length
    });

  } catch (error) {
    console.error('Error en organizational-structure:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/enhanced/stats:
 *   get:
 *     summary: Estadísticas avanzadas de usuarios
 *     tags: [Users Enhanced]
 *     security:
 *       - bearerAuth: []
 */
router.get('/enhanced/stats', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: allUsers, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total: allUsers.length,
      byRole: {},
      byDepartment: {},
      byContractType: {},
      byStatus: {
        active: 0,
        inactive: 0
      },
      onboardingStats: {
        completed: 0,
        pending: 0
      },
      supervisorCount: 0,
      averageAge: 0,
      genderDistribution: {}
    };

    let totalAge = 0;
    let usersWithAge = 0;

    allUsers.forEach(user => {
      // Por rol
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;

      // Por departamento
      if (user.department) {
        stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
      }

      // Por tipo de contrato
      if (user.contract_type) {
        stats.byContractType[user.contract_type] = (stats.byContractType[user.contract_type] || 0) + 1;
      }

      // Por estado
      if (user.is_active) {
        stats.byStatus.active++;
      } else {
        stats.byStatus.inactive++;
      }

      // Onboarding
      if (user.onboarding_completed) {
        stats.onboardingStats.completed++;
      } else {
        stats.onboardingStats.pending++;
      }

      // Supervisores (tendrá subordinados)
      if (user.supervisor_id === null || user.supervisor_id === undefined) {
        stats.supervisorCount++;
      }

      // Edad promedio
      if (user.birth_date) {
        const age = new Date().getFullYear() - new Date(user.birth_date).getFullYear();
        totalAge += age;
        usersWithAge++;
      }

      // Distribución por género
      if (user.gender) {
        stats.genderDistribution[user.gender] = (stats.genderDistribution[user.gender] || 0) + 1;
      }
    });

    if (usersWithAge > 0) {
      stats.averageAge = Math.round(totalAge / usersWithAge);
    }

    res.json(stats);

  } catch (error) {
    console.error('Error en /enhanced/stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;