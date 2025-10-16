require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  try {
    console.log('Configuración del servicio:', {
      resendKey: process.env.RESEND_API_KEY ? '***configurado***' : 'no configurado',
      resendFrom: process.env.RESEND_FROM_EMAIL,
      gmailUser: process.env.GMAIL_USER,
      supabaseUrl: process.env.SUPABASE_URL
    });

    // Enviar email de prueba
    const result = await emailService.sendEmail({
      to: 'eddyramirez150@gmail.com',
      subject: 'Test de Sistema de Notificaciones',
      htmlContent: '<h1>¡Hola!</h1><p>Este es un email de prueba del sistema de notificaciones.</p>',
      textContent: 'Hola! Este es un email de prueba del sistema de notificaciones.',
      category: 'test'
    });

    console.log('Email enviado:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmail();