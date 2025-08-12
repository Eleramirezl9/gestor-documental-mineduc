const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Obtener todos los workflows
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'in_progress', 'approved', 'rejected', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('assignedToMe').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, priority, assignedToMe } = req.query;

    let query = supabase
      .from('workflows_full')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtros según el rol del usuario
    if (req.user.profile.role !== 'admin') {
      if (assignedToMe === 'true') {
        query = query.eq('current_approver_id', req.user.id);
      } else {
        query = query.or(`requester_id.eq.${req.user.id},current_approver_id.eq.${req.user.id}`);
      }
    }

    // Aplicar filtros adicionales
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      workflows: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo workflows:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener workflow por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: workflow, error } = await supabase
      .from('workflows_full')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow no encontrado' });
    }

    // Verificar permisos
    if (req.user.profile.role !== 'admin' && 
        workflow.requester_id !== req.user.id && 
        workflow.current_approver_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para ver este workflow' });
    }

    // Obtener pasos del workflow
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select(`
        *,
        user_profiles(first_name, last_name, email)
      `)
      .eq('workflow_id', id)
      .order('step_order');

    if (stepsError) {
      return res.status(400).json({ error: stepsError.message });
    }

    res.json({
      workflow: {
        ...workflow,
        steps: steps || []
      }
    });

  } catch (error) {
    console.error('Error obteniendo workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo workflow
router.post('/', verifyToken, requireRole(['admin', 'editor']), [
  body('documentId').isUUID().withMessage('ID de documento inválido'),
  body('workflowType').optional().isIn(['approval', 'review', 'signature']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601(),
  body('comments').optional().trim().isLength({ max: 1000 }),
  body('approvers').isArray({ min: 1 }).withMessage('Debe especificar al menos un aprobador'),
  body('approvers.*').isUUID().withMessage('ID de aprobador inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, workflowType = 'approval', priority = 'medium', dueDate, comments, approvers } = req.body;

    // Verificar que el documento existe
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar permisos sobre el documento
    if (req.user.profile.role !== 'admin' && document.created_by !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para crear workflows para este documento' });
    }

    // Verificar que no existe un workflow activo para este documento
    const { data: existingWorkflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('document_id', documentId)
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingWorkflow) {
      return res.status(400).json({ error: 'Ya existe un workflow activo para este documento' });
    }

    // Crear workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert([{
        document_id: documentId,
        workflow_type: workflowType,
        status: 'pending',
        requester_id: req.user.id,
        current_approver_id: approvers[0],
        priority,
        due_date: dueDate || null,
        comments
      }])
      .select()
      .single();

    if (workflowError) {
      return res.status(400).json({ error: workflowError.message });
    }

    // Crear pasos del workflow
    const workflowSteps = approvers.map((approverId, index) => ({
      workflow_id: workflow.id,
      step_order: index + 1,
      approver_id: approverId,
      status: index === 0 ? 'pending' : 'pending'
    }));

    const { error: stepsError } = await supabase
      .from('workflow_steps')
      .insert(workflowSteps);

    if (stepsError) {
      // Rollback: eliminar workflow creado
      await supabase.from('workflows').delete().eq('id', workflow.id);
      return res.status(400).json({ error: 'Error creando pasos del workflow' });
    }

    // Actualizar estado del documento
    await supabase
      .from('documents')
      .update({ status: 'pending' })
      .eq('id', documentId);

    // Enviar notificación al primer aprobador
    await notificationService.sendWorkflowNotification(workflow.id, approvers[0], 'workflow_assigned');

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'WORKFLOW_CREATED',
      entity_type: 'workflow',
      entity_id: workflow.id,
      details: { 
        document_id: documentId,
        workflow_type: workflowType,
        approvers_count: approvers.length
      },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Workflow creado exitosamente',
      workflow
    });

  } catch (error) {
    console.error('Error creando workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Aprobar paso del workflow
router.post('/:id/approve', verifyToken, [
  body('comments').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { comments } = req.body;

    // Obtener workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return res.status(404).json({ error: 'Workflow no encontrado' });
    }

    // Verificar que el usuario es el aprobador actual
    if (workflow.current_approver_id !== req.user.id) {
      return res.status(403).json({ error: 'No eres el aprobador actual de este workflow' });
    }

    // Verificar que el workflow está en estado correcto
    if (!['pending', 'in_progress'].includes(workflow.status)) {
      return res.status(400).json({ error: 'El workflow no está en un estado que permita aprobación' });
    }

    // Obtener paso actual
    const { data: currentStep, error: stepError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', id)
      .eq('approver_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (stepError || !currentStep) {
      return res.status(400).json({ error: 'No se encontró paso pendiente para este usuario' });
    }

    // Aprobar paso actual
    await supabase
      .from('workflow_steps')
      .update({
        status: 'approved',
        comments,
        decision_date: new Date().toISOString()
      })
      .eq('id', currentStep.id);

    // Verificar si hay más pasos pendientes
    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', id)
      .eq('status', 'pending')
      .gt('step_order', currentStep.step_order)
      .order('step_order')
      .limit(1)
      .single();

    let workflowStatus = 'approved';
    let nextApproverId = null;

    if (nextStep) {
      // Hay más pasos, continuar workflow
      workflowStatus = 'in_progress';
      nextApproverId = nextStep.approver_id;
      
      // Enviar notificación al siguiente aprobador
      await notificationService.sendWorkflowNotification(id, nextApproverId, 'workflow_assigned');
    } else {
      // No hay más pasos, workflow completado
      // Actualizar documento a aprobado
      await supabase
        .from('documents')
        .update({ 
          status: 'approved',
          approved_by: req.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', workflow.document_id);

      // Notificar al solicitante
      await notificationService.sendWorkflowNotification(id, workflow.requester_id, 'workflow_approved');
    }

    // Actualizar workflow
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        status: workflowStatus,
        current_approver_id: nextApproverId,
        completed_at: workflowStatus === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'WORKFLOW_STEP_APPROVED',
      entity_type: 'workflow',
      entity_id: id,
      details: { 
        step_order: currentStep.step_order,
        comments,
        workflow_status: workflowStatus
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Paso aprobado exitosamente',
      workflow: updatedWorkflow,
      isCompleted: workflowStatus === 'approved'
    });

  } catch (error) {
    console.error('Error aprobando workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rechazar workflow
router.post('/:id/reject', verifyToken, [
  body('comments').trim().isLength({ min: 10, max: 1000 }).withMessage('Los comentarios son requeridos para rechazar (mínimo 10 caracteres)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { comments } = req.body;

    // Obtener workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return res.status(404).json({ error: 'Workflow no encontrado' });
    }

    // Verificar que el usuario es el aprobador actual
    if (workflow.current_approver_id !== req.user.id) {
      return res.status(403).json({ error: 'No eres el aprobador actual de este workflow' });
    }

    // Verificar que el workflow está en estado correcto
    if (!['pending', 'in_progress'].includes(workflow.status)) {
      return res.status(400).json({ error: 'El workflow no está en un estado que permita rechazo' });
    }

    // Obtener paso actual
    const { data: currentStep, error: stepError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', id)
      .eq('approver_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (stepError || !currentStep) {
      return res.status(400).json({ error: 'No se encontró paso pendiente para este usuario' });
    }

    // Rechazar paso actual
    await supabase
      .from('workflow_steps')
      .update({
        status: 'rejected',
        comments,
        decision_date: new Date().toISOString()
      })
      .eq('id', currentStep.id);

    // Actualizar workflow a rechazado
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        status: 'rejected',
        current_approver_id: null,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Actualizar documento a rechazado
    await supabase
      .from('documents')
      .update({ status: 'rejected' })
      .eq('id', workflow.document_id);

    // Notificar al solicitante
    await notificationService.sendWorkflowNotification(id, workflow.requester_id, 'workflow_rejected');

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'WORKFLOW_REJECTED',
      entity_type: 'workflow',
      entity_id: id,
      details: { 
        step_order: currentStep.step_order,
        comments
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Workflow rechazado exitosamente',
      workflow: updatedWorkflow
    });

  } catch (error) {
    console.error('Error rechazando workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar workflow
router.post('/:id/cancel', verifyToken, [
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('La razón de cancelación es requerida (mínimo 10 caracteres)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Obtener workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return res.status(404).json({ error: 'Workflow no encontrado' });
    }

    // Verificar permisos (solo el solicitante o admin pueden cancelar)
    if (req.user.profile.role !== 'admin' && workflow.requester_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para cancelar este workflow' });
    }

    // Verificar que el workflow está en estado correcto
    if (!['pending', 'in_progress'].includes(workflow.status)) {
      return res.status(400).json({ error: 'El workflow no puede ser cancelado en su estado actual' });
    }

    // Cancelar workflow
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        status: 'cancelled',
        current_approver_id: null,
        completed_at: new Date().toISOString(),
        comments: workflow.comments ? `${workflow.comments}\n\nCANCELADO: ${reason}` : `CANCELADO: ${reason}`
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Actualizar documento a draft
    await supabase
      .from('documents')
      .update({ status: 'draft' })
      .eq('id', workflow.document_id);

    // Notificar a todos los aprobadores pendientes
    const { data: pendingSteps } = await supabase
      .from('workflow_steps')
      .select('approver_id')
      .eq('workflow_id', id)
      .eq('status', 'pending');

    if (pendingSteps) {
      for (const step of pendingSteps) {
        await notificationService.sendWorkflowNotification(id, step.approver_id, 'workflow_cancelled');
      }
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'WORKFLOW_CANCELLED',
      entity_type: 'workflow',
      entity_id: id,
      details: { reason },
      ip_address: req.ip
    });

    res.json({
      message: 'Workflow cancelado exitosamente',
      workflow: updatedWorkflow
    });

  } catch (error) {
    console.error('Error cancelando workflow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de workflows
router.get('/stats/overview', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    // Obtener conteos por estado
    const { data: statusStats, error: statusError } = await supabase
      .from('workflows')
      .select('status');

    if (statusError) {
      return res.status(400).json({ error: statusError.message });
    }

    const statusCounts = statusStats.reduce((acc, workflow) => {
      acc[workflow.status] = (acc[workflow.status] || 0) + 1;
      return acc;
    }, {});

    // Obtener workflows vencidos
    const { data: overdueWorkflows, error: overdueError } = await supabase
      .from('workflows')
      .select('id')
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', new Date().toISOString());

    if (overdueError) {
      return res.status(400).json({ error: overdueError.message });
    }

    res.json({
      total: statusStats.length,
      pending: statusCounts.pending || 0,
      in_progress: statusCounts.in_progress || 0,
      approved: statusCounts.approved || 0,
      rejected: statusCounts.rejected || 0,
      cancelled: statusCounts.cancelled || 0,
      overdue: overdueWorkflows.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de workflows:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

