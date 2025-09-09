const { supabase } = require('../config/supabase');
const XLSX = require('xlsx');

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
   * Exporta logs de auditoría en formato CSV o Excel
   * @param {Object} filters - Filtros para la exportación
   * @param {string} filters.format - Formato de exportación (csv o excel)
   */
  async exportLogs(filters = {}) {
    try {
      const logs = await this.getLogs({ ...filters, limit: 10000 });
      const format = filters.format || 'csv';
      
      // Preparar datos
      const data = logs.map(log => ({
        'Fecha y Hora': new Date(log.timestamp).toLocaleString('es-GT'),
        'Usuario': log.user_profiles ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 'Sistema',
        'Email': log.user_profiles ? log.user_profiles.email : '',
        'Acción': log.action,
        'Detalles': typeof log.details === 'object' ? JSON.stringify(log.details) : log.details,
        'Dirección IP': log.ip_address || 'N/A'
      }));

      if (format === 'excel') {
        // Crear workbook de Excel
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Ajustar ancho de columnas
        const colWidths = [
          { wch: 20 }, // Fecha y Hora
          { wch: 25 }, // Usuario
          { wch: 30 }, // Email
          { wch: 20 }, // Acción
          { wch: 50 }, // Detalles
          { wch: 15 }  // IP
        ];
        worksheet['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs de Auditoría');
        
        // Convertir a buffer
        return XLSX.write(workbook, { 
          type: 'buffer', 
          bookType: 'xlsx',
          bookSST: false 
        });
        
      } else {
        // Convertir a CSV
        const headers = Object.keys(data[0] || {});
        const csvRows = [headers.join(',')];

        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header] || '';
            // Escapar comillas dobles y envolver en comillas
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
      }

    } catch (error) {
      console.error('Error exportando logs:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();

