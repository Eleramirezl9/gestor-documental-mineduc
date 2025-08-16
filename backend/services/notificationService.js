const { supabase } = require('../config/supabase');

/**
 * Servicio de notificaciones para crear y enviar notificaciones a usuarios
 */
class NotificationService {
  /**
   * Crea una nueva notificación
   * @param {Object} notificationData - Datos de la notificación
   * @param {string} notificationData.user_id - ID del usuario destinatario
   * @param {string} notificationData.title - Título de la notificación
   * @param {string} notificationData.message - Mensaje de la notificación
   * @param {string} notificationData.type - Tipo de notificación (info, success, warning, error, document, user, system)
   * @param {string} notificationData.priority - Prioridad (low, medium, high, urgent)
   * @param {Object} notificationData.data - Datos adicionales
   * @returns {Promise<Object>} La notificación creada
   */
  async createNotification({
    user_id,
    title,
    message,
    type = 'info',
    priority = 'medium',
    data = {}
  }) {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id,
          title,
          message,
          type,
          priority,
          data,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando notificación: ${error.message}`);
      }

      console.log(`📢 Notificación creada: ${title} para usuario ${user_id}`);
      return notification;
    } catch (error) {
      console.error('Error en createNotification:', error);
      throw error;
    }
  }

  /**
   * Crea notificaciones para múltiples usuarios
   * @param {Array<string>} user_ids - Array de IDs de usuarios
   * @param {Object} notificationData - Datos de la notificación
   * @returns {Promise<Array>} Array de notificaciones creadas
   */
  async createBulkNotifications(user_ids, notificationData) {
    try {
      const notifications = user_ids.map(user_id => ({
        user_id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        priority: notificationData.priority || 'medium',
        data: notificationData.data || {},
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        throw new Error(`Error creando notificaciones en lote: ${error.message}`);
      }

      console.log(`📢 ${data.length} notificaciones creadas en lote`);
      return data;
    } catch (error) {
      console.error('Error en createBulkNotifications:', error);
      throw error;
    }
  }

  /**
   * Envía notificación cuando se crea un nuevo documento
   */
  async notifyDocumentCreated(document, creator_id) {
    try {
      // Obtener usuarios que deben ser notificados (admins y editores)
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'editor'])
        .eq('is_active', true)
        .neq('id', creator_id); // Excluir al creador

      if (users && users.length > 0) {
        const user_ids = users.map(user => user.id);
        
        await this.createBulkNotifications(user_ids, {
          title: 'Nuevo documento creado',
          message: `Se ha creado un nuevo documento: "${document.title}"`,
          type: 'document',
          priority: 'medium',
          data: {
            document_id: document.id,
            document_title: document.title,
            created_by: creator_id,
            action: 'document_created'
          }
        });
      }
    } catch (error) {
      console.error('Error notificando creación de documento:', error);
    }
  }

  /**
   * Envía notificación cuando se aprueba un documento
   */
  async notifyDocumentApproved(document, approver_id) {
    try {
      // Notificar al creador del documento
      await this.createNotification({
        user_id: document.created_by,
        title: 'Documento aprobado',
        message: `Tu documento "${document.title}" ha sido aprobado`,
        type: 'success',
        priority: 'medium',
        data: {
          document_id: document.id,
          document_title: document.title,
          approved_by: approver_id,
          action: 'document_approved'
        }
      });
    } catch (error) {
      console.error('Error notificando aprobación de documento:', error);
    }
  }

  /**
   * Envía notificación cuando se rechaza un documento
   */
  async notifyDocumentRejected(document, rejector_id, reason) {
    try {
      // Notificar al creador del documento
      await this.createNotification({
        user_id: document.created_by,
        title: 'Documento rechazado',
        message: `Tu documento "${document.title}" ha sido rechazado. Motivo: ${reason}`,
        type: 'warning',
        priority: 'high',
        data: {
          document_id: document.id,
          document_title: document.title,
          rejected_by: rejector_id,
          rejection_reason: reason,
          action: 'document_rejected'
        }
      });
    } catch (error) {
      console.error('Error notificando rechazo de documento:', error);
    }
  }

  /**
   * Envía notificación cuando se crea un nuevo usuario
   */
  async notifyUserCreated(newUser, creator_id) {
    try {
      // Notificar a todos los admins excepto al creador
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', creator_id);

      if (admins && admins.length > 0) {
        const admin_ids = admins.map(admin => admin.id);
        
        await this.createBulkNotifications(admin_ids, {
          title: 'Nuevo usuario registrado',
          message: `Se ha registrado un nuevo usuario: ${newUser.name} (${newUser.email})`,
          type: 'user',
          priority: 'medium',
          data: {
            user_id: newUser.id,
            user_name: newUser.name,
            user_email: newUser.email,
            user_role: newUser.role,
            created_by: creator_id,
            action: 'user_created'
          }
        });
      }

      // Notificar al nuevo usuario
      await this.createNotification({
        user_id: newUser.id,
        title: '¡Bienvenido al sistema!',
        message: `Hola ${newUser.name}, tu cuenta ha sido creada exitosamente. Ahora puedes acceder al sistema de gestión documental.`,
        type: 'success',
        priority: 'high',
        data: {
          action: 'welcome_user'
        }
      });
    } catch (error) {
      console.error('Error notificando creación de usuario:', error);
    }
  }

  /**
   * Envía notificación cuando se actualiza el estado de un usuario
   */
  async notifyUserStatusChanged(user, new_status, changer_id) {
    try {
      const status_text = new_status ? 'activado' : 'desactivado';
      
      // Notificar al usuario afectado (solo si fue activado)
      if (new_status) {
        await this.createNotification({
          user_id: user.id,
          title: 'Cuenta activada',
          message: 'Tu cuenta ha sido activada. Ya puedes acceder al sistema.',
          type: 'success',
          priority: 'medium',
          data: {
            action: 'user_activated'
          }
        });
      }

      // Notificar a los admins
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', changer_id)
        .neq('id', user.id);

      if (admins && admins.length > 0) {
        const admin_ids = admins.map(admin => admin.id);
        
        await this.createBulkNotifications(admin_ids, {
          title: `Usuario ${status_text}`,
          message: `El usuario ${user.name} (${user.email}) ha sido ${status_text}`,
          type: 'user',
          priority: 'low',
          data: {
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            new_status,
            changed_by: changer_id,
            action: 'user_status_changed'
          }
        });
      }
    } catch (error) {
      console.error('Error notificando cambio de estado de usuario:', error);
    }
  }

  /**
   * Envía notificación de error del sistema
   */
  async notifySystemError(error_message, details = {}) {
    try {
      // Notificar a todos los admins
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (admins && admins.length > 0) {
        const admin_ids = admins.map(admin => admin.id);
        
        await this.createBulkNotifications(admin_ids, {
          title: 'Error del sistema',
          message: `Se ha detectado un error en el sistema: ${error_message}`,
          type: 'error',
          priority: 'urgent',
          data: {
            error_message,
            error_details: details,
            timestamp: new Date().toISOString(),
            action: 'system_error'
          }
        });
      }
    } catch (error) {
      console.error('Error notificando error del sistema:', error);
    }
  }

  /**
   * Envía notificación de mantenimiento programado
   */
  async notifyScheduledMaintenance(maintenance_info) {
    try {
      // Obtener todos los usuarios activos
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_active', true);

      if (users && users.length > 0) {
        const user_ids = users.map(user => user.id);
        
        await this.createBulkNotifications(user_ids, {
          title: 'Mantenimiento programado',
          message: `Se realizará mantenimiento del sistema el ${maintenance_info.date} de ${maintenance_info.start_time} a ${maintenance_info.end_time}`,
          type: 'warning',
          priority: 'high',
          data: {
            maintenance_date: maintenance_info.date,
            start_time: maintenance_info.start_time,
            end_time: maintenance_info.end_time,
            description: maintenance_info.description,
            action: 'scheduled_maintenance'
          }
        });
      }
    } catch (error) {
      console.error('Error notificando mantenimiento programado:', error);
    }
  }

  /**
   * Limpia notificaciones antiguas
   */
  async cleanupOldNotifications(days_old = 30) {
    try {
      const cutoff_date = new Date();
      cutoff_date.setDate(cutoff_date.getDate() - days_old);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoff_date.toISOString())
        .eq('is_read', true)
        .select();

      if (error) {
        throw new Error(`Error limpiando notificaciones: ${error.message}`);
      }

      console.log(`🧹 Se eliminaron ${data?.length || 0} notificaciones antiguas`);
      return data?.length || 0;
    } catch (error) {
      console.error('Error en cleanupOldNotifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();