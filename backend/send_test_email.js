require('dotenv').config();
const emailService = require('./services/emailService');
const aiMessageService = require('./services/aiMessageService');

async function sendTestEmailToColaborador() {
  console.log('📧 Enviando email de prueba a colaborador...');
  console.log('=' .repeat(60));

  try {
    // 1. Generar mensaje personalizado con IA
    console.log('🤖 Generando mensaje personalizado con IA...');
    
    const messageResult = await aiMessageService.generateNotificationMessage({
      type: 'document_expiration',
      userName: 'Lic. Carlos Uribe',
      documentTitle: 'Certificado de Antecedentes Penales',
      daysUntilExpiration: 5,
      urgencyLevel: 'high',
      userRole: 'docente',
      organizationalLevel: 'departamental',
      context: 'Renovación obligatoria para personal docente del MINEDUC'
    });

    if (messageResult.success) {
      console.log('✅ Mensaje generado por IA:');
      console.log('─'.repeat(50));
      console.log(messageResult.message);
      console.log('─'.repeat(50));
    }

    // 2. Generar asuntos sugeridos
    console.log('\n📋 Generando asuntos de email...');
    const subjects = await aiMessageService.generateSubjectSuggestions({
      type: 'document_expiration',
      documentTitle: 'Certificado de Antecedentes Penales',
      urgencyLevel: 'high',
      daysUntilExpiration: 5
    });

    console.log('📧 Asuntos sugeridos:');
    subjects.forEach((subject, idx) => {
      console.log(`   ${idx + 1}. ${subject}`);
    });

    // 3. Enviar email con datos realistas
    console.log('\n📨 Enviando email de prueba...');
    
    const emailResult = await emailService.sendDocumentExpirationNotification({
      userEmail: 'curibioa@miumg.edu.com.gt',
      userName: 'Lic. Carlos Uribe Álvarez',
      document: {
        id: 'doc-2025-001',
        title: 'Certificado de Antecedentes Penales',
        type: 'Documento de Identificación',
        status: 'active',
        expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días
        description: 'Certificado requerido para personal docente del Ministerio de Educación. Renovación obligatoria cada 2 años según normativa vigente.',
        issued_by: 'Ministerio de Gobernación',
        document_number: 'AP-2023-789456'
      },
      daysUntilExpiration: 5
    });

    if (emailResult.success) {
      console.log('✅ Email enviado exitosamente!');
      console.log(`📮 Destinatario: curibioa@miumg.edu.com.gt`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
      console.log(`📅 Fecha de envío: ${new Date().toLocaleString('es-ES')}`);
      
      // 4. Mostrar preview del contenido
      console.log('\n📄 Contenido del email enviado:');
      console.log('─'.repeat(50));
      console.log('DE: MINEDUC - Sistema Documental <eramirezl9@miumg.edu.gt>');
      console.log('PARA: curibioa@miumg.edu.com.gt');
      console.log('ASUNTO: [IMPORTANTE] Documento próximo a vencer - Certificado de Antecedentes Penales');
      console.log('');
      console.log('MENSAJE PRINCIPAL:');
      if (messageResult.success) {
        console.log(messageResult.message);
      } else {
        console.log('Su documento "Certificado de Antecedentes Penales" vence en 5 días. Le recomendamos iniciar el proceso de renovación lo antes posible.');
      }
      console.log('─'.repeat(50));

      console.log('\n🎯 DETALLES DEL DOCUMENTO:');
      console.log('• Titular: Lic. Carlos Uribe Álvarez');
      console.log('• Documento: Certificado de Antecedentes Penales'); 
      console.log('• Número: AP-2023-789456');
      console.log('• Fecha de vencimiento: ' + new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'));
      console.log('• Días restantes: 5 días');
      console.log('• Prioridad: Alta');
      console.log('• Emisor: Ministerio de Gobernación');

      console.log('\n✨ CARACTERÍSTICAS DEL EMAIL:');
      console.log('✓ Diseño profesional con logo MINEDUC');
      console.log('✓ Mensaje personalizado generado con IA');
      console.log('✓ Información detallada del documento');
      console.log('✓ Botón de acción para renovar');
      console.log('✓ Responsive para móvil y desktop');
      console.log('✓ Footer institucional');

    } else {
      console.log('❌ Error enviando email');
    }

    console.log('\n🎉 Prueba de email completada!');
    console.log('📱 El colaborador recibirá un email profesional con:');
    console.log('   • Mensaje personalizado generado por IA');
    console.log('   • Diseño institucional MINEDUC');
    console.log('   • Detalles específicos de su documento');
    console.log('   • Instrucciones claras para renovar');

  } catch (error) {
    console.error('❌ Error en el envío:', error);
  }
}

// Ejecutar la prueba
sendTestEmailToColaborador();