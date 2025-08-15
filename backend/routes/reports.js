const express = require('express');
const { query, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');
const ExcelJS = require('exceljs');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Generación y exportación de reportes del sistema
 * 
 * components:
 *   schemas:
 *     ReportPeriod:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Fecha de inicio del reporte
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Fecha de fin del reporte
 *     
 *     DocumentsReport:
 *       type: object
 *       properties:
 *         period:
 *           $ref: '#/components/schemas/ReportPeriod'
 *         statistics:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             byStatus: { type: object }
 *             byCategory: { type: object }
 *             byMonth: { type: object }
 *             byCreator: { type: object }
 *             averageProcessingTime: { type: integer, description: "Días promedio" }
 *             totalSize: { type: integer, description: "Tamaño total en bytes" }
 *         documents:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Document'
 *           description: "Hasta 100 documentos del reporte"
 *     
 *     UserActivityReport:
 *       type: object
 *       properties:
 *         period:
 *           $ref: '#/components/schemas/ReportPeriod'
 *         statistics:
 *           type: object
 *           properties:
 *             totalUsers: { type: integer }
 *             activeUsers: { type: integer }
 *             usersByRole: { type: object }
 *             activityByUser: { type: object }
 *             activityByAction: { type: object }
 *             activityByDay: { type: object }
 *             mostActiveUsers: 
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   count: { type: integer }
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *           description: "Últimas 50 actividades"
 *     
 *     WorkflowsReport:
 *       type: object
 *       properties:
 *         period:
 *           $ref: '#/components/schemas/ReportPeriod'
 *         statistics:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             byStatus: { type: object }
 *             byPriority: { type: object }
 *             byType: { type: object }
 *             averageCompletionTime: { type: integer, description: "Días promedio" }
 *             overdueCount: { type: integer }
 *             completionRate: { type: integer, description: "Porcentaje de completación" }
 *         workflows:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Workflow'
 *           description: "Hasta 100 workflows del reporte"
 */

/**
 * @swagger
 * /api/reports/documents:
 *   get:
 *     summary: Generar reporte de documentos
 *     description: Genera un reporte detallado con estadísticas de documentos
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el filtro
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el filtro
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por categoría específica
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected, archived]
 *         description: Filtrar por estado específico
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentsReport'
 *       400:
 *         description: Error de validación o al generar el reporte
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/documents', verifyToken, requireRole(['admin', 'editor']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().isUUID(),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, category, status } = req.query;

    let query = supabase
      .from('documents_full')
      .select('*');

    // Aplicar filtros de fecha
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: documents, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Procesar estadísticas
    const stats = {
      total: documents.length,
      byStatus: {},
      byCategory: {},
      byMonth: {},
      byCreator: {},
      averageProcessingTime: 0,
      totalSize: 0
    };

    documents.forEach(doc => {
      // Por estado
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;

      // Por categoría
      const categoryName = doc.category_name || 'Sin categoría';
      stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;

      // Por mes
      const month = new Date(doc.created_at).toISOString().substring(0, 7);
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;

      // Por creador
      const creatorName = doc.created_by_name || 'Desconocido';
      stats.byCreator[creatorName] = (stats.byCreator[creatorName] || 0) + 1;

      // Tamaño total
      stats.totalSize += doc.file_size || 0;
    });

    // Calcular tiempo promedio de procesamiento
    const processedDocs = documents.filter(doc => doc.approved_at && doc.created_at);
    if (processedDocs.length > 0) {
      const totalProcessingTime = processedDocs.reduce((sum, doc) => {
        const created = new Date(doc.created_at);
        const approved = new Date(doc.approved_at);
        return sum + (approved - created);
      }, 0);
      stats.averageProcessingTime = Math.round(totalProcessingTime / processedDocs.length / (1000 * 60 * 60 * 24)); // días
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REPORT_DOCUMENTS_GENERATED',
      details: { 
        filters: { startDate, endDate, category, status },
        document_count: documents.length
      },
      ip_address: req.ip
    });

    res.json({
      period: {
        startDate: startDate || documents[documents.length - 1]?.created_at,
        endDate: endDate || documents[0]?.created_at
      },
      statistics: stats,
      documents: documents.slice(0, 100) // Limitar a 100 documentos en la respuesta
    });

  } catch (error) {
    console.error('Error generando reporte de documentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/users:
 *   get:
 *     summary: Generar estadísticas de usuarios
 *     description: Genera estadísticas sobre usuarios del sistema
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 3months, 1year]
 *         description: Período de tiempo para las estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas de usuarios generadas exitosamente
 */
router.get('/users', verifyToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Estadísticas simuladas (en un caso real, consultarías la base de datos)
    const stats = {
      active: 45,
      growth: 12.5,
      top_active: [
        { id: '1', name: 'Juan Pérez', email: 'juan@mineduc.gob.gt', activity_count: 28 },
        { id: '2', name: 'María García', email: 'maria@mineduc.gob.gt', activity_count: 22 },
        { id: '3', name: 'Carlos López', email: 'carlos@mineduc.gob.gt', activity_count: 19 }
      ]
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error generando estadísticas de usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/activity:
 *   get:
 *     summary: Generar estadísticas de actividad
 *     description: Genera estadísticas de actividad del sistema
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 3months, 1year]
 *         description: Período de tiempo para las estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas de actividad generadas exitosamente
 */
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Estadísticas simuladas
    const stats = {
      daily_average: 125,
      growth: 8.3,
      avg_processing_time: '2.5s',
      error_rate: '0.1%',
      uptime: '99.9%'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error generando estadísticas de actividad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/user-activity:
 *   get:
 *     summary: Generar reporte de actividad de usuarios
 *     description: Genera un reporte detallado de la actividad de usuarios en el sistema (solo admins)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el filtro
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el filtro
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario específico
 *     responses:
 *       200:
 *         description: Reporte de actividad generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserActivityReport'
 *       400:
 *         description: Error de validación o al generar el reporte
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a este reporte
 *       500:
 *         description: Error interno del servidor
 */
router.get('/user-activity', verifyToken, requireRole(['admin']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, userId } = req.query;

    // Obtener logs de auditoría
    let auditQuery = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email, role)
      `)
      .order('timestamp', { ascending: false });

    if (startDate) {
      auditQuery = auditQuery.gte('timestamp', startDate);
    }
    if (endDate) {
      auditQuery = auditQuery.lte('timestamp', endDate);
    }
    if (userId) {
      auditQuery = auditQuery.eq('user_id', userId);
    }

    const { data: auditLogs, error: auditError } = await auditQuery;

    if (auditError) {
      return res.status(400).json({ error: auditError.message });
    }

    // Obtener estadísticas de usuarios
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*');

    if (usersError) {
      return res.status(400).json({ error: usersError.message });
    }

    // Procesar estadísticas
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      usersByRole: {},
      activityByUser: {},
      activityByAction: {},
      activityByDay: {},
      mostActiveUsers: []
    };

    // Estadísticas de usuarios
    users.forEach(user => {
      stats.usersByRole[user.role] = (stats.usersByRole[user.role] || 0) + 1;
    });

    // Estadísticas de actividad
    auditLogs.forEach(log => {
      const userName = log.user_profiles ? 
        `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 
        'Sistema';

      // Por usuario
      stats.activityByUser[userName] = (stats.activityByUser[userName] || 0) + 1;

      // Por acción
      stats.activityByAction[log.action] = (stats.activityByAction[log.action] || 0) + 1;

      // Por día
      const day = new Date(log.timestamp).toISOString().substring(0, 10);
      stats.activityByDay[day] = (stats.activityByDay[day] || 0) + 1;
    });

    // Usuarios más activos
    stats.mostActiveUsers = Object.entries(stats.activityByUser)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REPORT_USER_ACTIVITY_GENERATED',
      details: { 
        filters: { startDate, endDate, userId },
        log_count: auditLogs.length
      },
      ip_address: req.ip
    });

    res.json({
      period: {
        startDate: startDate || auditLogs[auditLogs.length - 1]?.timestamp,
        endDate: endDate || auditLogs[0]?.timestamp
      },
      statistics: stats,
      recentActivity: auditLogs.slice(0, 50) // Últimas 50 actividades
    });

  } catch (error) {
    console.error('Error generando reporte de actividad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/workflows:
 *   get:
 *     summary: Generar reporte de workflows
 *     description: Genera un reporte detallado con estadísticas de workflows de aprobación
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el filtro
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el filtro
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, approved, rejected, cancelled]
 *         description: Filtrar por estado específico
 *     responses:
 *       200:
 *         description: Reporte de workflows generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowsReport'
 *       400:
 *         description: Error de validación o al generar el reporte
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/workflows', verifyToken, requireRole(['admin', 'editor']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['pending', 'in_progress', 'approved', 'rejected', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, status } = req.query;

    let query = supabase
      .from('workflows_full')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: workflows, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Procesar estadísticas
    const stats = {
      total: workflows.length,
      byStatus: {},
      byPriority: {},
      byType: {},
      averageCompletionTime: 0,
      overdueCount: 0,
      completionRate: 0
    };

    let completedWorkflows = 0;
    let totalCompletionTime = 0;
    const now = new Date();

    workflows.forEach(workflow => {
      // Por estado
      stats.byStatus[workflow.status] = (stats.byStatus[workflow.status] || 0) + 1;

      // Por prioridad
      stats.byPriority[workflow.priority] = (stats.byPriority[workflow.priority] || 0) + 1;

      // Por tipo
      stats.byType[workflow.workflow_type] = (stats.byType[workflow.workflow_type] || 0) + 1;

      // Workflows vencidos
      if (workflow.due_date && new Date(workflow.due_date) < now && 
          ['pending', 'in_progress'].includes(workflow.status)) {
        stats.overdueCount++;
      }

      // Tiempo de completación
      if (workflow.completed_at) {
        completedWorkflows++;
        const created = new Date(workflow.created_at);
        const completed = new Date(workflow.completed_at);
        totalCompletionTime += (completed - created);
      }
    });

    // Calcular promedios
    if (completedWorkflows > 0) {
      stats.averageCompletionTime = Math.round(totalCompletionTime / completedWorkflows / (1000 * 60 * 60 * 24)); // días
      stats.completionRate = Math.round((completedWorkflows / workflows.length) * 100);
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REPORT_WORKFLOWS_GENERATED',
      details: { 
        filters: { startDate, endDate, status },
        workflow_count: workflows.length
      },
      ip_address: req.ip
    });

    res.json({
      period: {
        startDate: startDate || workflows[workflows.length - 1]?.created_at,
        endDate: endDate || workflows[0]?.created_at
      },
      statistics: stats,
      workflows: workflows.slice(0, 100) // Limitar a 100 workflows
    });

  } catch (error) {
    console.error('Error generando reporte de workflows:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/export/documents:
 *   get:
 *     summary: Exportar reporte de documentos a Excel
 *     description: Genera y descarga un archivo Excel con el reporte de documentos
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el filtro
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el filtro
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por categoría específica
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected, archived]
 *         description: Filtrar por estado específico
 *     responses:
 *       200:
 *         description: Archivo Excel generado y descargado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: attachment; filename="documentos_YYYY-MM-DD.xlsx"
 *             schema:
 *               type: string
 *       400:
 *         description: Error de validación o al generar el archivo
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.get('/export/documents', verifyToken, requireRole(['admin', 'editor']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().isUUID(),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, category, status } = req.query;

    let query = supabase
      .from('documents_full')
      .select('*');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (category) query = query.eq('category_id', category);
    if (status) query = query.eq('status', status);

    const { data: documents, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Preparar datos para Excel
    const excelData = documents.map(doc => ({
      'ID': doc.id,
      'Título': doc.title,
      'Descripción': doc.description,
      'Categoría': doc.category_name || 'Sin categoría',
      'Estado': doc.status,
      'Archivo': doc.file_name,
      'Tamaño (bytes)': doc.file_size,
      'Tipo': doc.file_type,
      'Público': doc.is_public ? 'Sí' : 'No',
      'Creado por': doc.created_by_name,
      'Fecha de creación': new Date(doc.created_at).toLocaleDateString(),
      'Fecha de actualización': doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : '',
      'Aprobado por': doc.approved_by_name || '',
      'Fecha de aprobación': doc.approved_at ? new Date(doc.approved_at).toLocaleDateString() : '',
      'Fecha efectiva': doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : '',
      'Fecha de expiración': doc.expiration_date ? new Date(doc.expiration_date).toLocaleDateString() : ''
    }));

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Documentos');

    // Definir columnas
    worksheet.columns = [
      { header: 'ID', key: 'ID', width: 36 },
      { header: 'Título', key: 'Título', width: 30 },
      { header: 'Descripción', key: 'Descripción', width: 40 },
      { header: 'Categoría', key: 'Categoría', width: 15 },
      { header: 'Estado', key: 'Estado', width: 12 },
      { header: 'Archivo', key: 'Archivo', width: 25 },
      { header: 'Tamaño (bytes)', key: 'Tamaño (bytes)', width: 12 },
      { header: 'Tipo', key: 'Tipo', width: 8 },
      { header: 'Público', key: 'Público', width: 8 },
      { header: 'Creado por', key: 'Creado por', width: 20 },
      { header: 'Fecha de creación', key: 'Fecha de creación', width: 15 },
      { header: 'Fecha de actualización', key: 'Fecha de actualización', width: 15 },
      { header: 'Aprobado por', key: 'Aprobado por', width: 20 },
      { header: 'Fecha de aprobación', key: 'Fecha de aprobación', width: 15 },
      { header: 'Fecha efectiva', key: 'Fecha efectiva', width: 15 },
      { header: 'Fecha de expiración', key: 'Fecha de expiración', width: 15 }
    ];

    // Agregar filas
    worksheet.addRows(excelData);

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REPORT_DOCUMENTS_EXPORTED',
      details: { 
        filters: { startDate, endDate, category, status },
        document_count: documents.length
      },
      ip_address: req.ip
    });

    // Configurar headers para descarga
    const fileName = `documentos_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('Error exportando reporte de documentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/reports/export/audit:
 *   get:
 *     summary: Exportar reporte de auditoría a Excel
 *     description: Genera y descarga un archivo Excel con los logs de auditoría (solo admins)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el filtro
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el filtro
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario específico
 *       - in: query
 *         name: action
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por acción específica
 *     responses:
 *       200:
 *         description: Archivo Excel generado y descargado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: attachment; filename="auditoria_YYYY-MM-DD.xlsx"
 *             schema:
 *               type: string
 *       400:
 *         description: Error de validación o al generar el archivo
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden exportar logs de auditoría
 *       500:
 *         description: Error interno del servidor
 */
router.get('/export/audit', verifyToken, requireRole(['admin']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isUUID(),
  query('action').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, userId, action } = req.query;

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email, role)
      `)
      .order('timestamp', { ascending: false })
      .limit(10000); // Limitar a 10k registros

    if (startDate) query = query.gte('timestamp', startDate);
    if (endDate) query = query.lte('timestamp', endDate);
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);

    const { data: auditLogs, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Preparar datos para Excel
    const excelData = auditLogs.map(log => ({
      'ID': log.id,
      'Usuario': log.user_profiles ? 
        `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 
        'Sistema',
      'Email': log.user_profiles?.email || '',
      'Rol': log.user_profiles?.role || '',
      'Acción': log.action,
      'Tipo de entidad': log.entity_type || '',
      'ID de entidad': log.entity_id || '',
      'Detalles': JSON.stringify(log.details),
      'Dirección IP': log.ip_address,
      'User Agent': log.user_agent || '',
      'Fecha y hora': new Date(log.timestamp).toLocaleString()
    }));

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoría');

    // Definir columnas
    worksheet.columns = [
        { header: 'ID', key: 'ID', width: 36 },
        { header: 'Usuario', key: 'Usuario', width: 25 },
        { header: 'Email', key: 'Email', width: 30 },
        { header: 'Rol', key: 'Rol', width: 12 },
        { header: 'Acción', key: 'Acción', width: 25 },
        { header: 'Tipo de entidad', key: 'Tipo de entidad', width: 15 },
        { header: 'ID de entidad', key: 'ID de entidad', width: 36 },
        { header: 'Detalles', key: 'Detalles', width: 50 },
        { header: 'Dirección IP', key: 'Dirección IP', width: 15 },
        { header: 'User Agent', key: 'User Agent', width: 30 },
        { header: 'Fecha y hora', key: 'Fecha y hora', width: 20 }
    ];

    // Agregar filas
    worksheet.addRows(excelData);

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'REPORT_AUDIT_EXPORTED',
      details: { 
        filters: { startDate, endDate, userId, action },
        log_count: auditLogs.length
      },
      ip_address: req.ip
    });

    // Configurar headers para descarga
    const fileName = `auditoria_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('Error exportando reporte de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
