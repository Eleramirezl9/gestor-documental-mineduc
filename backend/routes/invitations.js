const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');
const crypto = require('crypto');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Invitations
 *   description: Sistema de invitaciones para nuevos colaboradores MINEDUC
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserInvitation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         position:
 *           type: string
 *         department:
 *           type: string
 *         invitation_token:
 *           type: string
 *         invitation_type:
 *           type: string
 *           enum: [employee, contractor, consultant, intern, temporary]
 *         invited_role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, expired, cancelled]
 *         expires_at:
 *           type: string
 *           format: date-time
 *         custom_message:
 *           type: string
 *         required_documents:
 *           type: array
 *           items:
 *             type: string
 *         onboarding_checklist:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/invitations:
 *   get:
 *     summary: Obtener lista de invitaciones
 *     description: Lista todas las invitaciones con filtros y paginación
 *     tags: [Invitations]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, expired, cancelled]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: invitation_type
 *         schema:
 *           type: string
 *           enum: [employee, contractor, consultant, intern, temporary]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por email, nombre o posición
 *     responses:
 *       200:
 *         description: Lista de invitaciones obtenida exitosamente
 */
router.get('/', verifyToken, requireRole(['admin', 'editor']), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'accepted', 'rejected', 'expired', 'cancelled']),
  query('department').optional().trim(),
  query('invitation_type').optional().isIn(['employee', 'contractor', 'consultant', 'intern', 'temporary']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    console.log('📧 Obteniendo invitaciones (modo mock)...');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, department, invitation_type, search } = req.query;

    // Datos mock de invitaciones
    const mockInvitations = [
      {
        id: 'inv-001',
        email: 'nuevo.empleado@mineduc.gob.gt',
        first_name: 'Juan',
        last_name: 'Pérez',
        position: 'Especialista en Educación',
        department: 'Educación Primaria',
        invitation_token: 'token-abc123',
        invitation_type: 'employee',
        invited_role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        custom_message: 'Bienvenido al equipo MINEDUC',
        invited_by: req.user.id,
        invited_by_email: req.user.email,
        created_at: '2024-01-15T08:00:00Z',
        required_documents: ['DPI', 'CV', 'Título Universitario'],
        onboarding_checklist: ['Orientación', 'Capacitación en sistemas', 'Asignación de equipo']
      },
      {
        id: 'inv-002',
        email: 'maria.garcia@mineduc.gob.gt',
        first_name: 'María',
        last_name: 'García',
        position: 'Desarrolladora',
        department: 'Tecnología',
        invitation_token: 'token-def456',
        invitation_type: 'contractor',
        invited_role: 'viewer',
        status: 'accepted',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        custom_message: 'Proyecto de modernización tecnológica',
        invited_by: req.user.id,
        invited_by_email: req.user.email,
        created_at: '2024-01-10T08:00:00Z',
        accepted_at: '2024-01-12T08:00:00Z',
        required_documents: ['DPI', 'CV'],
        onboarding_checklist: ['Revisión de proyecto', 'Acceso a sistemas']
      },
      {
        id: 'inv-003',
        email: 'carlos.lopez@mineduc.gob.gt',
        first_name: 'Carlos',
        last_name: 'López',
        position: 'Consultor Pedagógico',
        department: 'Pedagogía',
        invitation_token: 'token-ghi789',
        invitation_type: 'consultant',
        invited_role: 'editor',
        status: 'expired',
        expires_at: '2024-01-05T08:00:00Z',
        custom_message: 'Consultoría en metodologías educativas',
        invited_by: req.user.id,
        invited_by_email: req.user.email,
        created_at: '2023-12-28T08:00:00Z',
        required_documents: ['DPI', 'CV', 'Certificaciones'],
        onboarding_checklist: ['Reunión inicial', 'Definición de objetivos']
      }
    ];

    let filteredInvitations = mockInvitations;

    // Aplicar filtros
    if (status) {
      filteredInvitations = filteredInvitations.filter(inv => inv.status === status);
    }

    if (department) {
      filteredInvitations = filteredInvitations.filter(inv => inv.department === department);
    }

    if (invitation_type) {
      filteredInvitations = filteredInvitations.filter(inv => inv.invitation_type === invitation_type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredInvitations = filteredInvitations.filter(inv =>
        inv.email.toLowerCase().includes(searchLower) ||
        inv.first_name.toLowerCase().includes(searchLower) ||
        inv.last_name.toLowerCase().includes(searchLower) ||
        inv.position.toLowerCase().includes(searchLower)
      );
    }

    // Solo admins pueden ver todas las invitaciones, editores solo las suyas
    if (req.user.profile.role !== 'admin') {
      filteredInvitations = filteredInvitations.filter(inv => inv.invited_by === req.user.id);
    }

    // Paginación
    const paginatedInvitations = filteredInvitations.slice(offset, offset + limit);
    const totalPages = Math.ceil(filteredInvitations.length / limit);

    console.log(`✅ Devolviendo ${paginatedInvitations.length} invitaciones de ${filteredInvitations.length} total`);

    res.json({
      success: true,
      invitations: paginatedInvitations,
      total: filteredInvitations.length,
      page: page,
      limit: limit,
      totalPages: totalPages,
      pagination: {
        page,
        limit,
        total: filteredInvitations.length,
        totalPages: totalPages
      }
    });

  } catch (error) {
    console.error('Error en GET /invitations:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations:
 *   post:
 *     summary: Crear nueva invitación
 *     description: Crea una invitación para un nuevo colaborador y envía email
 *     tags: [Invitations]
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
 *               - invited_role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               position:
 *                 type: string
 *               department:
 *                 type: string
 *               invited_role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *               invitation_type:
 *                 type: string
 *                 enum: [employee, contractor, consultant, intern, temporary]
 *                 default: employee
 *               expected_hire_date:
 *                 type: string
 *                 format: date
 *               expected_salary_range:
 *                 type: string
 *               contract_type:
 *                 type: string
 *                 enum: [permanent, temporary, consultant, intern]
 *               custom_message:
 *                 type: string
 *               welcome_message:
 *                 type: string
 *               required_documents:
 *                 type: array
 *                 items:
 *                   type: string
 *               onboarding_checklist:
 *                 type: array
 *                 items:
 *                   type: string
 *               expires_in_days:
 *                 type: integer
 *                 default: 7
 *     responses:
 *       201:
 *         description: Invitación creada y enviada exitosamente
 *       400:
 *         description: Error de validación o email duplicado
 */
router.post('/', verifyToken, requireRole(['admin', 'editor']), [
  body('email').isEmail().normalizeEmail(),
  body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('position').optional().trim().isLength({ max: 150 }),
  body('department').optional().trim().isLength({ max: 100 }),
  body('invited_role').isIn(['admin', 'editor', 'viewer']),
  body('invitation_type').optional().isIn(['employee', 'contractor', 'consultant', 'intern', 'temporary']),
  body('expected_hire_date').optional().isISO8601().toDate(),
  body('contract_type').optional().isIn(['permanent', 'temporary', 'consultant', 'intern']),
  body('custom_message').optional().trim().isLength({ max: 1000 }),
  body('welcome_message').optional().trim().isLength({ max: 1000 }),
  body('required_documents').optional().isArray(),
  body('onboarding_checklist').optional().isArray(),
  body('expires_in_days').optional().isInt({ min: 1, max: 30 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      first_name,
      last_name,
      position,
      department,
      invited_role,
      invitation_type = 'employee',
      expected_hire_date,
      expected_salary_range,
      contract_type = 'permanent',
      custom_message,
      welcome_message,
      required_documents = [],
      onboarding_checklist = [],
      expires_in_days = 7
    } = req.body;

    // Verificar que no existe invitación activa para el mismo email
    const { data: existingInvitation } = await supabaseAdmin
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return res.status(400).json({
        error: 'Ya existe una invitación pendiente para este email'
      });
    }

    // Verificar que no existe usuario con el mismo email
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        error: 'Ya existe un usuario registrado con este email'
      });
    }

    // Preparar datos de la invitación
    const invitationData = {
      email,
      first_name,
      last_name,
      position,
      department,
      invitation_type,
      invited_role,
      invited_by: req.user.id,
      expected_hire_date,
      expected_salary_range,
      contract_type,
      custom_message,
      welcome_message,
      required_documents,
      onboarding_checklist,
      expires_at: new Date(Date.now() + (expires_in_days * 24 * 60 * 60 * 1000)).toISOString()
    };

    // Crear invitación
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .insert([invitationData])
      .select(`
        *,
        invited_by_user:invited_by(
          first_name,
          last_name,
          position,
          department
        )
      `)
      .single();

    if (inviteError) {
      console.error('Error creando invitación:', inviteError);
      return res.status(400).json({ error: 'Error creando invitación: ' + inviteError.message });
    }

    // Generar link de invitación
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invitation/${invitation.invitation_token}`;

    // Preparar datos para el email
    const emailData = {
      to: email,
      invitedName: first_name ? `${first_name} ${last_name || ''}`.trim() : email,
      inviterName: req.user.first_name ?
        `${req.user.first_name} ${req.user.last_name || ''}`.trim() :
        req.user.email,
      position: position || 'Colaborador',
      department: department || 'MINEDUC',
      invitationLink,
      customMessage: custom_message,
      welcomeMessage: welcome_message,
      expiresAt: invitation.expires_at,
      requiredDocuments: required_documents,
      onboardingChecklist: onboarding_checklist
    };

    // Enviar email de invitación
    try {
      await emailService.sendInvitationEmail(emailData);

      // Registrar envío de email
      await supabaseAdmin.rpc('log_invitation_email', {
        p_invitation_id: invitation.id,
        p_email_type: 'invitation',
        p_recipient_email: email,
        p_subject: `Invitación para unirte al equipo de ${department || 'MINEDUC'}`,
        p_sent_by: req.user.id,
        p_template: 'invitation_template'
      });

    } catch (emailError) {
      console.warn('Error enviando email de invitación:', emailError);
      // La invitación se creó pero el email falló
      // Podrían intentar reenviar más tarde
    }

    res.status(201).json({
      message: 'Invitación creada y enviada exitosamente',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        invitation_token: invitation.invitation_token,
        status: invitation.status,
        expires_at: invitation.expires_at,
        invitation_link: invitationLink
      }
    });

  } catch (error) {
    console.error('Error en POST /invitations:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations/{token}:
 *   get:
 *     summary: Obtener invitación por token
 *     description: Obtiene los detalles de una invitación usando su token único
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token único de la invitación
 *     responses:
 *       200:
 *         description: Invitación encontrada
 *       404:
 *         description: Invitación no encontrada o expirada
 */
router.get('/:token', [
  param('token').isLength({ min: 32 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;

    // Buscar invitación y marcar como vista
    const { data: invitation, error } = await supabaseAdmin
      .from('user_invitations')
      .select(`
        *,
        invited_by_user:invited_by(
          first_name,
          last_name,
          position,
          department
        )
      `)
      .eq('invitation_token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    // Verificar si expiró
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return res.status(400).json({ error: 'La invitación ha expirado' });
    }

    // Marcar como vista si no lo estaba
    if (!invitation.viewed_at) {
      await supabaseAdmin
        .from('user_invitations')
        .update({
          viewed_at: new Date().toISOString(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        })
        .eq('id', invitation.id);
    }

    // No devolver información sensible
    const safeInvitation = {
      id: invitation.id,
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      position: invitation.position,
      department: invitation.department,
      invitation_type: invitation.invitation_type,
      invited_role: invitation.invited_role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      custom_message: invitation.custom_message,
      welcome_message: invitation.welcome_message,
      required_documents: invitation.required_documents,
      onboarding_checklist: invitation.onboarding_checklist,
      invited_by_user: invitation.invited_by_user
    };

    res.json({ invitation: safeInvitation });

  } catch (error) {
    console.error('Error en GET /invitations/:token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations/{token}/accept:
 *   post:
 *     summary: Aceptar invitación
 *     description: Acepta una invitación y crea el usuario completo
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *               dpi:
 *                 type: string
 *                 description: DPI guatemalteco (13 dígitos)
 *               nit:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               birth_date:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [M, F, other]
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_phone:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitación aceptada exitosamente
 *       400:
 *         description: Error en validación o invitación no válida
 */
router.post('/:token/accept', [
  param('token').isLength({ min: 32 }),
  body('password').isLength({ min: 8, max: 128 }),
  body('dpi').optional().matches(/^[0-9]{13}$/).withMessage('DPI debe tener 13 dígitos'),
  body('nit').optional().matches(/^[0-9]{8,12}(-[0-9])?$/).withMessage('Formato de NIT inválido'),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('birth_date').optional().isISO8601().toDate(),
  body('gender').optional().isIn(['M', 'F', 'other']),
  body('emergency_contact_name').optional().trim().isLength({ max: 200 }),
  body('emergency_contact_phone').optional().trim().isLength({ max: 20 }),
  body('bio').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;
    const userData = req.body;

    // Buscar invitación
    const { data: invitation, error: findError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (findError || !invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada o no válida' });
    }

    // Verificar expiración
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return res.status(400).json({ error: 'La invitación ha expirado' });
    }

    // Verificar DPI único si se proporciona
    if (userData.dpi) {
      const { data: existingDPI } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('dpi', userData.dpi)
        .single();

      if (existingDPI) {
        return res.status(400).json({ error: 'El DPI ya está registrado en el sistema' });
      }
    }

    // Crear usuario en auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: userData.password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creando usuario auth:', authError);
      return res.status(400).json({ error: 'Error creando cuenta: ' + authError.message });
    }

    // Crear perfil completo
    const profileData = {
      id: authUser.user.id,
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      position: invitation.position,
      department: invitation.department,
      role: invitation.invited_role,
      contract_type: invitation.contract_type,
      hire_date: invitation.expected_hire_date || new Date().toISOString().split('T')[0],
      salary_range: invitation.expected_salary_range,
      onboarding_completed: false,
      is_active: true,
      ...userData,
      password: undefined // No guardar password en profile
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Rollback: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ error: 'Error creando perfil: ' + profileError.message });
    }

    // Actualizar invitación como aceptada
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        created_user_id: profile.id
      })
      .eq('id', invitation.id);

    // Enviar email de bienvenida
    try {
      const welcomeData = {
        to: invitation.email,
        userName: `${profile.first_name} ${profile.last_name}`,
        employeeId: profile.employee_id,
        position: profile.position,
        department: profile.department
      };

      await emailService.sendWelcomeEmail(welcomeData);

      // Registrar envío
      await supabaseAdmin.rpc('log_invitation_email', {
        p_invitation_id: invitation.id,
        p_email_type: 'welcome',
        p_recipient_email: invitation.email,
        p_subject: 'Bienvenido a MINEDUC',
        p_template: 'welcome_template'
      });

    } catch (emailError) {
      console.warn('Error enviando email de bienvenida:', emailError);
    }

    res.json({
      message: 'Invitación aceptada exitosamente. ¡Bienvenido al equipo!',
      user: {
        id: profile.id,
        employee_id: profile.employee_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        position: profile.position,
        department: profile.department,
        role: profile.role
      }
    });

  } catch (error) {
    console.error('Error en POST /invitations/:token/accept:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations/{id}/resend:
 *   post:
 *     summary: Reenviar invitación
 *     description: Reenvía el email de invitación y extiende la fecha de expiración
 *     tags: [Invitations]
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
 *         description: Invitación reenviada exitosamente
 */
router.post('/:id/resend', verifyToken, requireRole(['admin', 'editor']), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const { data: invitation, error } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    // Solo admin o el que creó la invitación puede reenviar
    if (req.user.role !== 'admin' && invitation.invited_by !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos para reenviar esta invitación' });
    }

    // Extender expiración por 7 días más
    const newExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();

    await supabaseAdmin
      .from('user_invitations')
      .update({ expires_at: newExpiresAt })
      .eq('id', id);

    // Reenviar email
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invitation/${invitation.invitation_token}`;

    const emailData = {
      to: invitation.email,
      invitedName: invitation.first_name ?
        `${invitation.first_name} ${invitation.last_name || ''}`.trim() :
        invitation.email,
      inviterName: req.user.first_name ?
        `${req.user.first_name} ${req.user.last_name || ''}`.trim() :
        req.user.email,
      position: invitation.position || 'Colaborador',
      department: invitation.department || 'MINEDUC',
      invitationLink,
      customMessage: invitation.custom_message,
      expiresAt: newExpiresAt,
      isReminder: true
    };

    await emailService.sendInvitationEmail(emailData);

    // Registrar reenvío
    await supabaseAdmin.rpc('log_invitation_email', {
      p_invitation_id: id,
      p_email_type: 'reminder',
      p_recipient_email: invitation.email,
      p_subject: `Recordatorio: Invitación para unirte al equipo de ${invitation.department || 'MINEDUC'}`,
      p_sent_by: req.user.id,
      p_template: 'invitation_reminder_template'
    });

    res.json({
      message: 'Invitación reenviada exitosamente',
      new_expires_at: newExpiresAt
    });

  } catch (error) {
    console.error('Error en POST /invitations/:id/resend:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations/{id}/cancel:
 *   delete:
 *     summary: Cancelar invitación
 *     description: Cancela una invitación pendiente
 *     tags: [Invitations]
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
 *         description: Invitación cancelada exitosamente
 */
router.delete('/:id/cancel', verifyToken, requireRole(['admin', 'editor']), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const { data: invitation, error: findError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    // Solo admin o el que creó la invitación puede cancelar
    if (req.user.role !== 'admin' && invitation.invited_by !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos para cancelar esta invitación' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        error: `No se puede cancelar una invitación con estado: ${invitation.status}`
      });
    }

    // Cancelar invitación
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ message: 'Invitación cancelada exitosamente' });

  } catch (error) {
    console.error('Error en DELETE /invitations/:id/cancel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/invitations/stats:
 *   get:
 *     summary: Estadísticas de invitaciones
 *     description: Obtiene estadísticas sobre el estado de las invitaciones
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats/overview', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('user_invitations')
      .select('*');

    // Los editores solo ven estadísticas de sus invitaciones
    if (req.user.role !== 'admin') {
      query = query.eq('invited_by', req.user.id);
    }

    const { data: invitations, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total: invitations.length,
      byStatus: {
        pending: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
        cancelled: 0
      },
      byType: {
        employee: 0,
        contractor: 0,
        consultant: 0,
        intern: 0,
        temporary: 0
      },
      byDepartment: {},
      responseRate: 0,
      averageResponseTime: 0,
      expiringSoon: 0 // Expiran en próximos 3 días
    };

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    let totalResponseTime = 0;
    let respondedCount = 0;

    invitations.forEach(invitation => {
      // Por estado
      stats.byStatus[invitation.status]++;

      // Por tipo
      if (invitation.invitation_type) {
        stats.byType[invitation.invitation_type]++;
      }

      // Por departamento
      if (invitation.department) {
        stats.byDepartment[invitation.department] =
          (stats.byDepartment[invitation.department] || 0) + 1;
      }

      // Tiempo de respuesta promedio
      if (invitation.responded_at) {
        const responseTime = new Date(invitation.responded_at) - new Date(invitation.created_at);
        totalResponseTime += responseTime;
        respondedCount++;
      }

      // Expirando pronto
      if (invitation.status === 'pending' &&
          new Date(invitation.expires_at) <= threeDaysFromNow) {
        stats.expiringSoon++;
      }
    });

    // Calcular tasa de respuesta
    const totalSent = stats.byStatus.accepted + stats.byStatus.rejected;
    stats.responseRate = stats.total > 0 ?
      Math.round((totalSent / stats.total) * 100) : 0;

    // Tiempo promedio de respuesta en horas
    if (respondedCount > 0) {
      stats.averageResponseTime = Math.round(
        (totalResponseTime / respondedCount) / (1000 * 60 * 60)
      );
    }

    res.json(stats);

  } catch (error) {
    console.error('Error en GET /invitations/stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;