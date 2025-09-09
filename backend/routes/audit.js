const express = require('express');
const { query, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Gestión de logs y auditoría del sistema
 * 
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del log
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID del usuario que ejecutó la acción
 *         action:
 *           type: string
 *           description: Acción realizada
 *         entity_type:
 *           type: string
 *           description: Tipo de entidad afectada
 *         entity_id:
 *           type: string
 *           format: uuid
 *           description: ID de la entidad afectada
 *         details:
 *           type: object
 *           description: Detalles adicionales de la acción
 *         ip_address:
 *           type: string
 *           description: Dirección IP del usuario
 *         user_agent:
 *           type: string
 *           description: User Agent del navegador
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora del evento
 *         user_profiles:
 *           type: object
 *           description: Información del perfil del usuario
 *     
 *     AuditStats:
 *       type: object
 *       properties:
 *         period:
 *           type: object
 *           properties:
 *             startDate: { type: string, format: date-time }
 *             endDate: { type: string, format: date-time }
 *         totalLogs:
 *           type: integer
 *           description: Total de logs en el período
 *         actionBreakdown:
 *           type: object
 *           description: Desglose por acción
 *         userActivity:
 *           type: object
 *           description: Actividad por usuario
 *         ipActivity:
 *           type: object
 *           description: Actividad por IP
 *         hourlyActivity:
 *           type: object
 *           description: Actividad por hora del día
 *         dailyActivity:
 *           type: object
 *           description: Actividad por día
 *         entityActivity:
 *           type: object
 *           description: Actividad por tipo de entidad
 *         topUsers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               count: { type: integer }
 *         topIPs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               ip: { type: string }
 *               count: { type: integer }
 *         securityEvents:
 *           type: integer
 *           description: Número de eventos de seguridad
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Obtener logs de auditoría
 *     description: Obtiene una lista paginada y filtrada de logs de auditoría (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         description: Número de logs por página
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para filtrar
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
 *       - in: query
 *         name: entityType
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de entidad
 *       - in: query
 *         name: entityId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por entidad específica
 *       - in: query
 *         name: ipAddress
 *         required: false
 *         schema:
 *           type: string
 *           format: ipv4
 *         description: Filtrar by dirección IP
 *     responses:
 *       200:
 *         description: Logs de auditoría obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       400:
 *         description: Error de validación
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a logs de auditoría
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('period').optional().isIn(['24hours', '7days', '30days', '3months']),
  query('userId').optional().isUUID(),
  query('action').optional().trim(),
  query('entityType').optional().trim(),
  query('entityId').optional().isUUID(),
  query('ipAddress').optional().isIP()
], async (req, res) => {
  try {
    console.log('Audit request params:', req.query);
    console.log('Period parameter:', req.query.period);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    let { startDate, endDate, period, userId, action, entityType, entityId, ipAddress } = req.query;
    
    // Si se proporciona un período, calcular las fechas automáticamente
    if (period && !startDate && !endDate) {
      const now = new Date();
      endDate = now.toISOString();
      
      const start = new Date();
      switch (period) {
        case '24hours':
          start.setHours(now.getHours() - 24);
          break;
        case '7days':
          start.setDate(now.getDate() - 7);
          break;
        case '30days':
          start.setDate(now.getDate() - 30);
          break;
        case '3months':
          start.setMonth(now.getMonth() - 3);
          break;
        default:
          start.setDate(now.getDate() - 30);
      }
      startDate = start.toISOString();
    }

    // Por ahora devolvemos datos mock para auditoría
    const mockAuditLogs = [
      {
        id: '1',
        user_email: 'admin@mineduc.gob.gt',
        action: 'login',
        resource_type: 'authentication',
        details: 'Usuario inició sesión exitosamente',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutos atrás
      },
      {
        id: '2',
        user_email: 'editor@mineduc.gob.gt',
        action: 'create',
        resource_type: 'document',
        details: 'Creado documento "Plan de estudios 2024"',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 horas atrás
      },
      {
        id: '3',
        user_email: 'admin@mineduc.gob.gt',
        action: 'update',
        resource_type: 'user',
        details: 'Actualizado perfil de usuario',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() // 4 horas atrás
      },
      {
        id: '4',
        user_email: 'viewer@mineduc.gob.gt',
        action: 'view',
        resource_type: 'document',
        details: 'Visualizó documento confidencial',
        ip_address: '192.168.1.100',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() // 6 horas atrás
      },
      {
        id: '5',
        user_email: 'admin@mineduc.gob.gt',
        action: 'delete',
        resource_type: 'document',
        details: 'Eliminó documento obsoleto',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() // 12 horas atrás
      }
    ];

    // Filtrar por fecha si se especifica período
    let filteredLogs = [...mockAuditLogs];
    
    // Aplicar filtros si existen
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }
    
    const totalCount = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });

    return;

    // Aplicar filtros
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar consulta de auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'AUDIT_LOGS_VIEWED',
      details: { 
        filters: { startDate, endDate, userId, action, entityType, entityId, ipAddress },
        result_count: data.length
      },
      ip_address: req.ip
    });

    res.json({
      logs: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo logs de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Obtener estadísticas de auditoría
 *     description: Obtiene estadísticas detalladas de los logs de auditoría (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de inicio (por defecto: 30 días atrás)"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de fin (por defecto: ahora)"
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditStats'
 *       400:
 *         description: Error de validación o al obtener estadísticas
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a estadísticas
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats', verifyToken, requireRole(['admin']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 días atrás
    const endDate = req.query.endDate || new Date().toISOString();

    // Obtener estadísticas usando la función de la base de datos
    const { data: actionStats, error: actionError } = await supabase
      .rpc('get_audit_stats', {
        start_date: startDate,
        end_date: endDate
      });

    if (actionError) {
      return res.status(400).json({ error: actionError.message });
    }

    // Obtener logs para análisis adicional
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email, role)
      `)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (logsError) {
      return res.status(400).json({ error: logsError.message });
    }

    // Procesar estadísticas adicionales
    const stats = {
      period: { startDate, endDate },
      totalLogs: logs.length,
      actionBreakdown: actionStats,
      userActivity: {},
      ipActivity: {},
      hourlyActivity: {},
      dailyActivity: {},
      entityActivity: {},
      topUsers: [],
      topIPs: [],
      securityEvents: 0
    };

    // Procesar logs
    logs.forEach(log => {
      const userName = log.user_profiles ? 
        `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 
        'Sistema';
      
      // Actividad por usuario
      stats.userActivity[userName] = (stats.userActivity[userName] || 0) + 1;

      // Actividad por IP
      if (log.ip_address) {
        stats.ipActivity[log.ip_address] = (stats.ipActivity[log.ip_address] || 0) + 1;
      }

      // Actividad por hora
      const hour = new Date(log.timestamp).getHours();
      stats.hourlyActivity[hour] = (stats.hourlyActivity[hour] || 0) + 1;

      // Actividad por día
      const day = new Date(log.timestamp).toISOString().substring(0, 10);
      stats.dailyActivity[day] = (stats.dailyActivity[day] || 0) + 1;

      // Actividad por tipo de entidad
      if (log.entity_type) {
        stats.entityActivity[log.entity_type] = (stats.entityActivity[log.entity_type] || 0) + 1;
      }

      // Eventos de seguridad
      if (log.action.includes('FAILED') || log.action.includes('UNAUTHORIZED') || 
          log.action.includes('BLOCKED') || log.action.includes('SECURITY')) {
        stats.securityEvents++;
      }
    });

    // Top usuarios más activos
    stats.topUsers = Object.entries(stats.userActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Top IPs más activas
    stats.topIPs = Object.entries(stats.ipActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Registrar consulta de estadísticas
    await auditService.log({
      user_id: req.user.id,
      action: 'AUDIT_STATS_VIEWED',
      details: { 
        period: { startDate, endDate },
        total_logs: logs.length
      },
      ip_address: req.ip
    });

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/{id}:
 *   get:
 *     summary: Obtener log específico por ID
 *     description: Obtiene un log de auditoría específico por su ID (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del log de auditoría
 *     responses:
 *       200:
 *         description: Log obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 log:
 *                   $ref: '#/components/schemas/AuditLog'
 *       404:
 *         description: Log de auditoría no encontrado
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a logs
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error || !log) {
      return res.status(404).json({ error: 'Log de auditoría no encontrado' });
    }

    // Registrar acceso al log específico
    await auditService.log({
      user_id: req.user.id,
      action: 'AUDIT_LOG_VIEWED',
      entity_type: 'audit_log',
      entity_id: id,
      details: { action: log.action },
      ip_address: req.ip
    });

    res.json({ log });

  } catch (error) {
    console.error('Error obteniendo log de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/export/csv:
 *   get:
 *     summary: Exportar logs de auditoría a CSV
 *     description: Genera y descarga un archivo CSV con los logs de auditoría (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de inicio (por defecto: 30 días atrás)"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de fin (por defecto: ahora)"
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
 *       - in: query
 *         name: entityType
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de entidad
 *     responses:
 *       200:
 *         description: Archivo CSV generado y descargado
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: attachment; filename="audit_logs_YYYY-MM-DD.csv"
 *             schema:
 *               type: string
 *       400:
 *         description: Error de validación o al generar el archivo
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden exportar logs
 *       500:
 *         description: Error interno del servidor
 */
router.get('/export/csv', verifyToken, requireRole(['admin']), [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isUUID(),
  query('action').optional().trim(),
  query('entityType').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, userId, action, entityType } = req.query;

    // Usar el servicio de auditoría para exportar
    const csvData = await auditService.exportLogs({
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      userId,
      action,
      entityType
    });

    // Registrar exportación
    await auditService.log({
      user_id: req.user.id,
      action: 'AUDIT_LOGS_EXPORTED',
      details: { 
        filters: { startDate, endDate, userId, action, entityType },
        format: 'csv'
      },
      ip_address: req.ip
    });

    // Configurar headers para descarga
    const fileName = `audit_logs_${new Date().toISOString().substring(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvData, 'utf8'));

    res.send(csvData);

  } catch (error) {
    console.error('Error exportando logs de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/actions/list:
 *   get:
 *     summary: Obtener lista de acciones disponibles
 *     description: Obtiene todas las acciones únicas disponibles en los logs para filtros (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de acciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de acciones únicas ordenadas alfabéticamente
 *       400:
 *         description: Error al obtener las acciones
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a esta información
 *       500:
 *         description: Error interno del servidor
 */
router.get('/actions/list', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: actions, error } = await supabase
      .from('audit_logs')
      .select('action')
      .order('action');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Obtener acciones únicas
    const uniqueActions = [...new Set(actions.map(item => item.action))].sort();

    res.json({ actions: uniqueActions });

  } catch (error) {
    console.error('Error obteniendo lista de acciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/entities/list:
 *   get:
 *     summary: Obtener lista de tipos de entidad disponibles
 *     description: Obtiene todos los tipos de entidad únicos disponibles en los logs para filtros (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de entidad obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entityTypes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de tipos de entidad únicos ordenados alfabéticamente
 *       400:
 *         description: Error al obtener los tipos de entidad
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a esta información
 *       500:
 *         description: Error interno del servidor
 */
router.get('/entities/list', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: entities, error } = await supabase
      .from('audit_logs')
      .select('entity_type')
      .not('entity_type', 'is', null)
      .order('entity_type');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Obtener tipos únicos
    const uniqueEntityTypes = [...new Set(entities.map(item => item.entity_type))].sort();

    res.json({ entityTypes: uniqueEntityTypes });

  } catch (error) {
    console.error('Error obteniendo lista de tipos de entidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/activity/recent:
 *   get:
 *     summary: Obtener resumen de actividad reciente
 *     description: Obtiene un resumen de la actividad reciente del sistema (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actividad reciente obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                   description: Últimos 20 logs de actividad (24 horas)
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalLogsToday:
 *                       type: integer
 *                       description: Total de logs de hoy
 *                     activeUsersToday:
 *                       type: integer
 *                       description: Número de usuarios activos hoy
 *                     last24Hours:
 *                       type: integer
 *                       description: Logs en las últimas 24 horas
 *       400:
 *         description: Error al obtener la actividad reciente
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden acceder a esta información
 *       500:
 *         description: Error interno del servidor
 */
router.get('/activity/recent', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    // Últimas 24 horas
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLogs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email)
      `)
      .gte('timestamp', last24Hours)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Estadísticas rápidas
    const { count: totalToday, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', new Date().toISOString().substring(0, 10) + 'T00:00:00.000Z');

    if (countError) {
      return res.status(400).json({ error: countError.message });
    }

    // Usuarios activos hoy
    const { data: activeUsers, error: usersError } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('timestamp', new Date().toISOString().substring(0, 10) + 'T00:00:00.000Z')
      .not('user_id', 'is', null);

    if (usersError) {
      return res.status(400).json({ error: usersError.message });
    }

    const uniqueActiveUsers = new Set(activeUsers.map(log => log.user_id)).size;

    res.json({
      recentActivity: recentLogs,
      summary: {
        totalLogsToday: totalToday || 0,
        activeUsersToday: uniqueActiveUsers,
        last24Hours: recentLogs.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/audit/export:
 *   get:
 *     summary: Exportar logs de auditoría en múltiples formatos
 *     description: Genera y descarga un archivo con los logs de auditoría en formato CSV o Excel (solo admins)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [csv, excel]
 *           default: csv
 *         description: "Formato de exportación (csv o excel)"
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 1year, all]
 *           default: 30days
 *         description: "Período de tiempo para exportar"
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de inicio personalizada"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Fecha de fin personalizada"
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filtrar por usuario específico"
 *       - in: query
 *         name: action
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filtrar por acción específica"
 *     responses:
 *       200:
 *         description: Archivo generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: 'attachment; filename="audit_logs_YYYY-MM-DD.{format}"'
 *       400:
 *         description: Error de validación o al generar el archivo
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Solo administradores pueden exportar logs de auditoría
 *       500:
 *         description: Error interno del servidor
 */
router.get('/export', verifyToken, requireRole(['admin']), [
  query('format').optional().isIn(['csv', 'excel']).withMessage('Formato debe ser csv o excel'),
  query('period').optional().isIn(['7days', '30days', '90days', '1year', 'all']).withMessage('Período inválido'),
  query('startDate').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('endDate').optional().isISO8601().withMessage('Fecha de fin inválida'),
  query('userId').optional().isUUID().withMessage('ID de usuario inválido'),
  query('action').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const format = req.query.format || 'csv';
    const period = req.query.period || '30days';
    
    // Calcular fechas basado en el período
    let startDate, endDate;
    
    if (req.query.startDate && req.query.endDate) {
      startDate = req.query.startDate;
      endDate = req.query.endDate;
    } else {
      endDate = new Date().toISOString();
      const now = new Date();
      
      switch (period) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'all':
          startDate = null;
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Usar el servicio de auditoría para exportar
    const exportData = await auditService.exportLogs({
      format,
      startDate,
      endDate,
      userId: req.query.userId,
      action: req.query.action
    });

    // Registrar exportación en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'AUDIT_EXPORT',
      entity_type: 'audit_log',
      details: { 
        format,
        period,
        startDate,
        endDate,
        filters: {
          userId: req.query.userId,
          action: req.query.action
        }
      },
      ip_address: req.ip
    });

    // Configurar headers de respuesta
    const timestamp = new Date().toISOString().substring(0, 10);
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    const fileName = `audit_logs_${timestamp}.${extension}`;
    
    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(exportData);

  } catch (error) {
    console.error('Error exportando logs de auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

