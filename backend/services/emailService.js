const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');

/**
 * Servicio de email para envío de notificaciones automatizadas
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    // Configuración para Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // App Password, no la contraseña normal
      }
    });
  }

  /**
   * Envía un email
   */
  async sendEmail({ to, subject, htmlContent, textContent }) {
    try {
      if (!this.transporter) {
        throw new Error('Transporter de email no configurado');
      }

      const mailOptions = {
        from: `"MINEDUC - Sistema Documental" <${process.env.GMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email enviado exitosamente a ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Genera template HTML para emails
   */
  generateEmailTemplate({ title, message, actionUrl, actionText, userName, documentDetails }) {
    const logoUrl = process.env.LOGO_URL || 'https://your-domain.com/logo-mineduc.png';
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
        }
        .title {
            color: #1e40af;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        .message {
            font-size: 16px;
            margin-bottom: 25px;
            color: #4b5563;
        }
        .document-card {
            background: #f1f5f9;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .document-title {
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .document-info {
            font-size: 14px;
            color: #6b7280;
        }
        .urgent {
            border-left-color: #ef4444;
            background: #fef2f2;
        }
        .warning {
            border-left-color: #f59e0b;
            background: #fffbeb;
        }
        .action-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .action-button:hover {
            background: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="MINEDUC" class="logo" />
            <h1 class="title">Ministerio de Educación</h1>
            <p style="margin: 5px 0 0 0; color: #6b7280;">Sistema de Gestión Documental</p>
        </div>

        <div class="greeting">
            Hola ${userName || 'Usuario'},
        </div>

        <div class="message">
            ${message}
        </div>

        ${documentDetails ? `
        <div class="document-card ${documentDetails.urgency || ''}">
            <div class="document-title">${documentDetails.title}</div>
            <div class="document-info">
                ${documentDetails.type ? `<strong>Tipo:</strong> ${documentDetails.type}<br>` : ''}
                ${documentDetails.dueDate ? `<strong>Fecha límite:</strong> ${documentDetails.dueDate}<br>` : ''}
                ${documentDetails.status ? `<strong>Estado:</strong> ${documentDetails.status}<br>` : ''}
                ${documentDetails.description ? `<strong>Descripción:</strong> ${documentDetails.description}` : ''}
            </div>
        </div>
        ` : ''}

        ${actionUrl && actionText ? `
        <div style="text-align: center;">
            <a href="${baseUrl}${actionUrl}" class="action-button">${actionText}</a>
        </div>
        ` : ''}

        <div class="footer">
            <p>Este es un mensaje automático del Sistema de Gestión Documental de MINEDUC.</p>
            <p>Por favor, no responda a este correo. Si necesita ayuda, contacte al administrador del sistema.</p>
            <p>&copy; ${new Date().getFullYear()} Ministerio de Educación - Guatemala</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Notifica vencimiento de documento
   */
  async sendDocumentExpirationNotification({ userEmail, userName, document, daysUntilExpiration }) {
    const urgencyLevel = daysUntilExpiration <= 1 ? 'urgent' : daysUntilExpiration <= 7 ? 'warning' : '';
    const urgencyText = daysUntilExpiration <= 1 ? 'URGENTE' : daysUntilExpiration <= 7 ? 'IMPORTANTE' : '';
    
    const subject = `${urgencyText ? `[${urgencyText}] ` : ''}Documento próximo a vencer - ${document.title}`;
    
    let message;
    if (daysUntilExpiration === 0) {
      message = `Su documento <strong>"${document.title}"</strong> vence HOY. Es necesario que tome acción inmediata para renovarlo o actualizarlo.`;
    } else if (daysUntilExpiration === 1) {
      message = `Su documento <strong>"${document.title}"</strong> vence MAÑANA. Por favor, proceda con la renovación lo antes posible.`;
    } else {
      message = `Su documento <strong>"${document.title}"</strong> vencerá en ${daysUntilExpiration} días. Le recomendamos comenzar el proceso de renovación.`;
    }

    const htmlContent = this.generateEmailTemplate({
      title: subject,
      message,
      actionUrl: '/documents',
      actionText: 'Ver Documento',
      userName,
      documentDetails: {
        title: document.title,
        type: document.type,
        dueDate: new Date(document.expiration_date).toLocaleDateString('es-ES'),
        status: document.status,
        description: document.description,
        urgency: urgencyLevel
      }
    });

    const textContent = `
Hola ${userName},

${message.replace(/<[^>]*>/g, '')}

Detalles del documento:
- Título: ${document.title}
- Tipo: ${document.type}
- Fecha de vencimiento: ${new Date(document.expiration_date).toLocaleDateString('es-ES')}
- Estado: ${document.status}

Para más información, visite: ${process.env.FRONTEND_URL}/documents

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Notifica nuevo documento requerido
   */
  async sendDocumentRequiredNotification({ userEmail, userName, requirement }) {
    const subject = `Nuevo documento requerido - ${requirement.document_type}`;
    
    const message = `Se le ha asignado un nuevo documento que debe presentar: <strong>"${requirement.document_type}"</strong>`;

    const htmlContent = this.generateEmailTemplate({
      title: subject,
      message,
      actionUrl: '/documents/requirements',
      actionText: 'Ver Requerimientos',
      userName,
      documentDetails: {
        title: requirement.document_type,
        type: 'Documento Requerido',
        dueDate: new Date(requirement.required_date).toLocaleDateString('es-ES'),
        status: 'Pendiente',
        description: requirement.description
      }
    });

    const textContent = `
Hola ${userName},

${message.replace(/<[^>]*>/g, '')}

Detalles del requerimiento:
- Documento: ${requirement.document_type}
- Fecha límite: ${new Date(requirement.required_date).toLocaleDateString('es-ES')}
- Descripción: ${requirement.description || 'Sin descripción adicional'}

Para más información, visite: ${process.env.FRONTEND_URL}/documents/requirements

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Notifica cambios organizacionales
   */
  async sendOrganizationalChangeNotification({ userEmails, change }) {
    const subject = `Cambio Organizacional - ${change.title}`;
    
    const message = `Se ha realizado un cambio importante en la organización que puede afectar sus responsabilidades documentales.`;

    const htmlContent = this.generateEmailTemplate({
      title: subject,
      message: `${message}<br><br><strong>Descripción del cambio:</strong><br>${change.description}`,
      actionUrl: '/notifications',
      actionText: 'Ver Detalles',
      userName: 'Equipo',
      documentDetails: change.documents_affected ? {
        title: 'Documentos Afectados',
        description: change.documents_affected.join(', ')
      } : null
    });

    const textContent = `
Estimado equipo,

${message}

Descripción del cambio:
${change.description}

${change.documents_affected ? `Documentos afectados: ${change.documents_affected.join(', ')}` : ''}

Para más información, visite: ${process.env.FRONTEND_URL}/notifications

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    // Enviar a múltiples usuarios
    const promises = userEmails.map(email => 
      this.sendEmail({
        to: email,
        subject,
        htmlContent,
        textContent
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Envía resumen diario de notificaciones
   */
  async sendDailySummary({ userEmail, userName, summary }) {
    const subject = `Resumen Diario - ${new Date().toLocaleDateString('es-ES')}`;
    
    let message = `Aquí está su resumen diario de actividades documentales:`;
    
    if (summary.expiring_soon > 0) {
      message += `<br>• <strong>${summary.expiring_soon}</strong> documento${summary.expiring_soon > 1 ? 's' : ''} próximo${summary.expiring_soon > 1 ? 's' : ''} a vencer`;
    }
    
    if (summary.new_requirements > 0) {
      message += `<br>• <strong>${summary.new_requirements}</strong> nuevo${summary.new_requirements > 1 ? 's' : ''} requerimiento${summary.new_requirements > 1 ? 's' : ''}`;
    }
    
    if (summary.pending_approvals > 0) {
      message += `<br>• <strong>${summary.pending_approvals}</strong> documento${summary.pending_approvals > 1 ? 's' : ''} pendiente${summary.pending_approvals > 1 ? 's' : ''} de aprobación`;
    }

    if (summary.expiring_soon === 0 && summary.new_requirements === 0 && summary.pending_approvals === 0) {
      message = `¡Excelente! No tiene tareas pendientes urgentes el día de hoy.`;
    }

    const htmlContent = this.generateEmailTemplate({
      title: subject,
      message,
      actionUrl: '/dashboard',
      actionText: 'Ver Dashboard',
      userName
    });

    const textContent = `
Hola ${userName},

${message.replace(/<[^>]*>/g, '').replace(/•/g, '-')}

Para más información, visite: ${process.env.FRONTEND_URL}/dashboard

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Envía email de bienvenida a nuevo usuario
   */
  async sendWelcomeEmail({ userEmail, userName, userRole, userDepartment, loginLink }) {
    const subject = `🎉 Bienvenido al Sistema Documental MINEDUC - ${userName}`;

    const roleDisplay = {
      'admin': '👑 Administrador',
      'editor': '✏️ Editor',
      'viewer': '👀 Visor',
      'employee': '👤 Empleado'
    }[userRole] || '❓ Sin definir';

    const message = `
      ¡Te damos la bienvenida al <strong>Sistema de Gestión Documental del Ministerio de Educación</strong>!
      Tu cuenta ha sido creada exitosamente y ya puedes acceder al sistema.
      <br><br>
      <strong>📋 Detalles de tu cuenta:</strong><br>
      • Email: ${userEmail}<br>
      • Rol: ${roleDisplay}<br>
      • Departamento: ${userDepartment || 'No asignado'}<br>
      <br>
      <strong>🚀 ¿Qué puedes hacer ahora?</strong><br>
      • Acceder al sistema con tu email y la contraseña proporcionada<br>
      • Completar tu perfil con información adicional<br>
      • Comenzar a gestionar documentos según tu rol<br>
      • Recibir notificaciones automáticas sobre documentos pendientes<br>
      <br>
      <strong>⚡ Recordatorio importante:</strong><br>
      Este es un sistema oficial del Ministerio de Educación. Mantén tus credenciales seguras
      y no compartas tu acceso con otras personas.
    `;

    const htmlContent = this.generateEmailTemplate({
      title: 'Bienvenido al Sistema MINEDUC',
      message,
      actionUrl: loginLink || '/login',
      actionText: '🔐 Acceder al Sistema',
      userName,
      documentDetails: {
        title: 'Tu Nueva Cuenta',
        type: 'Información de Acceso',
        status: 'Activa',
        description: `Rol: ${roleDisplay} | Departamento: ${userDepartment || 'No asignado'}`
      }
    });

    const textContent = `
Hola ${userName},

¡Bienvenido al Sistema de Gestión Documental del MINEDUC!

Tu cuenta ha sido creada exitosamente.

Detalles de tu cuenta:
- Email: ${userEmail}
- Rol: ${roleDisplay}
- Departamento: ${userDepartment || 'No asignado'}

Accede al sistema en: ${process.env.FRONTEND_URL || 'http://localhost:5173'}${loginLink || '/login'}

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Envía recordatorio general a usuario
   */
  async sendGeneralReminder({ userEmail, userName, reminderType, customMessage }) {
    const subject = `📄 Recordatorio: ${reminderType} - Sistema MINEDUC`;

    const message = customMessage || `
      Este es un recordatorio del Sistema de Gestión Documental del MINEDUC.
      <br><br>
      Te recordamos revisar tus documentos pendientes y mantener tu información actualizada.
      <br><br>
      Si tienes alguna duda o necesitas asistencia, no dudes en contactar al administrador del sistema.
    `;

    const htmlContent = this.generateEmailTemplate({
      title: `Recordatorio: ${reminderType}`,
      message,
      actionUrl: '/documents',
      actionText: '📄 Ver Mis Documentos',
      userName
    });

    const textContent = `
Hola ${userName},

${message.replace(/<[^>]*>/g, '')}

Accede al sistema en: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/documents

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Envía notificación de documento subido exitosamente
   */
  async sendDocumentUploadConfirmation({ userEmail, userName, document }) {
    const subject = `📤 Documento Recibido: ${document.title || 'Sin título'}`;

    const message = `
      Hemos recibido tu documento <strong>"${document.title || 'Sin título'}"</strong> exitosamente.
      <br><br>
      Tu documento será revisado por nuestro equipo y recibirás una notificación con
      el resultado en los próximos días hábiles.
      <br><br>
      <strong>Gracias por utilizar el Sistema de Gestión Documental del MINEDUC.</strong>
    `;

    const htmlContent = this.generateEmailTemplate({
      title: 'Documento Recibido Exitosamente',
      message,
      actionUrl: '/documents',
      actionText: '📄 Ver Mis Documentos',
      userName,
      documentDetails: {
        title: document.title || 'Sin título',
        type: document.type || 'Documento',
        status: 'Pendiente de revisión',
        description: `Subido el ${new Date().toLocaleDateString('es-ES')} | Tamaño: ${document.file_size || 'No especificado'}`
      }
    });

    const textContent = `
Hola ${userName},

Hemos recibido tu documento "${document.title || 'Sin título'}" exitosamente.

Detalles del documento:
- Nombre: ${document.title || 'Sin título'}
- Fecha de subida: ${new Date().toLocaleDateString('es-ES')}
- Estado: Pendiente de revisión

Tu documento será revisado por nuestro equipo.

Saludos,
Sistema de Gestión Documental - MINEDUC
`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlContent,
      textContent
    });
  }

  /**
   * Genera link único y seguro para subida de documentos
   */
  generateSecureUploadLink(userId, documentTypeId) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const token = Buffer.from(`${userId}:${documentTypeId}:${timestamp}:${randomString}`).toString('base64');

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/upload/${token}`;
  }

  /**
   * Valida link de subida seguro
   */
  validateSecureUploadLink(token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('ascii');
      const [userId, documentTypeId, timestamp, randomString] = decoded.split(':');

      // Link válido por 7 días
      const linkAge = Date.now() - parseInt(timestamp);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en milliseconds

      if (linkAge > maxAge) {
        return { valid: false, reason: 'Link expirado' };
      }

      return {
        valid: true,
        userId,
        documentTypeId,
        timestamp: parseInt(timestamp)
      };

    } catch (error) {
      return { valid: false, reason: 'Link inválido' };
    }
  }

  /**
   * Verifica configuración del servicio
   */
  async verifyConfiguration() {
    try {
      if (!this.transporter) {
        console.log('⚠️ Email service not configured, running in development mode');
        return { configured: false, development: true };
      }

      await this.transporter.verify();
      console.log('✅ Configuración de email verificada correctamente');
      return { configured: true, development: false };
    } catch (error) {
      console.error('❌ Error en configuración de email:', error);
      return { configured: false, development: false, error: error.message };
    }
  }
}

module.exports = new EmailService();