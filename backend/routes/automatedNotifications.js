const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const automatedNotificationService = require('../services/automatedNotificationService');
const aiMessageService = require('../services/aiMessageService');
const emailService = require('../services/emailService');
const gpt5NanoService = require('../services/gpt5NanoService');

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

/**
 * @swagger
 * /api/automated-notifications/renewals/pending:
 *   get:
 *     summary: Obtener documentos pendientes de renovación con datos para automatización
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *         description: Días de anticipación (default 30)
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [urgent, high, medium, all]
 *         description: Filtrar por nivel de urgencia
 *     responses:
 *       200:
 *         description: Documentos pendientes obtenidos exitosamente
 */
router.get('/renewals/pending', verifyToken, [
  query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
  query('urgency').optional().isIn(['urgent', 'high', 'medium', 'expired', 'all'])
], async (req, res) => {
  // Validar errores de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Errores de validación en /renewals/pending:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const days = parseInt(req.query.days) || 30;
    const urgency = req.query.urgency || 'all';

    // Calcular fecha límite
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const targetDateString = targetDate.toISOString().split('T')[0];

    // Obtener documentos próximos a vencer
    let query = supabase
      .from('employee_document_requirements')
      .select(`
        *,
        employees!employee_document_requirements_employee_id_fkey(
          id,
          employee_id,
          first_name,
          last_name,
          email,
          position,
          department
        )
      `)
      .eq('status', 'pending')
      .not('required_date', 'is', null)
      .lte('required_date', targetDateString)
      .order('required_date', { ascending: true });

    const { data: documents, error } = await query;

    if (error) {
      console.error('Error obteniendo documentos:', error);
      return res.status(400).json({ error: error.message });
    }

    // Calcular días hasta vencimiento y clasificar por urgencia
    const enrichedDocuments = documents.map(doc => {
      const expirationDate = new Date(doc.required_date);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

      let urgencyLevel = 'medium';
      if (daysUntilExpiration <= 0) {
        urgencyLevel = 'expired';
      } else if (daysUntilExpiration <= 7) {
        urgencyLevel = 'urgent';
      } else if (daysUntilExpiration <= 15) {
        urgencyLevel = 'high';
      }

      return {
        ...doc,
        days_until_expiration: daysUntilExpiration,
        urgency_level: urgencyLevel,
        employee_name: doc.employees ? `${doc.employees.first_name} ${doc.employees.last_name}` : 'Sin nombre',
        employee_code: doc.employees?.employee_id || null,
        employee_email: doc.employees?.email || null,
        document_type_name: doc.document_type || 'Sin tipo'
      };
    });

    // Filtrar por urgencia si se especifica
    let filteredDocuments = enrichedDocuments;
    if (urgency !== 'all') {
      filteredDocuments = enrichedDocuments.filter(doc => doc.urgency_level === urgency);
    }

    // Agrupar por urgencia
    const groupedByUrgency = {
      expired: filteredDocuments.filter(d => d.urgency_level === 'expired'),
      urgent: filteredDocuments.filter(d => d.urgency_level === 'urgent'),
      high: filteredDocuments.filter(d => d.urgency_level === 'high'),
      medium: filteredDocuments.filter(d => d.urgency_level === 'medium')
    };

    res.json({
      success: true,
      data: filteredDocuments,
      grouped: groupedByUrgency,
      summary: {
        total: filteredDocuments.length,
        expired: groupedByUrgency.expired.length,
        urgent: groupedByUrgency.urgent.length,
        high: groupedByUrgency.high.length,
        medium: groupedByUrgency.medium.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo documentos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/automated-notifications/generate-email-content:
 *   post:
 *     summary: Generar contenido de email con GPT-5 Nano para documento específico
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
 *               documentId:
 *                 type: string
 *               preview:
 *                 type: boolean
 *                 description: Si es true, solo genera preview sin enviar
 *     responses:
 *       200:
 *         description: Contenido generado exitosamente
 */
router.post('/generate-email-content', verifyToken, [
  body('documentId').isString().trim(),
  body('preview').optional().isBoolean()
], async (req, res) => {
  try {
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, preview = true } = req.body;

    // Obtener documento completo
    const { data: document, error: docError } = await supabase
      .from('employee_document_requirements')
      .select(`
        *,
        employees!employee_document_requirements_employee_id_fkey(
          id,
          employee_id,
          first_name,
          last_name,
          email,
          position,
          department
        )
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (!document.employees?.email) {
      return res.status(400).json({ error: 'El empleado no tiene email configurado' });
    }

    // Calcular días hasta vencimiento
    const expirationDate = new Date(document.required_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

    let urgencyLevel = 'medium';
    if (daysUntilExpiration <= 3) urgencyLevel = 'urgent';
    else if (daysUntilExpiration <= 7) urgencyLevel = 'high';

    // Generar token del portal (solo para preview)
    let portalUrl = '';
    try {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .rpc('generate_employee_portal_token', {
          p_employee_id: document.employees.id
        });

      if (!tokenError && tokenData && tokenData[0]) {
        portalUrl = tokenData[0].portal_url;
      }
    } catch (tokenErr) {
      console.error('⚠️ Error generando token del portal:', tokenErr);
    }

    // Generar contenido con GPT-5 Nano
    const emailContent = await gpt5NanoService.generateExpirationEmailContent({
      employeeName: `${document.employees.first_name} ${document.employees.last_name}`,
      employeeCode: document.employees.employee_id,
      documentType: document.document_type || 'Documento',
      daysUntilExpiration,
      expirationDate: expirationDate.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      urgencyLevel
    });

    res.json({
      success: true,
      preview,
      document: {
        id: document.id,
        type: document.document_type || 'Documento',
        employee: {
          name: `${document.employees.first_name} ${document.employees.last_name}`,
          code: document.employees.employee_id,
          email: document.employees.email,
          position: document.employees.position,
          department: document.employees.department
        },
        expiration_date: document.required_date,
        days_until_expiration: daysUntilExpiration,
        urgency_level: urgencyLevel
      },
      email: emailContent,
      portal: portalUrl ? {
        url: portalUrl,
        note: 'Este enlace se incluirá en el email para que el empleado pueda subir documentos'
      } : null
    });
  } catch (error) {
    console.error('Error generando contenido de email:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @swagger
 * /api/automated-notifications/send-renewal-email:
 *   post:
 *     summary: Enviar email de renovación con contenido generado por GPT-5 Nano
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
 *               documentId:
 *                 type: string
 *               customContent:
 *                 type: object
 *                 properties:
 *                   subject:
 *                     type: string
 *                   body:
 *                     type: string
 *     responses:
 *       200:
 *         description: Email enviado exitosamente
 */
router.post('/send-renewal-email', verifyToken, [
  body('documentId').isString().trim(),
  body('customContent').optional().isObject()
], async (req, res) => {
  try {
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, customContent } = req.body;

    // Obtener documento completo
    const { data: document, error: docError } = await supabase
      .from('employee_document_requirements')
      .select(`
        *,
        employees!employee_document_requirements_employee_id_fkey(
          id,
          employee_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (!document.employees?.email) {
      return res.status(400).json({ error: 'El empleado no tiene email configurado' });
    }

    // Calcular días hasta vencimiento
    const expirationDate = new Date(document.required_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

    let urgencyLevel = 'medium';
    if (daysUntilExpiration <= 3) urgencyLevel = 'urgent';
    else if (daysUntilExpiration <= 7) urgencyLevel = 'high';

    // Generar token del portal del empleado
    let portalUrl = '';
    try {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .rpc('generate_employee_portal_token', {
          p_employee_id: document.employees.id
        });

      if (!tokenError && tokenData && tokenData[0]) {
        portalUrl = tokenData[0].portal_url;
        console.log('✅ Token de portal generado para:', document.employees.email);
      }
    } catch (tokenErr) {
      console.error('⚠️ Error generando token del portal:', tokenErr);
      // Continuar sin el portal URL si hay error
    }

    // Generar o usar contenido personalizado
    let emailContent;
    if (customContent && customContent.subject && customContent.body) {
      emailContent = {
        success: true,
        subject: customContent.subject,
        body: customContent.body,
        metadata: { custom: true }
      };
    } else {
      emailContent = await gpt5NanoService.generateExpirationEmailContent({
        employeeName: `${document.employees.first_name} ${document.employees.last_name}`,
        employeeCode: document.employees.employee_id,
        documentType: document.document_type || 'Documento',
        daysUntilExpiration,
        expirationDate: expirationDate.toLocaleDateString('es-GT'),
        urgencyLevel
      });
    }

    // Enviar email con Resend
    const emailResult = await emailService.sendEmail({
      to: document.employees.email,
      subject: emailContent.subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0 0 15px 0;">MINEDUC - Gestión Documental</h1>
            ${portalUrl ? `
              <div style="margin-top: 15px; background-color: rgba(255, 255, 255, 0.15); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                <p style="color: #e0e7ff; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">
                  🔗 Portal del Empleado
                </p>
                <a href="${portalUrl}"
                   style="display: inline-block; background-color: white; color: #667eea;
                          padding: 12px 30px; text-decoration: none; border-radius: 6px;
                          font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  📄 Ver y Subir Documentos
                </a>
                <p style="color: #ddd6fe; margin: 10px 0 0 0; font-size: 12px;">
                  Acceda a su portal personalizado para gestionar sus documentos
                </p>
              </div>
            ` : ''}
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <div style="white-space: pre-wrap; line-height: 1.6; color: #374151;">
              ${emailContent.body}
            </div>
            <div style="margin-top: 30px; padding: 20px; background-color: white; border-radius: 8px; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">Información del Documento</h3>
              <p><strong>Tipo:</strong> ${document.document_type || 'Documento'}</p>
              <p><strong>Fecha de vencimiento:</strong> ${expirationDate.toLocaleDateString('es-GT')}</p>
              <p><strong>Días restantes:</strong> ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}</p>
            </div>
            ${portalUrl ? `
              <div style="margin-top: 25px; padding: 20px; background-color: #eff6ff; border-radius: 8px; border: 2px solid #dbeafe;">
                <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">💡 ¿Cómo subir el documento?</h3>
                <ol style="margin: 10px 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8;">
                  <li>Haga clic en el botón "Ver y Subir Documentos" arriba</li>
                  <li>Seleccione el archivo desde su computadora</li>
                  <li>El sistema automáticamente notificará al administrador</li>
                </ol>
                <p style="margin: 15px 0 0 0; padding: 12px; background-color: white; border-radius: 4px; font-size: 13px; color: #374151;">
                  <strong>🔒 Seguro:</strong> Su enlace es personal y solo usted puede acceder a sus documentos
                </p>
              </div>
            ` : ''}
          </div>
          <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Este es un mensaje automático del Sistema de Gestión Documental del MINEDUC</p>
            ${emailContent.metadata?.model ? `<p>Generado con IA: ${emailContent.metadata.model}</p>` : ''}
          </div>
        </div>
      `
    });

    // Registrar el envío en la base de datos
    await supabase
      .from('email_logs')
      .insert({
        recipient: document.employees.email,
        subject: emailContent.subject,
        type: 'document_expiration',
        status: emailResult.success ? 'sent' : 'failed',
        metadata: {
          document_id: documentId,
          employee_id: document.employee_id,
          days_until_expiration: daysUntilExpiration,
          urgency_level: urgencyLevel,
          ai_generated: emailContent.success,
          email_id: emailResult.id,
          portal_url_included: !!portalUrl
        },
        sent_at: new Date().toISOString()
      });

    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      email: {
        to: document.employees.email,
        subject: emailContent.subject,
        aiGenerated: emailContent.success,
        portalUrlIncluded: !!portalUrl
      },
      portal: portalUrl ? {
        url: portalUrl,
        message: 'Portal URL incluido en el email para que el empleado pueda subir documentos'
      } : null,
      emailResult
    });
  } catch (error) {
    console.error('Error enviando email de renovación:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @swagger
 * /api/automated-notifications/bulk-send:
 *   post:
 *     summary: Enviar emails masivos para múltiples documentos
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
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Emails enviados exitosamente
 */
router.post('/bulk-send', verifyToken, [
  body('documentIds').isArray().notEmpty()
], async (req, res) => {
  try {
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentIds } = req.body;
    const results = [];

    for (const documentId of documentIds) {
      try {
        // Reutilizar la lógica del endpoint individual
        const { data: document, error: docError } = await supabase
          .from('employee_document_requirements')
          .select(`
            *,
            employees!employee_document_requirements_employee_id_fkey(
              id,
              employee_id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', documentId)
          .single();

        if (docError || !document || !document.employees?.email) {
          results.push({
            documentId,
            success: false,
            error: 'Documento no encontrado o sin email'
          });
          continue;
        }

        const expirationDate = new Date(document.required_date);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

        let urgencyLevel = 'medium';
        if (daysUntilExpiration <= 3) urgencyLevel = 'urgent';
        else if (daysUntilExpiration <= 7) urgencyLevel = 'high';

        const emailContent = await gpt5NanoService.generateExpirationEmailContent({
          employeeName: `${document.employees.first_name} ${document.employees.last_name}`,
          employeeCode: document.employees.employee_id,
          documentType: document.document_type || 'Documento',
          daysUntilExpiration,
          expirationDate: expirationDate.toLocaleDateString('es-GT'),
          urgencyLevel
        });

        const emailResult = await emailService.sendEmail({
          to: document.employees.email,
          subject: emailContent.subject,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">MINEDUC - Gestión Documental</h1>
              </div>
              <div style="padding: 30px; background-color: #f9fafb;">
                <div style="white-space: pre-wrap; line-height: 1.6; color: #374151;">
                  ${emailContent.body}
                </div>
                <div style="margin-top: 30px; padding: 20px; background-color: white; border-radius: 8px; border-left: 4px solid #667eea;">
                  <h3 style="margin-top: 0; color: #667eea;">Información del Documento</h3>
                  <p><strong>Tipo:</strong> ${document.document_type || 'Documento'}</p>
                  <p><strong>Fecha de vencimiento:</strong> ${expirationDate.toLocaleDateString('es-GT')}</p>
                  <p><strong>Días restantes:</strong> ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Este es un mensaje automático del Sistema de Gestión Documental del MINEDUC</p>
              </div>
            </div>
          `
        });

        await supabase.from('email_logs').insert({
          recipient: document.employees.email,
          subject: emailContent.subject,
          type: 'document_expiration',
          status: emailResult.success ? 'sent' : 'failed',
          metadata: {
            document_id: documentId,
            employee_id: document.employee_id,
            days_until_expiration: daysUntilExpiration,
            urgency_level: urgencyLevel,
            ai_generated: emailContent.success,
            email_id: emailResult.id,
            bulk_send: true
          },
          sent_at: new Date().toISOString()
        });

        results.push({
          documentId,
          success: true,
          email: document.employees.email
        });

        // Pequeña pausa entre envíos para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({
          documentId,
          success: false,
          error: error.message
        });
      }
    }

    const summary = {
      total: documentIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    res.json({
      success: true,
      message: `Envío masivo completado: ${summary.successful}/${summary.total} exitosos`,
      summary,
      results
    });
  } catch (error) {
    console.error('Error en envío masivo:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @swagger
 * /api/automated-notifications/email-logs:
 *   get:
 *     summary: Obtener histórico de emails enviados
 *     tags: [AutomatedNotifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Límite de resultados (default 50)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, failed, pending]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Logs obtenidos exitosamente
 */
router.get('/email-logs', verifyToken, async (req, res) => {
  try {
    const userRole = req.user?.profile?.role || req.user?.role || req.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;

    console.log('📧 Consultando email_logs con límite:', limit, 'estado:', status || 'todos');

    let query = supabaseAdmin
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('❌ Error en query de email_logs:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Logs obtenidos:', logs?.length || 0);

    const summary = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'sent').length,
      failed: logs.filter(l => l.status === 'failed').length,
      pending: logs.filter(l => l.status === 'pending').length
    };

    res.json({
      success: true,
      data: logs,
      summary
    });
  } catch (error) {
    console.error('Error obteniendo logs de email:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;