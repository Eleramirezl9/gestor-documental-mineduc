const { supabase } = require('../config/supabase');

class AuditService {
  /**
   * Registra una acción en el log de auditoría
   * @param {Object} logData - Datos del log
   * @param {string} logData.user_id - ID del usuario (opcional)
   * @param {string} logData.action - Acción realizada
   * @param {Object} logData.details - Detalles adicionales
   * @param {string} logData.ip_address - Dirección IP
   * @param {string} logData.user_agent - User agent (opcional)
   */
  async log(logData) {
    try {
      const auditEntry = {
        user_id: logData.user_id || null,
        action: logData.action,
        details: logData.details || {},
        ip_address: logData.ip_address || 'unknown',
        user_agent: logData.user_agent || null,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditEntry]);

      if (error) {
        console.error('Error registrando en auditoría:', error);
      }

    } catch (error) {
      console.error('Error en servicio de auditoría:', error);
    }
  }

  /**
   * Obtiene logs de auditoría con filtros
   * @param {Object} filters - Filtros para la consulta
   * @param {string} filters.user_id - ID del usuario
   * @param {string} filters.action - Acción específica
   * @param {Date} filters.start_date - Fecha de inicio
   * @param {Date} filters.end_date - Fecha de fin
   * @param {number} filters.limit - Límite de resultados
   * @param {number} filters.offset - Offset para paginación
   */
  async getLogs(filters = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles(first_name, last_name, email)
        `)
        .order('timestamp', { ascending: false });

      // Aplicar filtros
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.start_date) {
        query = query.gte('timestamp', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('timestamp', filters.end_date.toISOString());
      }

      // Paginación
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error obteniendo logs de auditoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   */
  async getStats(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .rpc('get_audit_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      throw error;
    }
  }

  /**
   * Exporta logs de auditoría en formato CSV
   * @param {Object} filters - Filtros para la exportación
   */
  async exportLogs(filters = {}) {
    try {
      const logs = await this.getLogs({ ...filters, limit: 10000 });
      
      // Convertir a CSV
      const headers = ['Timestamp', 'Usuario', 'Email', 'Acción', 'Detalles', 'IP'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          log.timestamp,
          log.user_profiles ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 'Sistema',
          log.user_profiles ? log.user_profiles.email : '',
          log.action,
          JSON.stringify(log.details).replace(/"/g, '""'),
          log.ip_address
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      });

      return csvRows.join('\n');

    } catch (error) {
      console.error('Error exportando logs:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();

