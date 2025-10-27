const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const { statsCache } = require('../middleware/cache');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Estadísticas consolidadas para el dashboard principal
 *
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtener todas las estadísticas del dashboard
 *     description: Endpoint consolidado que retorna todas las estadísticas necesarias para el dashboard en una sola llamada
 *     tags: [Dashboard]
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
 *                 documents:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     approved:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                     trends:
 *                       type: object
 *                       properties:
 *                         lastMonth:
 *                           type: integer
 *                         percentageChange:
 *                           type: number
 *                     recentDocuments:
 *                       type: array
 *                 users:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     inactive:
 *                       type: integer
 *                 workflows:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                 chartData:
 *                   type: object
 *                   properties:
 *                     monthly:
 *                       type: array
 *                     byStatus:
 *                       type: array
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas consolidadas del dashboard...');
    const userId = req.user.id;
    const userRole = req.user?.profile?.role || 'viewer';

    // Calcular fechas para comparaciones
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Estadísticas de DOCUMENTOS (employee_document_requirements + documents)
    const [
      { data: allEmployeeReqs, error: empReqsError },
      { data: allRegularDocs, error: regDocsError },
      { data: lastMonthEmpReqs, error: lastMonthEmpError },
      { data: lastMonthRegDocs, error: lastMonthRegError },
      { data: thisWeekApprovedEmp, error: weekEmpError },
      { data: thisWeekApprovedReg, error: weekRegError }
    ] = await Promise.all([
      // Total de requerimientos de empleados
      supabaseAdmin
        .from('employee_document_requirements')
        .select('id, status, assigned_at', { count: 'exact' }),

      // Total de documentos regulares
      supabaseAdmin
        .from('documents')
        .select('id, status, created_at', { count: 'exact' }),

      // Requerimientos de empleados del mes pasado
      supabaseAdmin
        .from('employee_document_requirements')
        .select('id', { count: 'exact' })
        .gte('assigned_at', firstDayLastMonth.toISOString())
        .lt('assigned_at', firstDayThisMonth.toISOString()),

      // Documentos regulares del mes pasado
      supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact' })
        .gte('created_at', firstDayLastMonth.toISOString())
        .lt('created_at', firstDayThisMonth.toISOString()),

      // Requerimientos de empleados aprobados esta semana (status en español)
      supabaseAdmin
        .from('employee_document_requirements')
        .select('id', { count: 'exact' })
        .eq('status', 'aprobado')
        .gte('updated_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Documentos regulares aprobados esta semana
      supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact' })
        .eq('status', 'approved')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    if (empReqsError) console.error('Error employee requirements:', empReqsError);
    if (regDocsError) console.error('Error regular docs:', regDocsError);

    // Normalizar status de employee_document_requirements
    // NOTA: La tabla puede tener valores en español O inglés dependiendo de cómo se insertaron
    const normalizeStatus = (status) => {
      const statusMap = {
        // Español
        'pendiente': 'pending',
        'subido': 'pending',
        'aprobado': 'approved',
        'rechazado': 'rejected',
        'vencido': 'rejected',
        // Inglés (ya normalizados)
        'pending': 'pending',
        'approved': 'approved',
        'rejected': 'rejected'
      };
      return statusMap[status?.toLowerCase()] || status;
    };

    // Normalizar requerimientos de empleados al mismo formato
    const normalizedEmployeeReqs = (allEmployeeReqs || []).map(req => ({
      ...req,
      status: normalizeStatus(req.status),
      created_at: req.assigned_at  // Usar assigned_at como created_at para consistencia
    }));

    // Combinar requerimientos de empleados (normalizados) y documentos regulares
    const allDocuments = [...normalizedEmployeeReqs, ...(allRegularDocs || [])];

    // Calcular contadores de documentos
    const docsByStatus = (allDocuments || []).reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});

    const totalDocs = allDocuments?.length || 0;
    const lastMonthTotal = (lastMonthEmpReqs?.length || 0) + (lastMonthRegDocs?.length || 0);
    const percentageChange = lastMonthTotal > 0
      ? ((totalDocs - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
      : 0;

    const thisWeekApprovedTotal = (thisWeekApprovedEmp?.length || 0) + (thisWeekApprovedReg?.length || 0);

    // 2. Estadísticas de USUARIOS
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, is_active');

    if (usersError) throw usersError;

    const activeUsers = (allUsers || []).filter(u => u.is_active).length;
    const totalUsers = allUsers?.length || 0;

    // 3. Estadísticas de WORKFLOWS
    const { data: allWorkflows, error: workflowsError } = await supabaseAdmin
      .from('workflows')
      .select('id, status');

    if (workflowsError) throw workflowsError;

    const workflowsByStatus = (allWorkflows || []).reduce((acc, wf) => {
      acc[wf.status] = (acc[wf.status] || 0) + 1;
      return acc;
    }, {});

    // 4. Documentos recientes (últimos 5) - combinar employee_document_requirements y documents
    const [
      { data: recentEmployeeReqs },
      { data: recentRegularDocs }
    ] = await Promise.all([
      supabaseAdmin
        .from('employee_document_requirements')
        .select(`
          id,
          status,
          assigned_at,
          document_types(name)
        `)
        .order('assigned_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('documents')
        .select('id, title, status, created_at, file_name')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    // Combinar y formatear documentos recientes
    const recentEmpReqsFormatted = (recentEmployeeReqs || []).map(req => ({
      id: req.id,
      title: req.document_types?.name || 'Documento de empleado',
      status: normalizeStatus(req.status),
      created_at: req.assigned_at,
      file_name: req.document_types?.name || 'Requerimiento'
    }));

    const recentRegDocsFormatted = (recentRegularDocs || []).map(doc => ({
      id: doc.id,
      title: doc.title || doc.file_name || 'Documento',
      status: doc.status,
      created_at: doc.created_at,
      file_name: doc.file_name
    }));

    const recentDocuments = [...recentEmpReqsFormatted, ...recentRegDocsFormatted]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // 5. Datos para gráficos - Documentos por mes (últimos 6 meses)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [
        { data: monthEmpReqs },
        { data: monthRegDocs }
      ] = await Promise.all([
        supabaseAdmin
          .from('employee_document_requirements')
          .select('id, status')
          .gte('assigned_at', monthDate.toISOString())
          .lt('assigned_at', nextMonthDate.toISOString()),
        supabaseAdmin
          .from('documents')
          .select('id, status')
          .gte('created_at', monthDate.toISOString())
          .lt('created_at', nextMonthDate.toISOString())
      ]);

      // Normalizar employee requirements y combinar
      const normalizedMonthEmpReqs = (monthEmpReqs || []).map(req => ({
        ...req,
        status: normalizeStatus(req.status)
      }));

      const monthDocs = [...normalizedMonthEmpReqs, ...(monthRegDocs || [])];
      const monthName = monthDate.toLocaleDateString('es-GT', { month: 'short' });
      const created = monthDocs?.length || 0;
      const approved = (monthDocs || []).filter(d => d.status === 'approved').length;

      monthlyData.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        documentos: created,
        aprobados: approved
      });
    }

    // 6. Alertas del sistema
    const pendingCount = docsByStatus.pending || 0;

    // Documentos pendientes por más de 3 días (employee_document_requirements + documents)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const [
      { data: oldPendingEmpReqs },
      { data: oldPendingReg }
    ] = await Promise.all([
      supabaseAdmin
        .from('employee_document_requirements')
        .select('id', { count: 'exact' })
        .in('status', ['pendiente', 'subido'])
        .lt('assigned_at', threeDaysAgo.toISOString()),
      supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')
        .lt('created_at', threeDaysAgo.toISOString())
    ]);

    const oldPendingCount = (oldPendingEmpReqs?.length || 0) + (oldPendingReg?.length || 0);

    // 7. Usuarios nuevos esta semana
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: newUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', weekAgo.toISOString());

    const newUsersCount = newUsers?.length || 0;

    // Construir respuesta consolidada
    const response = {
      documents: {
        total: totalDocs,
        pending: docsByStatus.pending || 0,
        approved: docsByStatus.approved || 0,
        rejected: docsByStatus.rejected || 0,
        draft: docsByStatus.draft || 0,
        archived: docsByStatus.archived || 0,
        trends: {
          lastMonth: lastMonthTotal,
          percentageChange: parseFloat(percentageChange),
          thisWeekApproved: thisWeekApprovedTotal
        },
        recentDocuments: recentDocuments || []
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisWeek: newUsersCount
      },
      workflows: {
        total: allWorkflows?.length || 0,
        pending: workflowsByStatus.pending || 0,
        in_progress: workflowsByStatus.in_progress || 0,
        completed: (workflowsByStatus.approved || 0) + (workflowsByStatus.rejected || 0),
        approved: workflowsByStatus.approved || 0,
        rejected: workflowsByStatus.rejected || 0
      },
      chartData: {
        monthly: monthlyData,
        byStatus: [
          { name: 'Aprobados', value: docsByStatus.approved || 0, color: '#10b981' },
          { name: 'Pendientes', value: docsByStatus.pending || 0, color: '#f59e0b' },
          { name: 'Rechazados', value: docsByStatus.rejected || 0, color: '#ef4444' }
        ]
      },
      alerts: {
        oldPendingDocuments: oldPendingCount,
        totalPending: pendingCount,
        newUsers: newUsersCount
      }
    };

    console.log('✅ Estadísticas del dashboard obtenidas exitosamente');
    res.json(response);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     summary: Obtener actividad reciente del sistema
 *     description: Retorna la actividad reciente de documentos, usuarios y workflows
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos a retornar
 *     responses:
 *       200:
 *         description: Actividad obtenida exitosamente
 */
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Obtener logs de auditoría recientes
    const { data: auditLogs, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        created_at,
        user_profiles!inner(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      activity: auditLogs || [],
      total: auditLogs?.length || 0
    });

  } catch (error) {
    console.error('Error obteniendo actividad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;
