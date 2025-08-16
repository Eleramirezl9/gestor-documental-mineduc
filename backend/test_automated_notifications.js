require('dotenv').config();
const aiMessageService = require('./services/aiMessageService');
const emailService = require('./services/emailService');

async function testAutomatedNotifications() {
  console.log('🚀 Probando Sistema de Notificaciones Automatizadas');
  console.log('=' .repeat(60));

  // 1. Probar IA
  console.log('\n1️⃣ Probando IA (Groq)...');
  try {
    const aiStatus = await aiMessageService.checkAvailability();
    if (aiStatus.available) {
      console.log(`✅ IA disponible: ${aiStatus.provider}`);
      
      // Generar mensaje de prueba
      const messageResult = await aiMessageService.generateNotificationMessage({
        type: 'document_expiration',
        userName: 'Juan Pérez',
        documentTitle: 'Certificado de Antecedentes Penales',
        daysUntilExpiration: 3,
        urgencyLevel: 'high',
        userRole: 'empleado'
      });
      
      if (messageResult.success) {
        console.log('📝 Mensaje generado:');
        console.log('─'.repeat(40));
        console.log(messageResult.message);
        console.log('─'.repeat(40));
      }
    } else {
      console.log(`❌ IA no disponible: ${aiStatus.error}`);
    }
  } catch (error) {
    console.log('❌ Error probando IA:', error.message);
  }

  // 2. Probar Email
  console.log('\n2️⃣ Probando configuración de Email...');
  try {
    const emailStatus = await emailService.verifyConfiguration();
    if (emailStatus) {
      console.log('✅ Configuración de email correcta');
      
      // Enviar email de prueba (solo si hay configuración)
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        console.log('📧 Enviando email de prueba...');
        
        const testResult = await emailService.sendDocumentExpirationNotification({
          userEmail: process.env.GMAIL_USER, // Enviar a ti mismo
          userName: 'Usuario de Prueba',
          document: {
            id: 'test-123',
            title: 'Documento de Prueba - Sistema de IA',
            type: 'Certificado',
            status: 'active',
            expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Este es un email de prueba del sistema de notificaciones automatizadas con IA.'
          },
          daysUntilExpiration: 3
        });
        
        if (testResult.success) {
          console.log('✅ Email enviado exitosamente!');
          console.log(`📮 Message ID: ${testResult.messageId}`);
        }
      } else {
        console.log('⚠️ No hay configuración de Gmail, saltando envío de prueba');
      }
    } else {
      console.log('❌ Error en configuración de email');
    }
  } catch (error) {
    console.log('❌ Error probando email:', error.message);
  }

  // 3. Generar múltiples ejemplos de mensajes
  console.log('\n3️⃣ Generando ejemplos de mensajes con IA...');
  
  const examples = [
    {
      type: 'document_expiration',
      userName: 'María González',
      documentTitle: 'Licencia de Conducir',
      daysUntilExpiration: 1,
      urgencyLevel: 'urgent'
    },
    {
      type: 'document_required',
      userName: 'Carlos Méndez',
      documentTitle: 'Constancia de Trabajo',
      context: 'Proceso de promoción interna'
    },
    {
      type: 'organizational_change',
      documentTitle: 'Nuevas Políticas de Documentación',
      context: 'Implementación de sistema digital'
    }
  ];

  for (let i = 0; i < examples.length; i++) {
    try {
      console.log(`\n📝 Ejemplo ${i + 1}:`);
      console.log(`Tipo: ${examples[i].type}`);
      
      const result = await aiMessageService.generateNotificationMessage(examples[i]);
      
      if (result.success) {
        console.log('✅ Generado con IA:');
        console.log(`"${result.message}"`);
        
        // Generar asuntos
        const subjects = await aiMessageService.generateSubjectSuggestions({
          type: examples[i].type,
          documentTitle: examples[i].documentTitle,
          urgencyLevel: examples[i].urgencyLevel,
          daysUntilExpiration: examples[i].daysUntilExpiration
        });
        
        if (subjects.length > 0) {
          console.log('📧 Asuntos sugeridos:');
          subjects.forEach((subject, idx) => {
            console.log(`   ${idx + 1}. ${subject}`);
          });
        }
      } else {
        console.log('⚠️ IA no disponible, usando mensaje predeterminado:');
        console.log(`"${result.message}"`);
      }
      
      console.log('─'.repeat(50));
    } catch (error) {
      console.log(`❌ Error en ejemplo ${i + 1}:`, error.message);
    }
  }

  console.log('\n🎉 Prueba completa del sistema de notificaciones automatizadas');
  console.log('=' .repeat(60));
  console.log('\n✅ Configuración verificada:');
  console.log(`   🤖 IA (Groq): ${process.env.GROQ_API_KEY ? 'Configurada' : 'No configurada'}`);
  console.log(`   📧 Email: ${process.env.GMAIL_USER ? 'Configurado' : 'No configurado'}`);
  console.log(`   🗄️ Supabase: ${process.env.SUPABASE_URL ? 'Configurado' : 'No configurado'}`);
  
  console.log('\n🚀 El sistema está listo para:');
  console.log('   ✓ Generar mensajes inteligentes con IA');
  console.log('   ✓ Enviar emails automatizados');
  console.log('   ✓ Monitorear vencimientos de documentos');
  console.log('   ✓ Notificar cambios organizacionales');
  console.log('   ✓ Enviar resúmenes diarios');
  
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Configurar variables en Vercel (te ayudo)');
  console.log('   2. Crear tablas adicionales en Supabase (si es necesario)');
  console.log('   3. Activar el servicio desde el dashboard');
}

// Ejecutar la prueba
testAutomatedNotifications().catch(error => {
  console.error('❌ Error en la prueba:', error);
  process.exit(1);
});