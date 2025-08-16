const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const documentReminderService = require('../services/documentReminderService');
const notificationService = require('../services/notificationService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Document Requirements
 *   description: Gestión inteligente de documentos requeridos, vencimientos y recordatorios
 */

/**
 * @swagger
 * /api/document-requirements/my-requirements:
 *   get:
 *     summary: Obtener mis documentos requeridos
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de documentos requeridos del usuario
 */
router.get('/my-requirements', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_document_requirements')
      .select(`
        *,
        document_types(name, description, validity_period_months, is_mandatory),
        documents(title, file_name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agregar información de estado calculada
    const enrichedData = data?.map(req => ({
      ...req,
      document_type_name: req.document_types?.name,
      current_document_title: req.documents?.title
    })) || [];

    res.json({ data: enrichedData });
  } catch (error) {
    console.error('Error obteniendo mis requerimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/pending:
 *   get:
 *     summary: Obtener documentos pendientes del usuario
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_pending_documents')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error obteniendo documentos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/expiring:
 *   get:
 *     summary: Obtener documentos próximos a vencer del usuario
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/expiring', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents_expiring_soon')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error obteniendo documentos próximos a vencer:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/types:
 *   get:
 *     summary: Obtener tipos de documentos (admin/editor)
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Crear nuevo tipo de documento (admin)
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/types', verifyToken, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para ver tipos de documentos' });
    }

    const { data, error } = await supabase
      .from('document_types')
      .select(`
        *,
        document_categories(name, color)
      `)
      .order('name');

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error obteniendo tipos de documentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/types', verifyToken, [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('validity_period_months').optional().isInt({ min: 1 }),
  body('reminder_before_days').optional().isInt({ min: 1 }),
  body('urgent_reminder_days').optional().isInt({ min: 1 }),
], async (req, res) => {
  try {
    // Solo admins pueden crear tipos
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden crear tipos de documentos' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data, error } = await supabase
      .from('document_types')
      .insert({
        ...req.body,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: 'Tipo de documento creado exitosamente' });
  } catch (error) {
    console.error('Error creando tipo de documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/types/{id}:
 *   put:
 *     summary: Actualizar tipo de documento
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Eliminar tipo de documento
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.put('/types/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden editar tipos de documentos' });
    }

    const { data, error } = await supabase
      .from('document_types')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data, message: 'Tipo de documento actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando tipo de documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/types/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden eliminar tipos de documentos' });
    }

    const { error } = await supabase
      .from('document_types')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Tipo de documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando tipo de documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/summary/global:
 *   get:
 *     summary: Obtener resumen global de documentos
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary/global', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para ver el resumen global' });
    }

    // Obtener estadísticas generales
    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const { data: approvedCount } = await supabase
      .from('user_document_requirements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { data: pendingCount } = await supabase
      .from('user_document_requirements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: expiredCount } = await supabase
      .from('user_document_requirements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'expired');

    const summary = {
      total_users: userCount || 0,
      approved_documents: approvedCount || 0,
      pending_documents: pendingCount || 0,
      expired_documents: expiredCount || 0,
      compliance_percentage: userCount > 0 ? Math.round((approvedCount / userCount) * 100) : 0
    };

    res.json({ data: summary });
  } catch (error) {
    console.error('Error obteniendo resumen global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/summary/departments:
 *   get:
 *     summary: Obtener resumen por departamentos
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary/departments', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para ver resúmenes departamentales' });
    }

    const { data, error } = await supabase
      .rpc('get_department_summaries');

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error obteniendo resúmenes departamentales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/summary/department/{department}:
 *   get:
 *     summary: Obtener resumen de un departamento específico
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary/department/:department', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para ver resúmenes departamentales' });
    }

    const summary = await documentReminderService.getDepartmentDocumentSummary(req.params.department);
    res.json({ data: summary });
  } catch (error) {
    console.error('Error obteniendo resumen departamental:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/all:
 *   get:
 *     summary: Obtener todos los requerimientos de usuarios (admin/editor)
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/all', verifyToken, [
  query('department').optional(),
  query('status').optional(),
  query('document_type').optional(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para ver todos los requerimientos' });
    }

    const { department, status, document_type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_document_requirements')
      .select(`
        *,
        document_types(name, description),
        user_profiles(first_name, last_name, email, department),
        documents(title)
      `, { count: 'exact' });

    // Aplicar filtros
    if (department) {
      query = query.eq('user_profiles.department', department);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (document_type) {
      query = query.eq('document_type_id', document_type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enriquecer datos
    const enrichedData = data?.map(req => ({
      ...req,
      document_type_name: req.document_types?.name,
      user_name: `${req.user_profiles?.first_name} ${req.user_profiles?.last_name}`,
      user_email: req.user_profiles?.email,
      department: req.user_profiles?.department,
      current_document_title: req.documents?.title
    })) || [];

    res.json({
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo todos los requerimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/assign:
 *   post:
 *     summary: Asignar documento requerido a usuario
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/assign', verifyToken, [
  body('user_id').isUUID().withMessage('ID de usuario inválido'),
  body('document_type_id').isUUID().withMessage('ID de tipo de documento inválido'),
  body('required_date').isISO8601().withMessage('Fecha requerida inválida'),
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden asignar documentos' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, document_type_id, required_date } = req.body;

    const requirement = await documentReminderService.createUserDocumentRequirement(
      user_id,
      document_type_id,
      required_date,
      req.user.id
    );

    res.status(201).json({
      data: requirement,
      message: 'Documento asignado exitosamente'
    });
  } catch (error) {
    console.error('Error asignando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/{id}/upload:
 *   post:
 *     summary: Subir documento para un requerimiento
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/upload', verifyToken, async (req, res) => {
  try {
    // TODO: Implementar lógica de subida de archivos
    // Esto debe integrarse con el sistema de documentos existente
    
    const requirementId = req.params.id;

    // Verificar que el requerimiento pertenece al usuario
    const { data: requirement, error: reqError } = await supabase
      .from('user_document_requirements')
      .select('*')
      .eq('id', requirementId)
      .eq('user_id', req.user.id)
      .single();

    if (reqError || !requirement) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Aquí iría la lógica de subida del archivo
    // Por ahora, simulamos la actualización del estado

    const { data, error } = await supabase
      .from('user_document_requirements')
      .update({
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requirementId)
      .select()
      .single();

    if (error) throw error;

    // Notificar a admins sobre la subida
    await notificationService.createNotification({
      user_id: req.user.id, // Por ahora al mismo usuario, luego se puede notificar a admins
      title: '📤 Documento subido',
      message: 'Tu documento ha sido enviado para revisión',
      type: 'success',
      priority: 'medium',
      data: {
        action: 'document_uploaded',
        requirement_id: requirementId
      }
    });

    res.json({
      data,
      message: 'Documento subido exitosamente'
    });
  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/{id}/reminder:
 *   post:
 *     summary: Enviar recordatorio manual
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/reminder', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permisos para enviar recordatorios' });
    }

    const requirementId = req.params.id;

    // Obtener información del requerimiento
    const { data: requirement, error } = await supabase
      .from('user_document_requirements')
      .select(`
        *,
        document_types(name, description),
        user_profiles(first_name, last_name, email)
      `)
      .eq('id', requirementId)
      .single();

    if (error || !requirement) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Enviar notificación manual
    await notificationService.createNotification({
      user_id: requirement.user_id,
      title: '🔔 Recordatorio de documento',
      message: `Recordatorio: Tienes pendiente el documento "${requirement.document_types.name}"`,
      type: 'warning',
      priority: 'high',
      data: {
        action: 'manual_reminder',
        requirement_id: requirementId,
        document_type_name: requirement.document_types.name,
        sent_by: req.user.id
      }
    });

    res.json({ message: 'Recordatorio enviado exitosamente' });
  } catch (error) {
    console.error('Error enviando recordatorio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/document-requirements/process-reminders:
 *   post:
 *     summary: Procesar todos los recordatorios automáticos (admin)
 *     tags: [Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/process-reminders', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden procesar recordatorios' });
    }

    await documentReminderService.processAllReminders();

    res.json({ message: 'Recordatorios procesados exitosamente' });
  } catch (error) {
    console.error('Error procesando recordatorios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;