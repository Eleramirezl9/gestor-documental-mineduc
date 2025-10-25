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
    const recipientEmail = Array.isArray(to) ? to[0] : to;

    // IMPORTANTE: En producción (Render), SMTP está bloqueado, usar Resend
    // Gmail solo funciona en desarrollo local
    const isProduction = process.env.NODE_ENV === 'production';
    const useGmailByDefault = !isProduction && this.fallbackEnabled;

    if (useGmailByDefault && this.fallbackEnabled) {
      console.log('📧 Usando Gmail como proveedor principal para:', recipientEmail);

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
        console.error('📋 Detalles completos:', gmailError);

        await this.logEmailSent({
          to,
          subject,
          provider: 'gmail',
          status: 'failed',
          error: gmailError.message,
          category
        });

        throw new Error(`Error enviando email con Gmail: ${gmailError.message}`);
      }
    }

    // Usar Resend en producción (Gmail está bloqueado en Render)
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || 'eramirezl9@miumg.edu.gt';

      console.log('📧 Enviando con Resend desde:', fromEmail);

      // Solo advertir si el destinatario no es el email verificado
      if (recipientEmail !== verifiedEmail && fromEmail.includes('onboarding@resend.dev')) {
        console.warn(`⚠️ Resend sandbox solo puede enviar a ${verifiedEmail}. Email a ${recipientEmail} puede no llegar.`);
        console.warn('💡 Solución: Verifica un dominio en https://resend.com/domains');
      }

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

  /**
   * Envía email de bienvenida a nuevo empleado
   */
  async sendWelcomeEmail({ employeeEmail, employeeName, employeeCode, position, department }) {
    const subject = '¡Bienvenido al Sistema de Gestión Documental del MINEDUC!';

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenida MINEDUC</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                    <!-- Header con gradiente -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                ¡Bienvenido a MINEDUC!
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                Sistema de Gestión Documental
                            </p>
                        </td>
                    </tr>

                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937; font-weight: 600;">
                                Estimado/a ${employeeName},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                Es un placer darle la bienvenida al Ministerio de Educación de Guatemala. A partir de hoy, forma parte de nuestro equipo comprometido con la excelencia educativa del país.
                            </p>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                Hemos registrado su información en nuestro Sistema de Gestión Documental, donde podrá consultar y gestionar toda su documentación laboral de manera segura y eficiente.
                            </p>

                            <!-- Tarjeta de información del empleado -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; padding: 20px; margin: 0 0 30px 0; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 600;">
                                            📋 Su Información
                                        </h3>
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151;">
                                                    <strong style="color: #1f2937;">Código de Empleado:</strong>
                                                </td>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151; text-align: right;">
                                                    <code style="background: white; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #3b82f6; font-weight: 600;">
                                                        ${employeeCode}
                                                    </code>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151;">
                                                    <strong style="color: #1f2937;">Cargo:</strong>
                                                </td>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151; text-align: right;">
                                                    ${position || 'No especificado'}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151;">
                                                    <strong style="color: #1f2937;">Departamento:</strong>
                                                </td>
                                                <td style="padding: 8px 0; font-size: 15px; color: #374151; text-align: right;">
                                                    ${department || 'No especificado'}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Sección de información importante -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: #fef3c7; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                                            ℹ️ Información Importante
                                        </h3>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f;">
                                            A través de nuestro sistema recibirá notificaciones automáticas sobre documentos requeridos, fechas de vencimiento y actualizaciones importantes.
                                            <strong>Guarde su código de empleado</strong> (${employeeCode}) ya que lo necesitará para consultas futuras.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Qué esperar -->
                            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                                📬 ¿Qué puede esperar de este sistema?
                            </h3>

                            <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                                <li style="margin-bottom: 8px;">Notificaciones automáticas sobre documentos próximos a vencer</li>
                                <li style="margin-bottom: 8px;">Recordatorios de documentación requerida</li>
                                <li style="margin-bottom: 8px;">Seguimiento del estado de sus documentos</li>
                                <li style="margin-bottom: 8px;">Acceso seguro a su expediente digital</li>
                                <li>Comunicación directa con el departamento de Recursos Humanos</li>
                            </ul>

                            <!-- Contacto -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                                            📞 ¿Necesita ayuda?
                                        </h3>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                                            Si tiene alguna pregunta o necesita asistencia, no dude en contactar al Departamento de Recursos Humanos del MINEDUC. Estamos aquí para apoyarle en todo momento.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                Le deseamos mucho éxito en su nueva posición y esperamos que su experiencia en el MINEDUC sea enriquecedora y productiva.
                            </p>

                            <p style="margin: 20px 0 0 0; font-size: 16px; color: #4b5563;">
                                <strong>Atentamente,</strong><br>
                                <span style="color: #1e40af; font-weight: 600;">Ministerio de Educación de Guatemala</span><br>
                                <span style="font-size: 14px; color: #6b7280;">Departamento de Recursos Humanos</span>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; line-height: 1.6;">
                                Este es un mensaje automático del Sistema de Gestión Documental del MINEDUC.<br>
                                Por favor, no responda a este correo.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Ministerio de Educación - Guatemala<br>
                                Todos los derechos reservados
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const textContent = `
¡Bienvenido/a al MINEDUC!

Estimado/a ${employeeName},

Es un placer darle la bienvenida al Ministerio de Educación de Guatemala. A partir de hoy, forma parte de nuestro equipo comprometido con la excelencia educativa del país.

SU INFORMACIÓN:
- Código de Empleado: ${employeeCode}
- Cargo: ${position || 'No especificado'}
- Departamento: ${department || 'No especificado'}

INFORMACIÓN IMPORTANTE:
A través de nuestro sistema recibirá notificaciones automáticas sobre documentos requeridos, fechas de vencimiento y actualizaciones importantes. Guarde su código de empleado (${employeeCode}) ya que lo necesitará para consultas futuras.

¿QUÉ PUEDE ESPERAR DE ESTE SISTEMA?
- Notificaciones automáticas sobre documentos próximos a vencer
- Recordatorios de documentación requerida
- Seguimiento del estado de sus documentos
- Acceso seguro a su expediente digital
- Comunicación directa con el departamento de Recursos Humanos

¿NECESITA AYUDA?
Si tiene alguna pregunta o necesita asistencia, no dude en contactar al Departamento de Recursos Humanos del MINEDUC.

Le deseamos mucho éxito en su nueva posición.

Atentamente,
Ministerio de Educación de Guatemala
Departamento de Recursos Humanos

---
Este es un mensaje automático. Por favor, no responda a este correo.
© ${new Date().getFullYear()} Ministerio de Educación - Guatemala
    `;

    try {
      const result = await this.sendEmail({
        to: employeeEmail,
        subject,
        htmlContent,
        textContent,
        category: 'employee_welcome'
      });

      console.log(`✅ Email de bienvenida enviado a ${employeeName} (${employeeEmail})`);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando email de bienvenida a ${employeeEmail}:`, error);
      throw error;
    }
  }

  /**
   * Envía email con enlace del portal del empleado para subir documentos
   */
  async sendEmployeePortalLink({
    employeeEmail,
    employeeName,
    portalUrl,
    requestedDocuments = [],
    dueDate
  }) {
    const subject = 'Documentos Solicitados - Portal del Empleado MINEDUC';

    const documentList = requestedDocuments.map(doc =>
      `<li style="margin-bottom: 8px;">
        <strong>${doc.document_type}</strong>
        ${doc.priority ? ` - <span style="color: ${doc.priority === 'urgente' ? '#dc2626' : doc.priority === 'alta' ? '#ea580c' : '#059669'}; font-weight: 500;">${doc.priority.toUpperCase()}</span>` : ''}
        ${doc.notes ? `<br><span style="font-size: 13px; color: #6b7280;">${doc.notes}</span>` : ''}
      </li>`
    ).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentos Solicitados</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                                📄 Documentos Solicitados
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 14px;">
                                Ministerio de Educación - Guatemala
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                                Estimado/a <strong>${employeeName}</strong>,
                            </p>

                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #374151; line-height: 1.7;">
                                Se han solicitado los siguientes documentos para completar su expediente:
                            </p>

                            <ul style="margin: 0 0 30px 0; padding-left: 20px; font-size: 14px; color: #374151; line-height: 1.8;">
                                ${documentList}
                            </ul>

                            ${dueDate ? `
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    <strong>📅 Fecha límite:</strong> ${new Date(dueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            ` : ''}

                            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af; font-weight: 600;">
                                    🔗 Acceda a su portal personalizado:
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                    Haga clic en el botón de abajo para acceder a su portal donde podrá:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a;">
                                    <li>Ver los documentos solicitados</li>
                                    <li>Subir sus documentos de forma segura</li>
                                    <li>Consultar el estado de sus envíos</li>
                                    <li>Enviar mensajes al administrador</li>
                                </ul>
                            </div>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${portalUrl}"
                                           style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                                                  color: white; text-decoration: none; padding: 16px 40px;
                                                  border-radius: 8px; font-weight: 600; font-size: 15px;
                                                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                            🚀 Acceder a Mi Portal
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin-top: 25px;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151; font-weight: 600;">
                                    🔒 Información Importante:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #6b7280; line-height: 1.7;">
                                    <li>Este enlace es personal e intransferible</li>
                                    <li>Válido por 30 días desde su emisión</li>
                                    <li>Solo usted puede acceder a sus documentos</li>
                                    <li>Los archivos deben ser PDF, JPG, PNG, DOC o DOCX (máx. 10MB)</li>
                                </ul>
                            </div>

                            <p style="margin: 25px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
                                Si tiene alguna pregunta o problema para acceder al portal, puede enviar un mensaje
                                directamente desde el portal o contactar al departamento de recursos humanos.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                                Este es un mensaje automático del Sistema de Gestión Documental del MINEDUC.<br>
                                Por favor, no responda a este correo.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Ministerio de Educación - Guatemala
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const documentListText = requestedDocuments.map(doc =>
      `- ${doc.document_type}${doc.priority ? ` (${doc.priority.toUpperCase()})` : ''}${doc.notes ? `\n  ${doc.notes}` : ''}`
    ).join('\n');

    const textContent = `
DOCUMENTOS SOLICITADOS

Estimado/a ${employeeName},

Se han solicitado los siguientes documentos para completar su expediente:

${documentListText}

${dueDate ? `Fecha límite: ${new Date(dueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}

ACCEDA A SU PORTAL PERSONALIZADO:
${portalUrl}

En su portal podrá:
- Ver los documentos solicitados
- Subir sus documentos de forma segura
- Consultar el estado de sus envíos
- Enviar mensajes al administrador

INFORMACIÓN IMPORTANTE:
- Este enlace es personal e intransferible
- Válido por 30 días desde su emisión
- Solo usted puede acceder a sus documentos
- Los archivos deben ser PDF, JPG, PNG, DOC o DOCX (máx. 10MB)

Si tiene alguna pregunta, puede enviar un mensaje desde el portal.

---
Este es un mensaje automático. Por favor, no responda a este correo.
© ${new Date().getFullYear()} Ministerio de Educación - Guatemala
    `;

    try {
      const result = await this.sendEmail({
        to: employeeEmail,
        subject,
        htmlContent,
        textContent,
        category: 'employee_portal'
      });

      console.log(`✅ Email de portal enviado a ${employeeName} (${employeeEmail})`);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando email de portal a ${employeeEmail}:`, error);
      throw error;
    }
  }
}

module.exports = new EmailService();
