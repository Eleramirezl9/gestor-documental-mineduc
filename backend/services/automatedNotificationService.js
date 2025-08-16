const { supabase } = require('../config/supabase');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

/**
 * Servicio de notificaciones automatizadas
 * Maneja el monitoreo y envío automático de notificaciones
 */
class AutomatedNotificationService {
  constructor() {
    this.isRunning = false;
    this.intervals = new Map();
  }

  /**
   * Inicia el servicio de monitoreo automático
   */
  startMonitoring() {
    if (this.isRunning) {
      console.log('🔄 El servicio de monitoreo ya está en ejecución');
      return;
    }

    console.log('🚀 Iniciando servicio de notificaciones automatizadas...');
    this.isRunning = true;

    // Verificar documentos próximos a vencer cada hora
    this.intervals.set('document_expiration', setInterval(() => {
      this.checkDocumentExpirations();
    }, 60 * 60 * 1000)); // 1 hora

    // Verificar requerimientos nuevos cada 30 minutos
    this.intervals.set('new_requirements', setInterval(() => {
      this.checkNewRequirements();
    }, 30 * 60 * 1000)); // 30 minutos

    // Enviar resumen diario a las 8:00 AM
    this.scheduleRecurringTask('daily_summary', '08:00', () => {
      this.sendDailySummaries();
    });

    // Limpiar notificaciones antiguas cada día a las 2:00 AM
    this.scheduleRecurringTask('cleanup', '02:00', () => {
      notificationService.cleanupOldNotifications(30);
    });

    console.log('✅ Servicio de monitoreo iniciado correctamente');
  }

  /**
   * Detiene el servicio de monitoreo
   */
  stopMonitoring() {
    console.log('🛑 Deteniendo servicio de notificaciones automatizadas...');
    
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`⏹️ Detenido: ${name}`);
    });
    
    this.intervals.clear();
    this.isRunning = false;
    
    console.log('✅ Servicio detenido correctamente');
  }

  /**
   * Programa una tarea recurrente diaria
   */
  scheduleRecurringTask(name, time, callback) {
    const [hours, minutes] = time.split(':').map(Number);
    
    const scheduleNext = () => {
      const now = new Date();
      const scheduled = new Date();
      scheduled.setHours(hours, minutes, 0, 0);
      
      // Si ya pasó la hora de hoy, programar para mañana
      if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      
      const timeout = scheduled.getTime() - now.getTime();
      
      setTimeout(() => {
        callback();
        scheduleNext(); // Programar la siguiente ejecución
      }, timeout);
      
      console.log(`📅 ${name} programado para: ${scheduled.toLocaleString('es-ES')}`);
    };
    
    scheduleNext();
  }

  /**
   * Verifica documentos próximos a vencer
   */
  async checkDocumentExpirations() {
    try {
      console.log('🔍 Verificando documentos próximos a vencer...');

      // Obtener configuración de notificaciones
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('type', 'document_expiration')
        .single();

      const notificationDays = settings?.days_before || [1, 7, 30]; // Días antes de vencer

      for (const days of notificationDays) {
        await this.checkExpiringDocuments(days);
      }

      console.log('✅ Verificación de vencimientos completada');
    } catch (error) {
      console.error('❌ Error verificando vencimientos:', error);
    }
  }

  /**
   * Verifica documentos que vencen en X días
   */
  async checkExpiringDocuments(daysUntilExpiration) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilExpiration);
      const targetDateString = targetDate.toISOString().split('T')[0];

      // Buscar documentos que vencen en la fecha objetivo
      const { data: expiringDocs, error } = await supabase
        .from('documents')
        .select(`
          *,
          user_profiles!documents_owner_id_fkey(id, name, email, email_notifications)
        `)
        .eq('expiration_date', targetDateString)
        .eq('status', 'active')
        .not('user_profiles.email', 'is', null);

      if (error) throw error;

      if (expiringDocs && expiringDocs.length > 0) {
        console.log(`📋 Encontrados ${expiringDocs.length} documentos que vencen en ${daysUntilExpiration} día(s)`);

        for (const doc of expiringDocs) {
          const user = doc.user_profiles;
          
          // Verificar si el usuario tiene notificaciones por email habilitadas
          if (!user.email_notifications) continue;

          // Verificar si ya se envió notificación para este documento y período
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'document')
            .like('data', `%"document_id":"${doc.id}"%`)
            .like('data', `%"days_until_expiration":${daysUntilExpiration}%`)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (existingNotification) {
            console.log(`⏭️ Notificación ya enviada para documento ${doc.id} (${daysUntilExpiration} días)`);
            continue;
          }

          // Enviar notificación por email
          try {
            await emailService.sendDocumentExpirationNotification({
              userEmail: user.email,
              userName: user.name,
              document: doc,
              daysUntilExpiration
            });

            // Crear notificación en el sistema
            await notificationService.createNotification({
              user_id: user.id,
              title: `Documento próximo a vencer`,
              message: `Su documento "${doc.title}" vence en ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}`,
              type: 'document',
              priority: daysUntilExpiration <= 1 ? 'urgent' : daysUntilExpiration <= 7 ? 'high' : 'medium',
              data: {
                document_id: doc.id,
                document_title: doc.title,
                expiration_date: doc.expiration_date,
                days_until_expiration: daysUntilExpiration,
                action: 'document_expiring'
              }
            });

            console.log(`📧 Notificación enviada a ${user.email} para documento "${doc.title}"`);
          } catch (emailError) {
            console.error(`❌ Error enviando email a ${user.email}:`, emailError);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error verificando documentos que vencen en ${daysUntilExpiration} días:`, error);
    }
  }

  /**
   * Verifica nuevos requerimientos de documentos
   */
  async checkNewRequirements() {
    try {
      console.log('🔍 Verificando nuevos requerimientos...');

      // Buscar requerimientos creados en las últimas 2 horas que no se han notificado
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const { data: newRequirements, error } = await supabase
        .from('document_requirements')
        .select(`
          *,
          user_profiles!document_requirements_user_id_fkey(id, name, email, email_notifications)
        `)
        .gte('created_at', twoHoursAgo)
        .eq('status', 'pending')
        .not('user_profiles.email', 'is', null);

      if (error) throw error;

      if (newRequirements && newRequirements.length > 0) {
        console.log(`📋 Encontrados ${newRequirements.length} nuevos requerimientos`);

        for (const requirement of newRequirements) {
          const user = requirement.user_profiles;

          // Verificar si el usuario tiene notificaciones por email habilitadas
          if (!user.email_notifications) continue;

          // Verificar si ya se envió notificación para este requerimiento
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'document')
            .like('data', `%"requirement_id":"${requirement.id}"%`)
            .gte('created_at', twoHoursAgo)
            .single();

          if (existingNotification) {
            console.log(`⏭️ Notificación ya enviada para requerimiento ${requirement.id}`);
            continue;
          }

          // Enviar notificación por email
          try {
            await emailService.sendDocumentRequiredNotification({
              userEmail: user.email,
              userName: user.name,
              requirement
            });

            // Crear notificación en el sistema
            await notificationService.createNotification({
              user_id: user.id,
              title: 'Nuevo documento requerido',
              message: `Se le ha asignado el documento: "${requirement.document_type}"`,
              type: 'document',
              priority: 'medium',
              data: {
                requirement_id: requirement.id,
                document_type: requirement.document_type,
                required_date: requirement.required_date,
                action: 'document_required'
              }
            });

            console.log(`📧 Notificación enviada a ${user.email} para requerimiento "${requirement.document_type}"`);
          } catch (emailError) {
            console.error(`❌ Error enviando email a ${user.email}:`, emailError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error verificando nuevos requerimientos:', error);
    }
  }

  /**
   * Envía resúmenes diarios a todos los usuarios activos
   */
  async sendDailySummaries() {
    try {
      console.log('📊 Enviando resúmenes diarios...');

      // Obtener usuarios activos con notificaciones por email habilitadas
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .eq('email_notifications', true)
        .not('email', 'is', null);

      if (error) throw error;

      for (const user of users) {
        try {
          const summary = await this.generateUserSummary(user.id);
          
          // Solo enviar si hay algo que reportar
          if (summary.expiring_soon > 0 || summary.new_requirements > 0 || summary.pending_approvals > 0) {
            await emailService.sendDailySummary({
              userEmail: user.email,
              userName: user.name,
              summary
            });

            console.log(`📧 Resumen diario enviado a ${user.email}`);
          }
        } catch (userError) {
          console.error(`❌ Error enviando resumen a ${user.email}:`, userError);
        }
      }

      console.log('✅ Resúmenes diarios completados');
    } catch (error) {
      console.error('❌ Error enviando resúmenes diarios:', error);
    }
  }

  /**
   * Genera resumen personalizado para un usuario
   */
  async generateUserSummary(userId) {
    const summary = {
      expiring_soon: 0,
      new_requirements: 0,
      pending_approvals: 0
    };

    try {
      // Documentos que vencen en los próximos 7 días
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { count: expiringCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'active')
        .lte('expiration_date', sevenDaysFromNow.toISOString().split('T')[0]);

      summary.expiring_soon = expiringCount || 0;

      // Nuevos requerimientos pendientes
      const { count: requirementsCount } = await supabase
        .from('document_requirements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      summary.new_requirements = requirementsCount || 0;

      // Documentos pendientes de aprobación (si es admin/editor)
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (userProfile && ['admin', 'editor'].includes(userProfile.role)) {
        const { count: pendingCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_approval');

        summary.pending_approvals = pendingCount || 0;
      }

    } catch (error) {
      console.error('Error generando resumen para usuario:', error);
    }

    return summary;
  }

  /**
   * Notifica cambios organizacionales
   */
  async notifyOrganizationalChange(changeData) {
    try {
      console.log('📢 Enviando notificación de cambio organizacional...');

      // Obtener todos los usuarios activos con notificaciones habilitadas
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .eq('email_notifications', true)
        .not('email', 'is', null);

      if (error) throw error;

      const userEmails = users.map(user => user.email);

      // Enviar emails
      await emailService.sendOrganizationalChangeNotification({
        userEmails,
        change: changeData
      });

      // Crear notificaciones en el sistema para cada usuario
      const userIds = users.map(user => user.id);
      await notificationService.createBulkNotifications(userIds, {
        title: `Cambio Organizacional - ${changeData.title}`,
        message: changeData.description,
        type: 'system',
        priority: 'high',
        data: {
          change_type: 'organizational',
          change_title: changeData.title,
          documents_affected: changeData.documents_affected,
          action: 'organizational_change'
        }
      });

      console.log(`📧 Notificación de cambio organizacional enviada a ${userEmails.length} usuarios`);
    } catch (error) {
      console.error('❌ Error notificando cambio organizacional:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.intervals.size,
      intervalNames: Array.from(this.intervals.keys())
    };
  }
}

module.exports = new AutomatedNotificationService();