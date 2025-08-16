const { supabase } = require('../config/supabase');
const notificationService = require('./notificationService');

/**
 * Servicio para gestión inteligente de recordatorios de documentos
 * Maneja vencimientos, renovaciones y notificaciones automáticas
 */
class DocumentReminderService {
  
  /**
   * Procesa todos los recordatorios pendientes
   * Debe ejecutarse diariamente (via cron job)
   */
  async processAllReminders() {
    console.log('🔄 Iniciando procesamiento de recordatorios de documentos...');
    
    try {
      // Procesar documentos próximos a vencer
      await this.processExpiringDocuments();
      
      // Procesar documentos vencidos
      await this.processExpiredDocuments();
      
      // Procesar documentos pendientes de entrega
      await this.processPendingDocuments();
      
      // Procesar renovaciones próximas
      await this.processUpcomingRenewals();
      
      console.log('✅ Procesamiento de recordatorios completado');
    } catch (error) {
      console.error('❌ Error procesando recordatorios:', error);
      throw error;
    }
  }

  /**
   * Procesa documentos próximos a vencer (recordatorios preventivos)
   */
  async processExpiringDocuments() {
    try {
      const { data: expiringDocs, error } = await supabase
        .from('documents_expiring_soon')
        .select('*')
        .in('urgency_level', ['warning', 'urgent'])
        .gte('days_until_expiration', 0); // No incluir ya vencidos

      if (error) throw error;

      for (const doc of expiringDocs || []) {
        await this.sendExpirationReminder(doc);
      }

      console.log(`📅 Procesados ${expiringDocs?.length || 0} documentos próximos a vencer`);
    } catch (error) {
      console.error('Error procesando documentos próximos a vencer:', error);
    }
  }

  /**
   * Procesa documentos ya vencidos
   */
  async processExpiredDocuments() {
    try {
      const { data: expiredDocs, error } = await supabase
        .from('documents_expiring_soon')
        .select('*')
        .eq('urgency_level', 'expired');

      if (error) throw error;

      for (const doc of expiredDocs || []) {
        await this.sendExpiredNotification(doc);
        await this.updateExpiredDocumentStatus(doc);
      }

      console.log(`⚠️ Procesados ${expiredDocs?.length || 0} documentos vencidos`);
    } catch (error) {
      console.error('Error procesando documentos vencidos:', error);
    }
  }

  /**
   * Procesa documentos pendientes de entrega
   */
  async processPendingDocuments() {
    try {
      const { data: pendingDocs, error } = await supabase
        .from('user_pending_documents')
        .select('*')
        .in('priority_level', ['due_soon', 'urgent', 'overdue']);

      if (error) throw error;

      for (const doc of pendingDocs || []) {
        await this.sendPendingDocumentReminder(doc);
      }

      console.log(`📋 Procesados ${pendingDocs?.length || 0} documentos pendientes`);
    } catch (error) {
      console.error('Error procesando documentos pendientes:', error);
    }
  }

  /**
   * Procesa renovaciones próximas
   */
  async processUpcomingRenewals() {
    try {
      const { data: renewals, error } = await supabase
        .from('user_document_requirements')
        .select(`
          *,
          document_types(name, description, reminder_before_days),
          user_profiles(first_name, last_name, email, department)
        `)
        .not('next_renewal_date', 'is', null)
        .lte('next_renewal_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Próximos 7 días
        .eq('status', 'approved');

      if (error) throw error;

      for (const renewal of renewals || []) {
        await this.sendRenewalReminder(renewal);
      }

      console.log(`🔄 Procesadas ${renewals?.length || 0} renovaciones próximas`);
    } catch (error) {
      console.error('Error procesando renovaciones:', error);
    }
  }

  /**
   * Envía recordatorio de documento próximo a vencer
   */
  async sendExpirationReminder(doc) {
    try {
      // Verificar si ya se envió un recordatorio reciente
      const shouldSend = await this.shouldSendReminder(
        doc.id, 
        doc.urgency_level === 'urgent' ? 'urgent' : 'warning'
      );

      if (!shouldSend) return;

      const title = doc.urgency_level === 'urgent' 
        ? '🚨 Documento por vencer URGENTE'
        : '⚠️ Documento próximo a vencer';

      const daysText = doc.days_until_expiration === 1 ? 'mañana' : `en ${doc.days_until_expiration} días`;
      
      const message = `Tu documento "${doc.document_type_name}" vence ${daysText}. ` +
        `${doc.current_document_title ? `Documento actual: "${doc.current_document_title}"` : 'Es necesario que subas el documento actualizado.'}`;

      const notification = await notificationService.createNotification({
        user_id: doc.user_id,
        title,
        message,
        type: doc.urgency_level === 'urgent' ? 'error' : 'warning',
        priority: doc.urgency_level === 'urgent' ? 'urgent' : 'high',
        data: {
          action: 'document_expiring',
          document_requirement_id: doc.id,
          document_type_name: doc.document_type_name,
          expiration_date: doc.expiration_date,
          days_until_expiration: doc.days_until_expiration,
          urgency_level: doc.urgency_level
        }
      });

      // Registrar el recordatorio enviado
      await this.logReminder(doc.id, doc.user_id, doc.urgency_level, doc.days_until_expiration, notification.id);

    } catch (error) {
      console.error('Error enviando recordatorio de vencimiento:', error);
    }
  }

  /**
   * Envía notificación de documento vencido
   */
  async sendExpiredNotification(doc) {
    try {
      const shouldSend = await this.shouldSendReminder(doc.id, 'expired');
      if (!shouldSend) return;

      const message = `Tu documento "${doc.document_type_name}" ha VENCIDO. ` +
        `Es urgente que subas una versión actualizada.`;

      const notification = await notificationService.createNotification({
        user_id: doc.user_id,
        title: '🔴 Documento VENCIDO',
        message,
        type: 'error',
        priority: 'urgent',
        data: {
          action: 'document_expired',
          document_requirement_id: doc.id,
          document_type_name: doc.document_type_name,
          expiration_date: doc.expiration_date,
          days_expired: Math.abs(doc.days_until_expiration)
        }
      });

      await this.logReminder(doc.id, doc.user_id, 'expired', doc.days_until_expiration, notification.id);

    } catch (error) {
      console.error('Error enviando notificación de vencimiento:', error);
    }
  }

  /**
   * Envía recordatorio de documento pendiente de entrega
   */
  async sendPendingDocumentReminder(doc) {
    try {
      const reminderType = doc.priority_level === 'overdue' ? 'urgent' : 'warning';
      const shouldSend = await this.shouldSendReminder(doc.id, reminderType);
      if (!shouldSend) return;

      let title, message;

      switch (doc.priority_level) {
        case 'overdue':
          title = '🚨 Documento ATRASADO';
          message = `El documento "${doc.document_type_name}" debía entregarse hace ${Math.abs(doc.days_until_due)} días. Es urgente que lo subas.`;
          break;
        case 'urgent':
          title = '⚠️ Documento por entregar HOY';
          message = `El documento "${doc.document_type_name}" debe entregarse hoy. No olvides subirlo.`;
          break;
        case 'due_soon':
          title = '📅 Recordatorio de documento';
          message = `El documento "${doc.document_type_name}" debe entregarse en ${doc.days_until_due} días.`;
          break;
        default:
          return;
      }

      const notification = await notificationService.createNotification({
        user_id: doc.user_id,
        title,
        message,
        type: doc.priority_level === 'overdue' ? 'error' : 'warning',
        priority: doc.priority_level === 'overdue' ? 'urgent' : 'high',
        data: {
          action: 'document_pending',
          document_requirement_id: doc.id,
          document_type_name: doc.document_type_name,
          required_date: doc.required_date,
          days_until_due: doc.days_until_due,
          is_mandatory: doc.is_mandatory
        }
      });

      await this.logReminder(doc.id, doc.user_id, reminderType, doc.days_until_due, notification.id);

    } catch (error) {
      console.error('Error enviando recordatorio de documento pendiente:', error);
    }
  }

  /**
   * Envía recordatorio de renovación próxima
   */
  async sendRenewalReminder(renewal) {
    try {
      const shouldSend = await this.shouldSendReminder(renewal.id, 'renewal');
      if (!shouldSend) return;

      const daysUntilRenewal = Math.ceil((new Date(renewal.next_renewal_date) - new Date()) / (1000 * 60 * 60 * 24));

      const message = `Tu documento "${renewal.document_types.name}" necesita renovación en ${daysUntilRenewal} días. ` +
        `Prepara la documentación necesaria para evitar que venza.`;

      const notification = await notificationService.createNotification({
        user_id: renewal.user_id,
        title: '🔄 Renovación próxima',
        message,
        type: 'info',
        priority: 'medium',
        data: {
          action: 'document_renewal_due',
          document_requirement_id: renewal.id,
          document_type_name: renewal.document_types.name,
          next_renewal_date: renewal.next_renewal_date,
          expiration_date: renewal.expiration_date,
          days_until_renewal: daysUntilRenewal
        }
      });

      await this.logReminder(renewal.id, renewal.user_id, 'renewal', daysUntilRenewal, notification.id);

    } catch (error) {
      console.error('Error enviando recordatorio de renovación:', error);
    }
  }

  /**
   * Verifica si se debe enviar un recordatorio (evita spam)
   */
  async shouldSendReminder(requirementId, reminderType) {
    try {
      // Reglas para evitar spam
      const spamRules = {
        'warning': 3, // Cada 3 días para warnings
        'urgent': 1,  // Diario para urgentes
        'expired': 1, // Diario para vencidos
        'renewal': 7  // Semanal para renovaciones
      };

      const daysBetween = spamRules[reminderType] || 1;

      const { data: lastReminder, error } = await supabase
        .from('document_reminders')
        .select('sent_at')
        .eq('user_document_requirement_id', requirementId)
        .eq('reminder_type', reminderType)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no data found
        throw error;
      }

      if (!lastReminder) return true; // No hay recordatorios previos

      const daysSinceLastReminder = Math.floor(
        (new Date() - new Date(lastReminder.sent_at)) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastReminder >= daysBetween;

    } catch (error) {
      console.error('Error verificando si enviar recordatorio:', error);
      return false; // En caso de error, no enviar para evitar spam
    }
  }

  /**
   * Registra un recordatorio enviado
   */
  async logReminder(requirementId, userId, reminderType, daysBefore, notificationId) {
    try {
      const { error } = await supabase
        .from('document_reminders')
        .insert({
          user_document_requirement_id: requirementId,
          user_id: userId,
          reminder_type: reminderType,
          days_before_expiration: daysBefore,
          notification_id: notificationId
        });

      if (error) throw error;

      // Actualizar contador en el requerimiento
      await supabase
        .from('user_document_requirements')
        .update({
          reminder_sent_count: supabase.rpc('increment_reminder_count', { requirement_id: requirementId }),
          last_reminder_sent: new Date().toISOString()
        })
        .eq('id', requirementId);

    } catch (error) {
      console.error('Error registrando recordatorio:', error);
    }
  }

  /**
   * Actualiza el estado de documentos vencidos
   */
  async updateExpiredDocumentStatus(doc) {
    try {
      await supabase
        .from('user_document_requirements')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

    } catch (error) {
      console.error('Error actualizando estado de documento vencido:', error);
    }
  }

  /**
   * Obtiene el resumen de documentos para un usuario
   */
  async getUserDocumentSummary(userId) {
    try {
      const { data: summary, error } = await supabase
        .rpc('get_user_document_summary', { p_user_id: userId });

      if (error) throw error;

      return summary;
    } catch (error) {
      console.error('Error obteniendo resumen de documentos:', error);
      throw error;
    }
  }

  /**
   * Obtiene documentos pendientes por departamento
   */
  async getDepartmentDocumentSummary(department) {
    try {
      const { data: pending, error: pendingError } = await supabase
        .from('user_pending_documents')
        .select('*')
        .eq('department', department);

      const { data: expiring, error: expiringError } = await supabase
        .from('documents_expiring_soon')
        .select('*')
        .eq('department', department);

      if (pendingError) throw pendingError;
      if (expiringError) throw expiringError;

      return {
        pending: pending || [],
        expiring: expiring || [],
        totalPending: pending?.length || 0,
        totalExpiring: expiring?.filter(d => d.urgency_level !== 'ok').length || 0
      };
    } catch (error) {
      console.error('Error obteniendo resumen departamental:', error);
      throw error;
    }
  }

  /**
   * Crear requerimiento de documento para usuario específico
   */
  async createUserDocumentRequirement(userId, documentTypeId, requiredDate, createdBy) {
    try {
      const { data, error } = await supabase
        .from('user_document_requirements')
        .insert({
          user_id: userId,
          document_type_id: documentTypeId,
          required_date: requiredDate,
          created_by: createdBy
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar notificación al usuario
      const { data: docType } = await supabase
        .from('document_types')
        .select('name, description')
        .eq('id', documentTypeId)
        .single();

      if (docType) {
        await notificationService.createNotification({
          user_id: userId,
          title: '📋 Nuevo documento requerido',
          message: `Se te ha asignado el documento "${docType.name}". Fecha límite: ${requiredDate}`,
          type: 'document',
          priority: 'medium',
          data: {
            action: 'document_required',
            document_requirement_id: data.id,
            document_type_name: docType.name,
            required_date: requiredDate
          }
        });
      }

      return data;
    } catch (error) {
      console.error('Error creando requerimiento de documento:', error);
      throw error;
    }
  }
}

module.exports = new DocumentReminderService();