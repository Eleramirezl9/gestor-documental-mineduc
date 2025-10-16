const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const automatedNotificationService = require('../services/automatedNotificationService');
const aiMessageService = require('../services/aiMessageService');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AutomatedNotifications
 *   description: Sistema de notificaciones automatizadas y gestión de IA
 */

/**
 * @swagger
 * /api/automated-notifications/status:
 *   get:
 *     summary: Obtener estado del servicio de notificaciones automatizadas
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del servicio obtenido exitosamente
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const stats = automatedNotificationService.getStats();
    const aiStatus = await aiMessageService.checkAvailability();
    const emailStatus = await emailService.verifyConfiguration();

    res.json({
      automatedService: stats,
      aiService: aiStatus,
      emailService: { available: emailStatus },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/start:
 *   post:
 *     summary: Iniciar servicio de notificaciones automatizadas
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Servicio iniciado exitosamente
 */
router.post('/start', verifyToken, async (req, res) => {
  try {
    // Solo admins pueden controlar el servicio
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    automatedNotificationService.startMonitoring();
    
    res.json({
      message: 'Servicio de notificaciones automatizadas iniciado',
      status: automatedNotificationService.getStats()
    });
  } catch (error) {
    console.error('Error iniciando servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/stop:
 *   post:
 *     summary: Detener servicio de notificaciones automatizadas
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Servicio detenido exitosamente
 */
router.post('/stop', verifyToken, async (req, res) => {
  try {
    // Solo admins pueden controlar el servicio
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    automatedNotificationService.stopMonitoring();
    
    res.json({
      message: 'Servicio de notificaciones automatizadas detenido',
      status: automatedNotificationService.getStats()
    });
  } catch (error) {
    console.error('Error deteniendo servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/generate-message:
 *   post:
 *     summary: Generar mensaje inteligente con IA
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [document_expiration, document_required, organizational_change, reminder]
 *               userName:
 *                 type: string
 *               documentTitle:
 *                 type: string
 *               daysUntilExpiration:
 *                 type: number
 *               urgencyLevel:
 *                 type: string
 *                 enum: [urgent, high, medium, low]
 *               context:
 *                 type: string
 *               userRole:
 *                 type: string
 *               organizationalLevel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mensaje generado exitosamente
 */
router.post('/generate-message', verifyToken, [
  body('type').isIn(['document_expiration', 'document_required', 'organizational_change', 'reminder']),
  body('userName').optional().isString().trim(),
  body('documentTitle').optional().isString().trim(),
  body('daysUntilExpiration').optional().isInt({ min: 0 }),
  body('urgencyLevel').optional().isIn(['urgent', 'high', 'medium', 'low']),
  body('context').optional().isString().trim(),
  body('userRole').optional().isString().trim(),
  body('organizationalLevel').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const messageData = await aiMessageService.generateNotificationMessage(req.body);
    
    res.json(messageData);
  } catch (error) {
    console.error('Error generando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/generate-subject:
 *   post:
 *     summary: Generar sugerencias de asunto para email
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               documentTitle:
 *                 type: string
 *               urgencyLevel:
 *                 type: string
 *               daysUntilExpiration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sugerencias de asunto generadas exitosamente
 */
router.post('/generate-subject', verifyToken, [
  body('type').isString().trim(),
  body('documentTitle').optional().isString().trim(),
  body('urgencyLevel').optional().isString().trim(),
  body('daysUntilExpiration').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subjects = await aiMessageService.generateSubjectSuggestions(req.body);
    
    res.json({ subjects });
  } catch (error) {
    console.error('Error generando asuntos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/improve-message:
 *   post:
 *     summary: Mejorar un mensaje existente
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               improvementType:
 *                 type: string
 *                 enum: [shorter, friendlier, urgent, clearer, general]
 *     responses:
 *       200:
 *         description: Mensaje mejorado exitosamente
 */
router.post('/improve-message', verifyToken, [
  body('message').isString().trim().isLength({ min: 10, max: 1000 }),
  body('improvementType').optional().isIn(['shorter', 'friendlier', 'urgent', 'clearer', 'general'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, improvementType = 'general' } = req.body;
    
    const improvedMessage = await aiMessageService.improveMessage(message, improvementType);
    const sentiment = await aiMessageService.analyzeSentiment(improvedMessage);
    
    res.json({
      originalMessage: message,
      improvedMessage,
      sentiment,
      improvementType
    });
  } catch (error) {
    console.error('Error mejorando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/organizational-change:
 *   post:
 *     summary: Notificar cambio organizacional
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               documents_affected:
 *                 type: array
 *                 items:
 *                   type: string
 *               effective_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Notificación de cambio organizacional enviada exitosamente
 */
router.post('/organizational-change', verifyToken, [
  body('title').isString().trim().isLength({ min: 5, max: 200 }),
  body('description').isString().trim().isLength({ min: 10, max: 1000 }),
  body('documents_affected').optional().isArray(),
  body('effective_date').optional().isISO8601()
], async (req, res) => {
  try {
    // Solo admins pueden notificar cambios organizacionales
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const changeData = req.body;
    
    await automatedNotificationService.notifyOrganizationalChange(changeData);
    
    res.json({
      message: 'Notificación de cambio organizacional enviada exitosamente',
      changeData
    });
  } catch (error) {
    console.error('Error notificando cambio organizacional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/test-email:
 *   post:
 *     summary: Enviar email de prueba
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               type:
 *                 type: string
 *                 enum: [document_expiration, document_required, organizational_change]
 *     responses:
 *       200:
 *         description: Email de prueba enviado exitosamente
 */
router.post('/test-email', verifyToken, [
  body('email').isEmail(),
  body('type').isIn(['document_expiration', 'document_required', 'organizational_change'])
], async (req, res) => {
  try {
    // Debug: ver qué rol tiene el usuario
    console.log('🔍 DEBUG test-email - Usuario:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      profileRole: req.user?.profile?.role,
      user_metadata: req.user?.user_metadata,
      profile: req.user?.profile
    });

    // Verificar rol - soportar múltiples formatos (perfil primero)
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      console.log('❌ Acceso denegado - rol del usuario:', userRole);
      return res.status(403).json({
        error: 'Acceso denegado',
        details: 'Solo los administradores pueden enviar emails de prueba',
        userRole: userRole
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, type } = req.body;
    const userName = req.user.name || 'Usuario de Prueba';

    let result;

    switch (type) {
      case 'document_expiration':
        result = await emailService.sendDocumentExpirationNotification({
          userEmail: email,
          userName,
          document: {
            id: 'test-123',
            title: 'Documento de Prueba',
            type: 'Certificado',
            status: 'active',
            expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Este es un documento de prueba para verificar el sistema de notificaciones.'
          },
          daysUntilExpiration: 7
        });
        break;

      case 'document_required':
        result = await emailService.sendDocumentRequiredNotification({
          userEmail: email,
          userName,
          requirement: {
            id: 'req-test-123',
            document_type: 'Documento de Prueba Requerido',
            required_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Este es un requerimiento de prueba para verificar el sistema de notificaciones.'
          }
        });
        break;

      case 'organizational_change':
        result = await emailService.sendOrganizationalChangeNotification({
          userEmails: [email],
          change: {
            title: 'Cambio Organizacional de Prueba',
            description: 'Este es un cambio organizacional de prueba para verificar el sistema de notificaciones. No requiere acción por parte del usuario.',
            documents_affected: ['Documento A', 'Documento B'],
            effective_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        break;
    }

    res.json({
      message: 'Email de prueba enviado exitosamente',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/settings:
 *   get:
 *     summary: Obtener configuración de notificaciones automatizadas
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 */
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .order('type');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ settings: settings || [] });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/settings:
 *   post:
 *     summary: Actualizar configuración de notificaciones automatizadas
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 */
router.post('/settings', verifyToken, [
  body('type').isString().trim(),
  body('config').isObject()
], async (req, res) => {
  try {
    // Solo admins pueden modificar configuración
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, config } = req.body;

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        type,
        config,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Configuración actualizada exitosamente',
      setting: data
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;