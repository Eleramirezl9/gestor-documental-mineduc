const { supabase } = require('../config/supabase');
const ExcelJS = require('exceljs');

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
        operation_name: logData.action, // Mapear action a operation_name
        entity_type: logData.entity_type || null,
        entity_id: logData.entity_id || null,
        details: logData.details || {},
        ip_address: logData.ip_address || 'unknown',
        user_agent: logData.user_agent || null,
        performed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('operation_logs')
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
        .from('operation_logs')
        .select(`
          *,
          user_profiles(first_name, last_name, email)
        `)
        .order('performed_at', { ascending: false });

      // Aplicar filtros
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.action) {
        query = query.eq('operation_name', filters.action);
      }

      if (filters.start_date) {
        query = query.gte('performed_at', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('performed_at', filters.end_date.toISOString());
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
        'Fecha y Hora': new Date(log.performed_at).toLocaleString('es-GT'),
        'Usuario': log.user_profiles ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 'Sistema',
        'Email': log.user_profiles ? log.user_profiles.email : '',
        'Acción': log.operation_name,
        'Detalles': typeof log.details === 'object' ? JSON.stringify(log.details) : log.details,
        'Dirección IP': log.ip_address || 'N/A'
      }));

      if (format === 'excel') {
        // Crear workbook de Excel con exceljs (más seguro que xlsx)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Logs de Auditoría');

        // Definir columnas con ancho
        worksheet.columns = [
          { header: 'Fecha y Hora', key: 'Fecha y Hora', width: 20 },
          { header: 'Usuario', key: 'Usuario', width: 25 },
          { header: 'Email', key: 'Email', width: 30 },
          { header: 'Acción', key: 'Acción', width: 20 },
          { header: 'Detalles', key: 'Detalles', width: 50 },
          { header: 'Dirección IP', key: 'Dirección IP', width: 15 }
        ];

        // Agregar filas de datos
        worksheet.addRows(data);

        // Estilo para el encabezado
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Convertir a buffer
        return await workbook.xlsx.writeBuffer();

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

