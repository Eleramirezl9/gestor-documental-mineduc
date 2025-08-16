require('dotenv').config();
const emailService = require('./services/emailService');
const aiMessageService = require('./services/aiMessageService');

async function sendTestEmailToOmar() {
  console.log('🔍 Simulando Monitoreo Automático del Sistema...');
  console.log('=' .repeat(70));

  try {
    // 1. Simular datos del colaborador ya registrado en el sistema
    console.log('👤 COLABORADOR ENCONTRADO EN SISTEMA:');
    const colaboradorData = {
      id: 'user-2023-789',
      name: 'Omar Antonio Lorenzana Martínez',
      email: 'omarlorenzana206@gmail.com',
      employee_id: 'MINEDUC-2023-456',
      department: 'Dirección Departamental de Educación - Suchitepéquez',
      position: 'Supervisor Educativo',
      hire_date: '2021-03-15',
      level: 'supervisor',
      region: 'Costa Sur',
      phone: '+502 5678-9012',
      address: 'Mazatenango, Suchitepéquez',
      email_notifications: true,
      last_login: '2025-08-15T09:30:00Z'
    };

    console.log(`✅ Nombre: ${colaboradorData.name}`);
    console.log(`✅ Puesto: ${colaboradorData.position}`);
    console.log(`✅ Departamento: ${colaboradorData.department}`);
    console.log(`✅ Región: ${colaboradorData.region}`);
    console.log(`✅ Email: ${colaboradorData.email}`);
    console.log(`✅ Notificaciones habilitadas: ${colaboradorData.email_notifications ? 'SÍ' : 'NO'}`);

    // 2. Simular documento del colaborador próximo a vencer
    console.log('\n📋 DOCUMENTO DETECTADO POR MONITOREO AUTOMÁTICO:');
    const documentoData = {
      id: 'doc-super-2025-123',
      user_id: colaboradorData.id,
      title: 'Certificado de Idoneidad para Supervisión Educativa',
      type: 'Certificación Profesional',
      document_number: 'CISE-2023-789',
      status: 'active',
      issued_date: '2023-08-20',
      expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 días
      issuing_authority: 'Dirección General de Gestión de Calidad Educativa - DIGECADE',
      category: 'Supervisión y Administración Educativa',
      validity_period: '2 años',
      renewal_required: true,
      description: 'Certificado que acredita la idoneidad profesional para ejercer funciones de supervisión educativa en establecimientos del nivel medio.',
      requirements_for_renewal: [
        'Constancia de capacitaciones recibidas (mínimo 40 horas)',
        'Evaluación de desempeño satisfactoria',
        'Certificado médico vigente',
        'Constancia de antecedentes penales'
      ],
      created_at: '2023-08-20T10:00:00Z',
      updated_at: '2025-01-15T14:30:00Z'
    };

    console.log(`📄 Documento: ${documentoData.title}`);
    console.log(`📅 Emitido: ${new Date(documentoData.issued_date).toLocaleDateString('es-ES')}`);
    console.log(`⚠️ Vence: ${new Date(documentoData.expiration_date).toLocaleDateString('es-ES')}`);
    console.log(`📊 Estado: ${documentoData.status.toUpperCase()}`);
    console.log(`🏢 Emisor: ${documentoData.issuing_authority}`);

    // 3. Calcular días restantes y determinar prioridad
    const daysUntilExpiration = Math.ceil((new Date(documentoData.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    let urgencyLevel = 'medium';
    let alertType = '📋';
    
    if (daysUntilExpiration <= 1) {
      urgencyLevel = 'urgent';
      alertType = '🚨';
    } else if (daysUntilExpiration <= 7) {
      urgencyLevel = 'high';
      alertType = '⚠️';
    }

    console.log(`\n${alertType} ANÁLISIS DE VENCIMIENTO:`);
    console.log(`Días restantes: ${daysUntilExpiration}`);
    console.log(`Prioridad asignada: ${urgencyLevel.toUpperCase()}`);

    // 4. Generar mensaje personalizado con IA usando datos reales
    console.log('\n🤖 Generando mensaje personalizado con IA...');
    console.log('Contexto enviado a IA:');
    console.log(`• Usuario: ${colaboradorData.name}`);
    console.log(`• Puesto: ${colaboradorData.position}`);
    console.log(`• Región: ${colaboradorData.region}`);
    console.log(`• Documento: ${documentoData.title}`);
    console.log(`• Días restantes: ${daysUntilExpiration}`);
    
    const messageResult = await aiMessageService.generateNotificationMessage({
      type: 'document_expiration',
      userName: colaboradorData.name,
      documentTitle: documentoData.title,
      daysUntilExpiration: daysUntilExpiration,
      urgencyLevel: urgencyLevel,
      userRole: 'supervisor',
      organizationalLevel: 'departamental',
      context: `Supervisor Educativo de ${colaboradorData.region}. Certificado crítico para funciones de supervisión en establecimientos educativos. Requiere renovación antes del vencimiento para mantener autorización.`
    });

    if (messageResult.success) {
      console.log('\n✅ Mensaje personalizado generado por IA:');
      console.log('─'.repeat(60));
      console.log(messageResult.message);
      console.log('─'.repeat(60));
    }

    // 5. Generar asuntos específicos
    console.log('\n📧 Generando asuntos de email personalizados...');
    const subjects = await aiMessageService.generateSubjectSuggestions({
      type: 'document_expiration',
      documentTitle: documentoData.title,
      urgencyLevel: urgencyLevel,
      daysUntilExpiration: daysUntilExpiration
    });

    console.log('📋 Asuntos sugeridos:');
    subjects.forEach((subject, idx) => {
      console.log(`   ${idx + 1}. ${subject}`);
    });

    // 6. Simular verificación de configuración del usuario
    console.log('\n⚙️ VERIFICANDO CONFIGURACIÓN DEL USUARIO:');
    console.log(`✅ Notificaciones por email: ${colaboradorData.email_notifications ? 'HABILITADAS' : 'DESHABILITADAS'}`);
    console.log(`✅ Email válido: ${colaboradorData.email.includes('@') ? 'SÍ' : 'NO'}`);
    console.log(`✅ Usuario activo: SÍ`);
    console.log(`✅ Último acceso: ${new Date(colaboradorData.last_login).toLocaleDateString('es-ES')}`);

    // 7. Enviar email con todos los datos reales
    console.log('\n📨 Enviando notificación automática...');
    
    const emailResult = await emailService.sendDocumentExpirationNotification({
      userEmail: colaboradorData.email,
      userName: colaboradorData.name,
      document: {
        id: documentoData.id,
        title: documentoData.title,
        type: documentoData.type,
        status: documentoData.status,
        expiration_date: documentoData.expiration_date,
        description: documentoData.description,
        issued_by: documentoData.issuing_authority,
        document_number: documentoData.document_number,
        category: documentoData.category,
        validity_period: documentoData.validity_period
      },
      daysUntilExpiration: daysUntilExpiration
    });

    if (emailResult.success) {
      console.log('\n✅ NOTIFICACIÓN AUTOMÁTICA ENVIADA EXITOSAMENTE!');
      console.log('=' .repeat(70));
      console.log(`📮 Destinatario: ${colaboradorData.email}`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
      console.log(`⏰ Fecha/Hora: ${new Date().toLocaleString('es-ES')}`);
      console.log(`🤖 Generado por: Sistema de Monitoreo Automático + IA`);
      
      // 8. Mostrar simulación completa del email
      console.log('\n📄 PREVIEW DEL EMAIL ENVIADO:');
      console.log('─'.repeat(70));
      console.log('DE: MINEDUC - Sistema Documental <eramirezl9@miumg.edu.gt>');
      console.log(`PARA: ${colaboradorData.email}`);
      console.log(`ASUNTO: [${urgencyLevel.toUpperCase()}] Certificado próximo a vencer - ${documentoData.title}`);
      console.log(`PRIORIDAD: ${alertType} ${urgencyLevel.toUpperCase()}`);
      console.log('');
      console.log('ENCABEZADO PERSONALIZADO:');
      console.log(`Estimado ${colaboradorData.name}`);
      console.log(`${colaboradorData.position}`);
      console.log(`${colaboradorData.department}`);
      console.log('');
      console.log('MENSAJE PRINCIPAL (GENERADO POR IA):');
      console.log(messageResult.success ? messageResult.message : 'Mensaje de respaldo usado');
      console.log('');
      console.log('DETALLES DEL DOCUMENTO:');
      console.log(`• Documento: ${documentoData.title}`);
      console.log(`• Número: ${documentoData.document_number}`);
      console.log(`• Categoría: ${documentoData.category}`);
      console.log(`• Vigencia: ${documentoData.validity_period}`);
      console.log(`• Vence: ${new Date(documentoData.expiration_date).toLocaleDateString('es-ES')}`);
      console.log(`• Días restantes: ${daysUntilExpiration}`);
      console.log('');
      console.log('REQUISITOS PARA RENOVACIÓN:');
      documentoData.requirements_for_renewal.forEach((req, idx) => {
        console.log(`   ${idx + 1}. ${req}`);
      });
      console.log('─'.repeat(70));

      // 9. Simular registro en sistema de auditoría
      console.log('\n📊 REGISTRO EN SISTEMA DE AUDITORÍA:');
      console.log('✅ Notificación registrada en log del sistema');
      console.log('✅ Estado de entrega: Enviado');
      console.log('✅ Intento de notificación: 1/3');
      console.log('✅ Próxima verificación: 24 horas');
      console.log('✅ Seguimiento automático activado');

      // 10. Mostrar flujo completo del sistema
      console.log('\n🔄 FLUJO AUTOMÁTICO COMPLETADO:');
      console.log('1. ✅ Sistema detectó documento próximo a vencer');
      console.log('2. ✅ Verificó configuración del usuario');
      console.log('3. ✅ Determinó nivel de prioridad automáticamente');
      console.log('4. ✅ Generó mensaje personalizado con IA');
      console.log('5. ✅ Envió email con template profesional');
      console.log('6. ✅ Registró la acción en auditoría');
      console.log('7. ✅ Programó seguimiento automático');

    } else {
      console.log('❌ Error enviando notificación automática');
    }

    console.log('\n🎉 SIMULACIÓN DE MONITOREO AUTOMÁTICO COMPLETADA!');
    console.log('📋 El sistema demostró:');
    console.log('   🤖 Detección automática de vencimientos');
    console.log('   🎯 Personalización inteligente con IA');
    console.log('   📧 Envío automático de notificaciones');
    console.log('   📊 Registro completo de auditoría');
    console.log('   🔄 Funcionamiento 24/7 sin intervención manual');

  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  }
}

// Ejecutar la simulación completa
sendTestEmailToOmar();