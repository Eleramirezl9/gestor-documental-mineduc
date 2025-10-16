const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { supabase } = require('../config/supabase');

class EmailService {
  constructor() {
    this.initializeServices();
  }

  initializeServices() {
    // Configurar Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error(' Error: RESEND_API_KEY no está configurada');
      throw new Error('RESEND_API_KEY is required');
    }
    
    this.resend = new Resend(resendKey);
    console.log(' Resend inicializado correctamente');

    // Configurar Gmail
    const gmailConfig = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    };

    // Verificar Gmail
    const missingVars = Object.entries(gmailConfig)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.warn(' Configuración de Gmail incompleta:', missingVars.join(', '));
      this.fallbackEnabled = false;
    } else {
      this.gmailTransporter = nodemailer.createTransport({
        host: gmailConfig.host,
        port: gmailConfig.port,
        secure: false,
        auth: {
          user: gmailConfig.user,
          pass: gmailConfig.pass
        }
      });
      this.fallbackEnabled = true;
      console.log(' Gmail configurado como fallback');
    }
  }

  verifyConfiguration() {
    try {
      // Verificar Resend
      const resendConfig = {
        apiKey: Boolean(process.env.RESEND_API_KEY),
        fromEmail: Boolean(process.env.RESEND_FROM_EMAIL)
      };

      // Verificar Gmail
      const gmailConfig = {
        host: Boolean(process.env.EMAIL_HOST),
        port: Boolean(process.env.EMAIL_PORT),
        user: Boolean(process.env.GMAIL_USER),
        pass: Boolean(process.env.GMAIL_APP_PASSWORD)
      };

      return {
        resend: {
          available: resendConfig.apiKey && resendConfig.fromEmail,
          config: resendConfig
        },
        gmail: {
          available: Object.values(gmailConfig).every(val => val),
          config: gmailConfig,
          enabled: this.fallbackEnabled
        },
        status: 'ok'
      };
    } catch (error) {
      console.error('Error verificando configuración:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async sendEmail({ to, subject, htmlContent, textContent, category = 'general' }) {
    // Detectar si el destinatario es diferente al email registrado en Resend
    const resendRegisteredEmail = 'eramirezl9@miumg.edu.gt'; // Tu email de Resend
    const recipientEmail = Array.isArray(to) ? to[0] : to;
    const isDifferentRecipient = recipientEmail !== resendRegisteredEmail;

    // Si es un destinatario diferente y Gmail está disponible, usar Gmail directamente
    if (isDifferentRecipient && this.fallbackEnabled) {
      console.log('📧 Destinatario diferente detectado. Usando Gmail directamente para:', recipientEmail);

      try {
        const gmailResult = await this.gmailTransporter.sendMail({
          from: process.env.EMAIL_FROM || `"MINEDUC Sistema" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          html: htmlContent,
          text: textContent
        });

        await this.logEmailSent({
          to,
          subject,
          provider: 'gmail',
          status: 'sent',
          messageId: gmailResult.messageId,
          category
        });

        console.log('✅ Email enviado con Gmail:', gmailResult.messageId);
        return { success: true, provider: 'gmail', id: gmailResult.messageId };
      } catch (gmailError) {
        console.error('❌ Error enviando con Gmail:', gmailError.message);
        throw new Error(`Error enviando email: ${gmailError.message}`);
      }
    }

    // Si es el mismo destinatario de Resend o no hay Gmail, usar Resend
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';

      console.log('📧 Intentando enviar email con Resend desde:', fromEmail);

      const result = await this.resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html: htmlContent,
        text: textContent,
        tags: [{ name: 'category', value: category }]
      });

      await this.logEmailSent({
        to,
        subject,
        provider: 'resend',
        status: 'sent',
        messageId: result.id,
        category
      });

      return { success: true, provider: 'resend', id: result.id };
    } catch (error) {
      console.error('❌ Error enviando email con Resend:', error.message);
      console.log('🔍 Detalles del error:', error.response?.body || error);

      // Intentar con Gmail si está disponible
      if (this.fallbackEnabled) {
        console.log('🔄 Intentando con Gmail como fallback...');
        console.log('📧 Gmail configurado:', {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          user: process.env.GMAIL_USER ? '✓ Configurado' : '✗ Falta',
          pass: process.env.GMAIL_APP_PASSWORD ? '✓ Configurado' : '✗ Falta'
        });

        try {
          const fallbackResult = await this.gmailTransporter.sendMail({
            from: process.env.EMAIL_FROM || `"MINEDUC Sistema" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
            text: textContent
          });

          await this.logEmailSent({
            to,
            subject,
            provider: 'gmail',
            status: 'sent',
            messageId: fallbackResult.messageId,
            category
          });

          console.log('✅ Email enviado con Gmail (fallback):', fallbackResult.messageId);
          return { success: true, provider: 'gmail', id: fallbackResult.messageId, fallback: true };
        } catch (fallbackError) {
          console.error('❌ Error enviando email con Gmail:', fallbackError.message);
          console.log('🔍 Detalles del error de Gmail:', fallbackError);

          await this.logEmailSent({
            to,
            subject,
            provider: 'gmail',
            status: 'failed',
            error: fallbackError.message,
            category
          });

          throw new Error(`Ambos proveedores fallaron. Resend: ${error.message} | Gmail: ${fallbackError.message}`);
        }
      } else {
        console.log('⚠️ Fallback a Gmail no está habilitado. Verifica la configuración de Gmail en .env');
      }

      await this.logEmailSent({
        to,
        subject,
        provider: 'resend',
        status: 'failed',
        error: error.message,
        category
      });

      throw new Error('Error enviando email');
    }
  }

  async logEmailSent({ to, subject, provider, status, messageId, error, category }) {
    try {
      await supabase.from('email_logs').insert({
        recipient: to,
        subject,
        provider,
        status,
        message_id: messageId,
        error_message: error,
        category,
        sent_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error registrando email:', logError);
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
   * Envía notificación de vencimiento de documento
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
      textContent,
      category: 'document_expiration'
    });
  }

  /**
   * Envía notificación de documento requerido
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
      textContent,
      category: 'document_required'
    });
  }

  /**
   * Envía notificación de cambio organizacional
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
        textContent,
        category: 'organizational_change'
      })
    );

    return await Promise.all(promises);
  }
}

module.exports = new EmailService();
