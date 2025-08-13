const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transportador de email
   */
  initializeTransporter() {
    try {
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      }
    } catch (error) {
      console.error('Error inicializando transportador de email:', error);
    }
  }

  /**
   * Crea una notificación en la base de datos
   * @param {Object} notificationData - Datos de la notificación
   */
  async createNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notificationData.userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          related_entity_type: notificationData.entityType || null,
          related_entity_id: notificationData.entityId || null,
          action_url: notificationData.actionUrl || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creando notificación:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en createNotification:', error);
      return null;
    }
  }

  /**
   * Envía notificación por email
   * @param {string} to - Email destinatario
   * @param {string} subject - Asunto del email
   * @param {string} html - Contenido HTML del email
   */
  async sendEmail(to, subject, html) {
    try {
      if (!this.transporter) {
        console.log('Transportador de email no configurado');
        return false;
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email enviado:', result.messageId);
      return true;

    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  }

  /**
   * Envía notificación de workflow
   * @param {string} workflowId - ID del workflow
   * @param {string} userId - ID del usuario a notificar
   * @param {string} type - Tipo de notificación
   */
  async sendWorkflowNotification(workflowId, userId, type) {
    try {
      // Obtener información del workflow y usuario
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows_full')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        console.error('Error obteniendo workflow para notificación:', workflowError);
        return;
      }

      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error obteniendo usuario para notificación:', userError);
        return;
      }

      let title, message, actionUrl;

      switch (type) {
        case 'workflow_assigned':
          title = 'Nuevo documento para revisar';
          message = `Se te ha asignado la revisión del documento "${workflow.document_title}". Prioridad: ${workflow.priority}`;
          actionUrl = `/workflows/${workflowId}`;
          break;

        case 'workflow_approved':
          title = 'Documento aprobado';
          message = `Tu documento "${workflow.document_title}" ha sido aprobado exitosamente.`;
          actionUrl = `/documents/${workflow.document_id}`;
          break;

        case 'workflow_rejected':
          title = 'Documento rechazado';
          message = `Tu documento "${workflow.document_title}" ha sido rechazado. Revisa los comentarios para más detalles.`;
          actionUrl = `/workflows/${workflowId}`;
          break;

        case 'workflow_cancelled':
          title = 'Workflow cancelado';
          message = `El workflow para el documento "${workflow.document_title}" ha sido cancelado.`;
          actionUrl = `/workflows/${workflowId}`;
          break;

        default:
          title = 'Notificación de workflow';
          message = `Hay una actualización en el workflow del documento "${workflow.document_title}".`;
          actionUrl = `/workflows/${workflowId}`;
      }

      // Crear notificación en la base de datos
      await this.createNotification({
        userId,
        title,
        message,
        type: type.includes('rejected') ? 'error' : type.includes('approved') ? 'success' : 'info',
        entityType: 'workflow',
        entityId: workflowId,
        actionUrl
      });

      // Enviar email si está configurado
      if (this.transporter && user.email) {
        const emailHtml = this.generateWorkflowEmailTemplate(user, workflow, type, title, message, actionUrl);
        await this.sendEmail(user.email, title, emailHtml);
      }

    } catch (error) {
      console.error('Error enviando notificación de workflow:', error);
    }
  }

  /**
   * Envía notificación de documento
   * @param {string} documentId - ID del documento
   * @param {string} userId - ID del usuario a notificar
   * @param {string} type - Tipo de notificación
   */
  async sendDocumentNotification(documentId, userId, type) {
    try {
      // Obtener información del documento y usuario
      const { data: document, error: docError } = await supabase
        .from('documents_full')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        console.error('Error obteniendo documento para notificación:', docError);
        return;
      }

      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error obteniendo usuario para notificación:', userError);
        return;
      }

      let title, message, actionUrl;

      switch (type) {
        case 'document_created':
          title = 'Nuevo documento creado';
          message = `Se ha creado un nuevo documento: "${document.title}"`;
          actionUrl = `/documents/${documentId}`;
          break;

        case 'document_updated':
          title = 'Documento actualizado';
          message = `El documento "${document.title}" ha sido actualizado.`;
          actionUrl = `/documents/${documentId}`;
          break;

        case 'document_published':
          title = 'Documento publicado';
          message = `El documento "${document.title}" ha sido publicado y está disponible.`;
          actionUrl = `/documents/${documentId}`;
          break;

        default:
          title = 'Notificación de documento';
          message = `Hay una actualización en el documento "${document.title}".`;
          actionUrl = `/documents/${documentId}`;
      }

      // Crear notificación en la base de datos
      await this.createNotification({
        userId,
        title,
        message,
        type: 'info',
        entityType: 'document',
        entityId: documentId,
        actionUrl
      });

      // Enviar email si está configurado
      if (this.transporter && user.email) {
        const emailHtml = this.generateDocumentEmailTemplate(user, document, type, title, message, actionUrl);
        await this.sendEmail(user.email, title, emailHtml);
      }

    } catch (error) {
      console.error('Error enviando notificación de documento:', error);
    }
  }

  /**
   * Genera template de email para notificaciones de workflow
   */
  generateWorkflowEmailTemplate(user, workflow, type, title, message, actionUrl) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullActionUrl = `${baseUrl}${actionUrl}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MINEDUC - Sistema de Gestión Documental</h1>
            </div>
            <div class="content">
                <h2>Hola ${user.first_name} ${user.last_name},</h2>
                <p>${message}</p>
                
                <h3>Detalles del Workflow:</h3>
                <ul>
                    <li><strong>Documento:</strong> ${workflow.document_title}</li>
                    <li><strong>Tipo:</strong> ${workflow.workflow_type}</li>
                    <li><strong>Prioridad:</strong> ${workflow.priority}</li>
                    <li><strong>Estado:</strong> ${workflow.status}</li>
                    ${workflow.due_date ? `<li><strong>Fecha límite:</strong> ${new Date(workflow.due_date).toLocaleDateString()}</li>` : ''}
                </ul>
                
                <a href="${fullActionUrl}" class="button">Ver Workflow</a>
                
                <p>Si tienes alguna pregunta, no dudes en contactar al administrador del sistema.</p>
            </div>
            <div class="footer">
                <p>© 2024 Ministerio de Educación de Guatemala</p>
                <p>Este es un mensaje automático, por favor no responder a este correo.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Genera template de email para notificaciones de documento
   */
  generateDocumentEmailTemplate(user, document, type, title, message, actionUrl) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullActionUrl = `${baseUrl}${actionUrl}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MINEDUC - Sistema de Gestión Documental</h1>
            </div>
            <div class="content">
                <h2>Hola ${user.first_name} ${user.last_name},</h2>
                <p>${message}</p>
                
                <h3>Detalles del Documento:</h3>
                <ul>
                    <li><strong>Título:</strong> ${document.title}</li>
                    <li><strong>Categoría:</strong> ${document.category_name || 'Sin categoría'}</li>
                    <li><strong>Estado:</strong> ${document.status}</li>
                    <li><strong>Creado por:</strong> ${document.created_by_name}</li>
                    <li><strong>Fecha de creación:</strong> ${new Date(document.created_at).toLocaleDateString()}</li>
                </ul>
                
                <a href="${fullActionUrl}" class="button">Ver Documento</a>
                
                <p>Si tienes alguna pregunta, no dudes en contactar al administrador del sistema.</p>
            </div>
            <div class="footer">
                <p>© 2024 Ministerio de Educación de Guatemala</p>
                <p>Este es un mensaje automático, por favor no responder a este correo.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Marca notificaciones como leídas
   * @param {string} userId - ID del usuario
   * @param {Array<string>} notificationIds - IDs de las notificaciones
   */
  async markAsRead(userId, notificationIds) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .in('id', notificationIds);

      if (error) {
        console.error('Error marcando notificaciones como leídas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error en markAsRead:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   * @param {string} userId - ID del usuario
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error obteniendo conteo de notificaciones:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error en getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Envía notificaciones masivas
   * @param {Array<string>} userIds - IDs de usuarios
   * @param {Object} notificationData - Datos de la notificación
   */
  async sendBulkNotification(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        related_entity_type: notificationData.entityType || null,
        related_entity_id: notificationData.entityId || null,
        action_url: notificationData.actionUrl || null
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error enviando notificaciones masivas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error en sendBulkNotification:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
