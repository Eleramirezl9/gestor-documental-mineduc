const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('backend/config/supabase');
const { verifyToken } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

// Ruta de registro de usuario
router.post('/register', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('lastName').trim().notEmpty().withMessage('El apellido es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Verificar si el usuario ya existe en Supabase Auth
    const { data: existingUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Registrar usuario en Supabase Auth
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'viewer' // Rol por defecto
        }
      }
    });

    if (signUpError) {
      return res.status(400).json({ error: signUpError.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: user.user.id,
      action: 'USER_REGISTERED',
      entity_type: 'user',
      entity_id: user.user.id,
      details: { email, role: 'viewer' },
      ip_address: req.ip
    });

    res.status(201).json({ message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico.', user: user.user });

  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// router.post('/login', [...]);
// router.post('/refresh-token', [...]);
// router.post('/logout', [...]);
// router.post('/forgot-password', [...]);
// router.post('/reset-password', [...]);
// router.get('/verify-email', [...]);

module.exports = router;