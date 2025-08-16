const cron = require('node-cron');
const documentReminderService = require('./documentReminderService');
const notificationService = require('./notificationService');

/**
 * Configuración de trabajos programados (Cron Jobs) para el sistema de documentos
 * 
 * Horarios de ejecución:
 * - Recordatorios de documentos: Diario a las 9:00 AM
 * - Limpieza de notificaciones: Semanal los domingos a las 2:00 AM
 * - Estadísticas semanales: Lunes a las 8:00 AM
 */

class CronJobManager {
  constructor() {
    this.jobs = [];
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Inicializar todos los trabajos programados
   */
  initializeJobs() {
    console.log('🕒 Inicializando trabajos programados...');

    // Solo ejecutar en producción o si está explícitamente habilitado
    if (!this.isProduction && process.env.ENABLE_CRON_JOBS !== 'true') {
      console.log('ℹ️ Trabajos programados deshabilitados en desarrollo');
      return;
    }

    this.setupDocumentRemindersJob();
    this.setupNotificationCleanupJob();
    this.setupWeeklyReportsJob();
    this.setupDailyMaintenanceJob();

    console.log(`✅ ${this.jobs.length} trabajos programados configurados`);
  }

  /**
   * Trabajo diario para procesar recordatorios de documentos
   * Se ejecuta todos los días a las 9:00 AM
   */
  setupDocumentRemindersJob() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Ejecutando procesamiento diario de recordatorios...');
      
      try {
        await documentReminderService.processAllReminders();
        console.log('✅ Recordatorios procesados exitosamente');
        
        // Notificar a administradores sobre el procesamiento completado
        await this.notifyAdminsJobCompletion('document_reminders', 'Recordatorios de documentos procesados exitosamente');
        
      } catch (error) {
        console.error('❌ Error procesando recordatorios:', error);
        
        // Notificar error a administradores
        await notificationService.notifySystemError(
          `Error en trabajo programado de recordatorios: ${error.message}`,
          { job: 'document_reminders', timestamp: new Date().toISOString() }
        );
      }
    }, {
      scheduled: false,
      timezone: "America/Guatemala"
    });

    this.jobs.push({ name: 'document_reminders', job });
    console.log('📅 Trabajo de recordatorios configurado (diario 9:00 AM)');
  }

  /**
   * Trabajo semanal para limpiar notificaciones antiguas
   * Se ejecuta los domingos a las 2:00 AM
   */
  setupNotificationCleanupJob() {
    const job = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Ejecutando limpieza semanal de notificaciones...');
      
      try {
        const deletedCount = await notificationService.cleanupOldNotifications(30);
        console.log(`✅ Limpieza completada: ${deletedCount} notificaciones eliminadas`);
        
        await this.notifyAdminsJobCompletion(
          'notification_cleanup', 
          `Limpieza de notificaciones completada: ${deletedCount} notificaciones eliminadas`
        );
        
      } catch (error) {
        console.error('❌ Error en limpieza de notificaciones:', error);
        
        await notificationService.notifySystemError(
          `Error en trabajo de limpieza de notificaciones: ${error.message}`,
          { job: 'notification_cleanup', timestamp: new Date().toISOString() }
        );
      }
    }, {
      scheduled: false,
      timezone: "America/Guatemala"
    });

    this.jobs.push({ name: 'notification_cleanup', job });
    console.log('🗑️ Trabajo de limpieza configurado (domingos 2:00 AM)');
  }

  /**
   * Trabajo semanal para generar reportes estadísticos
   * Se ejecuta los lunes a las 8:00 AM
   */
  setupWeeklyReportsJob() {
    const job = cron.schedule('0 8 * * 1', async () => {
      console.log('📊 Generando reportes semanales...');
      
      try {
        await this.generateWeeklyDocumentReport();
        console.log('✅ Reportes semanales generados exitosamente');
        
      } catch (error) {
        console.error('❌ Error generando reportes semanales:', error);
        
        await notificationService.notifySystemError(
          `Error generando reportes semanales: ${error.message}`,
          { job: 'weekly_reports', timestamp: new Date().toISOString() }
        );
      }
    }, {
      scheduled: false,
      timezone: "America/Guatemala"
    });

    this.jobs.push({ name: 'weekly_reports', job });
    console.log('📈 Trabajo de reportes configurado (lunes 8:00 AM)');
  }

  /**
   * Trabajo diario de mantenimiento
   * Se ejecuta todos los días a las 3:00 AM
   */
  setupDailyMaintenanceJob() {
    const job = cron.schedule('0 3 * * *', async () => {
      console.log('🔧 Ejecutando mantenimiento diario...');
      
      try {
        // Actualizar estados de documentos vencidos
        await this.updateExpiredDocumentStatuses();
        
        // Limpiar registros temporales antiguos
        await this.cleanupTemporaryData();
        
        console.log('✅ Mantenimiento diario completado');
        
      } catch (error) {
        console.error('❌ Error en mantenimiento diario:', error);
        
        await notificationService.notifySystemError(
          `Error en mantenimiento diario: ${error.message}`,
          { job: 'daily_maintenance', timestamp: new Date().toISOString() }
        );
      }
    }, {
      scheduled: false,
      timezone: "America/Guatemala"
    });

    this.jobs.push({ name: 'daily_maintenance', job });
    console.log('🛠️ Trabajo de mantenimiento configurado (diario 3:00 AM)');
  }

  /**
   * Generar reporte semanal de documentos
   */
  async generateWeeklyDocumentReport() {
    try {
      // Aquí se podría generar un reporte detallado
      // Por ahora, solo enviamos una notificación con estadísticas básicas
      
      const { supabase } = require('../config/supabase');
      
      // Obtener estadísticas de la semana
      const { data: stats } = await supabase
        .rpc('get_compliance_stats', {
          p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0]
        });

      if (stats && stats.length > 0) {
        const weeklyStats = stats[0];
        
        // Notificar administradores con el reporte semanal
        const { data: admins } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          const admin_ids = admins.map(admin => admin.id);
          
          await notificationService.createBulkNotifications(admin_ids, {
            title: '📊 Reporte Semanal de Documentos',
            message: `Resumen de la semana: ${weeklyStats.total_requirements} documentos procesados, ${weeklyStats.compliance_rate}% de cumplimiento`,
            type: 'info',
            priority: 'medium',
            data: {
              action: 'weekly_report',
              stats: weeklyStats,
              period: 'última semana'
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error generando reporte semanal:', error);
      throw error;
    }
  }

  /**
   * Actualizar estados de documentos vencidos
   */
  async updateExpiredDocumentStatuses() {
    try {
      const { supabase } = require('../config/supabase');
      
      // Actualizar documentos que han vencido
      const { data, error } = await supabase
        .from('user_document_requirements')
        .update({ status: 'expired' })
        .lt('expiration_date', new Date().toISOString().split('T')[0])
        .in('status', ['approved', 'submitted'])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`📅 Actualizados ${data.length} documentos vencidos`);
      }
      
    } catch (error) {
      console.error('Error actualizando documentos vencidos:', error);
      throw error;
    }
  }

  /**
   * Limpiar datos temporales antiguos
   */
  async cleanupTemporaryData() {
    try {
      const { supabase } = require('../config/supabase');
      
      // Limpiar recordatorios muy antiguos (más de 6 meses)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('document_reminders')
        .delete()
        .lt('sent_at', sixMonthsAgo.toISOString())
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`🗑️ Eliminados ${data.length} recordatorios antiguos`);
      }
      
    } catch (error) {
      console.error('Error limpiando datos temporales:', error);
      throw error;
    }
  }

  /**
   * Notificar a administradores sobre trabajos completados
   */
  async notifyAdminsJobCompletion(jobName, message) {
    try {
      const { supabase } = require('../config/supabase');
      
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (admins && admins.length > 0) {
        const admin_ids = admins.map(admin => admin.id);
        
        await notificationService.createBulkNotifications(admin_ids, {
          title: '⚙️ Trabajo Programado Completado',
          message,
          type: 'system',
          priority: 'low',
          data: {
            action: 'cron_job_completed',
            job_name: jobName,
            completed_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error notificando trabajo completado:', error);
    }
  }

  /**
   * Iniciar todos los trabajos programados
   */
  startAllJobs() {
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`▶️ Iniciado trabajo: ${name}`);
    });
    
    console.log(`🚀 Todos los trabajos programados están activos`);
  }

  /**
   * Detener todos los trabajos programados
   */
  stopAllJobs() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️ Detenido trabajo: ${name}`);
    });
    
    console.log('🛑 Todos los trabajos programados han sido detenidos');
  }

  /**
   * Ejecutar un trabajo específico manualmente (para testing)
   */
  async runJobManually(jobName) {
    console.log(`🔄 Ejecutando trabajo '${jobName}' manualmente...`);
    
    try {
      switch (jobName) {
        case 'document_reminders':
          await documentReminderService.processAllReminders();
          break;
        case 'notification_cleanup':
          await notificationService.cleanupOldNotifications(30);
          break;
        case 'weekly_reports':
          await this.generateWeeklyDocumentReport();
          break;
        case 'daily_maintenance':
          await this.updateExpiredDocumentStatuses();
          await this.cleanupTemporaryData();
          break;
        default:
          throw new Error(`Trabajo no encontrado: ${jobName}`);
      }
      
      console.log(`✅ Trabajo '${jobName}' ejecutado exitosamente`);
    } catch (error) {
      console.error(`❌ Error ejecutando trabajo '${jobName}':`, error);
      throw error;
    }
  }

  /**
   * Obtener estado de todos los trabajos
   */
  getJobsStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running || false,
      scheduled: job.scheduled || false
    }));
  }
}

// Crear instancia singleton
const cronJobManager = new CronJobManager();

module.exports = cronJobManager;