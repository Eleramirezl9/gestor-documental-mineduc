const express = require('express');
const { query, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

// Obtener logs de auditoría
router.get('/', verifyToken, requireRole(['admin']), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isUUID(),
  query('action').optional().trim(),
  query('entityType').optional().trim(),
  query('entityId').optional().isUUID(),
  query('ipAddress').optional().isIP()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { startDate, endDate, userId, action, entityType, entityId, ipAddress } = req.query;

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(first_name, last_name, email, role)
      `, { count: 'exact' })
      .order('timestamp', { ascending: false });

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

// Obtener estadísticas de auditoría
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

// Obtener log específico por ID
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

// Exportar logs de auditoría
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

// Obtener acciones disponibles para filtros
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

// Obtener tipos de entidad disponibles para filtros
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

// Obtener resumen de actividad reciente
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

module.exports = router;

