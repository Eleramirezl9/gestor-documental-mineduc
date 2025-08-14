const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Gestión de autenticación y autorización de usuarios
 * 
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Contraseña del usuario (mínimo 8 caracteres)
 *         firstName:
 *           type: string
 *           minLength: 2
 *           description: Nombre del usuario
 *         lastName:
 *           type: string
 *           minLength: 2
 *           description: Apellido del usuario
 *         role:
 *           type: string
 *           enum: [admin, editor, viewer]
 *           description: Rol del usuario en el sistema
 *         department:
 *           type: string
 *           description: Departamento al que pertenece el usuario
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         password:
 *           type: string
 *           description: Contraseña del usuario
 *     
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Contraseña actual del usuario
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: Nueva contraseña (mínimo 8 caracteres)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario registrado exitosamente"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación o datos incorrectos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres'),
  body('role').isIn(['admin', 'editor', 'viewer']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, department } = req.body;

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Crear perfil de usuario
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department: department || null,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (profileError) {
      // Si falla la creación del perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Error creando perfil de usuario' });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: authData.user.id,
      action: 'USER_REGISTERED',
      details: { email, role },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y devuelve un token de sesión
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Inicio de sesión exitoso"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 session:
 *                   type: object
 *                   description: Información de la sesión de Supabase
 *       401:
 *         description: Credenciales inválidas o usuario inactivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      await auditService.log({
        action: 'LOGIN_FAILED',
        details: { email, reason: authError.message },
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener perfil del usuario
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData.is_active) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
    }

    // Registrar login exitoso
    await auditService.log({
      user_id: authData.user.id,
      action: 'LOGIN_SUCCESS',
      details: { email },
      ip_address: req.ip
    });

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profileData
      },
      session: authData.session
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario actual
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sesión cerrada exitosamente"
 *       400:
 *         description: Error al cerrar sesión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token no válido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar logout
    await auditService.log({
      user_id: req.user.id,
      action: 'LOGOUT',
      details: {},
      ip_address: req.ip
    });

    res.json({ message: 'Sesión cerrada exitosamente' });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     description: Devuelve la información del perfil del usuario autenticado
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token no válido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña
 *     description: Permite al usuario cambiar su contraseña actual
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contraseña cambiada exitosamente"
 *       400:
 *         description: Error de validación o contraseña incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token no válido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/change-password', verifyToken, [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;

    // Cambiar contraseña en Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar cambio de contraseña
    await auditService.log({
      user_id: req.user.id,
      action: 'PASSWORD_CHANGED',
      details: {},
      ip_address: req.ip
    });

    res.json({ message: 'Contraseña cambiada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

