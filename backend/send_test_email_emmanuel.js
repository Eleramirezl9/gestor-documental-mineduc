require('dotenv').config();
const emailService = require('./services/emailService');
const aiMessageService = require('./services/aiMessageService');

async function sendTestEmailToEmmanuel() {
  console.log('📧 Enviando email de prueba a Emmanuel...');
  console.log('=' .repeat(60));

  try {
    // 1. Generar mensaje personalizado con IA (documento URGENTE - 1 día)
    console.log('🤖 Generando mensaje URGENTE con IA...');
    
    const messageResult = await aiMessageService.generateNotificationMessage({
      type: 'document_expiration',
      userName: 'Emmanuel Uribe',
      documentTitle: 'Licencia de Enseñanza',
      daysUntilExpiration: 1,
      urgencyLevel: 'urgent',
      userRole: 'coordinador',
      organizationalLevel: 'regional',
      context: 'Documento crítico para autorización de enseñanza. Vencimiento mañana requiere acción inmediata.'
    });

    if (messageResult.success) {
      console.log('✅ Mensaje URGENTE generado por IA:');
      console.log('─'.repeat(50));
      console.log(messageResult.message);
      console.log('─'.repeat(50));
    }

    // 2. Generar asuntos sugeridos para urgente
    console.log('\n📋 Generando asuntos URGENTES...');
    const subjects = await aiMessageService.generateSubjectSuggestions({
      type: 'document_expiration',
      documentTitle: 'Licencia de Enseñanza',
      urgencyLevel: 'urgent',
      daysUntilExpiration: 1
    });

    console.log('🚨 Asuntos URGENTES sugeridos:');
    subjects.forEach((subject, idx) => {
      console.log(`   ${idx + 1}. ${subject}`);
    });

    // 3. Enviar email URGENTE
    console.log('\n🚨 Enviando email URGENTE...');
    
    const emailResult = await emailService.sendDocumentExpirationNotification({
      userEmail: 'uribioemmanuel15@gmail.com',
      userName: 'Emmanuel Uribe González',
      document: {
        id: 'doc-2025-urg-002',
        title: 'Licencia de Enseñanza Nivel Medio',
        type: 'Licencia Profesional',
        status: 'active',
        expiration_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // MAÑANA!
        description: 'Licencia que autoriza la enseñanza en nivel medio. Renovación obligatoria antes del vencimiento para mantener autorización docente.',
        issued_by: 'Dirección General de Acreditación y Certificación - DIGEACE',
        document_number: 'LE-2023-4567',
        category: 'Matemáticas y Ciencias',
        validity_period: '2 años'
      },
      daysUntilExpiration: 1
    });

    if (emailResult.success) {
      console.log('✅ Email URGENTE enviado exitosamente!');
      console.log(`📮 Destinatario: uribioemmanuel15@gmail.com`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
      console.log(`⏰ Fecha de envío: ${new Date().toLocaleString('es-ES')}`);
      
      // 4. Mostrar preview del contenido URGENTE
      console.log('\n🚨 CONTENIDO DEL EMAIL URGENTE:');
      console.log('─'.repeat(50));
      console.log('DE: MINEDUC - Sistema Documental <eramirezl9@miumg.edu.gt>');
      console.log('PARA: uribioemmanuel15@gmail.com');
      console.log('ASUNTO: [URGENTE] Licencia de Enseñanza vence MAÑANA - Acción Inmediata Requerida');
      console.log('PRIORIDAD: 🚨 URGENTE');
      console.log('');
      console.log('MENSAJE PRINCIPAL:');
      if (messageResult.success) {
        console.log(messageResult.message);
      } else {
        console.log('URGENTE: Su documento "Licencia de Enseñanza" vence MAÑANA. Es necesario que proceda con la renovación inmediatamente.');
      }
      console.log('─'.repeat(50));

      console.log('\n🎯 DETALLES DEL DOCUMENTO URGENTE:');
      console.log('• Titular: Emmanuel Uribe González');
      console.log('• Cargo: Coordinador Regional');
      console.log('• Documento: Licencia de Enseñanza Nivel Medio'); 
      console.log('• Especialidad: Matemáticas y Ciencias');
      console.log('• Número: LE-2023-4567');
      console.log('• ⚠️ VENCE: ' + new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES') + ' (MAÑANA)');
      console.log('• 🚨 Días restantes: 1 DÍA');
      console.log('• 🔴 Prioridad: URGENTE');
      console.log('• Emisor: DIGEACE');
      console.log('• Vigencia: 2 años');

      console.log('\n⚡ CARACTERÍSTICAS ESPECIALES DEL EMAIL URGENTE:');
      console.log('🚨 Diseño con alertas rojas para urgencia');
      console.log('⚠️ Mensaje generado por IA con tono urgente');
      console.log('🎯 Información crítica destacada');
      console.log('🔴 Botón de acción prioritario');
      console.log('📱 Notificación push style');
      console.log('⏰ Indicadores de tiempo restante');

      // 5. Simular diferentes niveles de urgencia
      console.log('\n📊 COMPARACIÓN DE URGENCIA:');
      console.log('┌─────────────────┬──────────────┬─────────────┐');
      console.log('│ Días Restantes  │ Prioridad    │ Color       │');
      console.log('├─────────────────┼──────────────┼─────────────┤');
      console.log('│ 0-1 días        │ 🚨 URGENTE   │ 🔴 Rojo     │ ← ESTE EMAIL');
      console.log('│ 2-7 días        │ ⚠️ ALTA      │ 🟠 Naranja  │');
      console.log('│ 8-30 días       │ 📋 MEDIA     │ 🟡 Amarillo │');
      console.log('│ 30+ días        │ ℹ️ BAJA      │ 🟢 Verde    │');
      console.log('└─────────────────┴──────────────┴─────────────┘');

    } else {
      console.log('❌ Error enviando email urgente');
    }

    console.log('\n🎉 Prueba de email URGENTE completada!');
    console.log('📱 Emmanuel recibirá un email con máxima prioridad:');
    console.log('   🚨 Diseño de alerta urgente');
    console.log('   ⚠️ Mensaje personalizado por IA');
    console.log('   🎯 Información crítica destacada');
    console.log('   ⏰ Indicación clara de tiempo restante');
    console.log('   🔴 Botones de acción prioritarios');

    // 6. Generar mensaje de mejora para mostrar versatilidad de IA
    console.log('\n🧠 MOSTRANDO VERSATILIDAD DE IA...');
    console.log('Generando versión más amigable del mismo mensaje:');
    
    const improvedMessage = await aiMessageService.improveMessage(
      messageResult.message || 'Su licencia vence mañana', 
      'friendlier'
    );
    
    console.log('✨ Versión más amigable:');
    console.log('─'.repeat(40));
    console.log(improvedMessage);
    console.log('─'.repeat(40));

  } catch (error) {
    console.error('❌ Error en el envío:', error);
  }
}

// Ejecutar la prueba
sendTestEmailToEmmanuel();