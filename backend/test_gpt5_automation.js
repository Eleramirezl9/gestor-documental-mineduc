/**
 * Script de testing para el flujo de automatización con GPT-5 Nano
 * Prueba la integración completa: Datos reales → GPT-5 Nano → Resend
 */

require('dotenv').config();
const gpt5NanoService = require('./services/gpt5NanoService');
const emailService = require('./services/emailService');

console.log('🚀 Iniciando testing del flujo de automatización GPT-5 Nano + Resend\n');

async function testGPT5NanoService() {
  console.log('📝 TEST 1: Verificando disponibilidad de GPT-5 Nano...');

  try {
    const status = gpt5NanoService.getStatus();
    console.log('   Estado del servicio:', status);

    if (!status.available) {
      console.error('   ❌ GPT-5 Nano no está disponible. Verifica la API Key en .env');
      return false;
    }

    console.log('   ✅ GPT-5 Nano está disponible\n');
    return true;
  } catch (error) {
    console.error('   ❌ Error verificando servicio:', error.message);
    return false;
  }
}

async function testEmailGeneration() {
  console.log('📝 TEST 2: Generando contenido de email con GPT-5 Nano...');

  try {
    const context = {
      employeeName: 'Juan Carlos Pérez López',
      employeeCode: 'MIN25001',
      documentType: 'Certificado de Antecedentes Penales',
      daysUntilExpiration: 7,
      expirationDate: '15 de enero de 2025',
      urgencyLevel: 'high'
    };

    console.log('   Contexto de prueba:', JSON.stringify(context, null, 2));

    const result = await gpt5NanoService.generateExpirationEmailContent(context);

    if (result.success) {
      console.log('\n   ✅ Contenido generado exitosamente!');
      console.log('\n   📧 ASUNTO:', result.subject);
      console.log('\n   📝 CUERPO:');
      console.log('   ' + result.body.split('\n').join('\n   '));

      if (result.metadata) {
        console.log('\n   📊 Metadata:');
        console.log('      - Modelo:', result.metadata.model);
        console.log('      - Tokens usados:', result.metadata.tokens);
        console.log('      - Generado:', result.metadata.generatedAt);
      }

      return { success: true, result };
    } else {
      console.log('\n   ⚠️ Se usó contenido fallback (IA no disponible)');
      console.log('   Asunto:', result.subject);
      return { success: false, result };
    }
  } catch (error) {
    console.error('\n   ❌ Error generando email:', error.message);
    return { success: false, error };
  }
}

async function testSubjectGeneration() {
  console.log('\n📝 TEST 3: Generando variaciones de asunto...');

  try {
    const context = {
      documentType: 'Certificado de Antecedentes',
      daysUntilExpiration: 5,
      urgencyLevel: 'urgent'
    };

    const result = await gpt5NanoService.generateSubjectVariations(context);

    if (result.success && result.subjects) {
      console.log('   ✅ Asuntos generados:\n');
      result.subjects.forEach((subject, idx) => {
        console.log(`   ${idx + 1}. ${subject}`);
      });
      return true;
    } else {
      console.log('   ⚠️ Usando asunto por defecto');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testContentImprovement() {
  console.log('\n📝 TEST 4: Probando mejora de contenido...');

  try {
    const originalContent = 'Su documento está por vencer. Por favor renuévelo pronto.';

    console.log('   Contenido original:', originalContent);

    const result = await gpt5NanoService.improveContent(originalContent, 'friendlier');

    if (result.success) {
      console.log('   ✅ Contenido mejorado:');
      console.log('   ' + result.improvedContent);
      return true;
    } else {
      console.log('   ⚠️ No se pudo mejorar el contenido');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testEmailService() {
  console.log('\n📝 TEST 5: Verificando servicio de email (Resend)...');

  try {
    const isConfigured = await emailService.verifyConfiguration();

    if (isConfigured) {
      console.log('   ✅ Servicio de email configurado correctamente');
      console.log('   📧 Proveedor: Resend');
      console.log('   📬 Email desde:', process.env.RESEND_FROM_EMAIL);
      return true;
    } else {
      console.log('   ❌ Servicio de email no está configurado');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error verificando email:', error.message);
    return false;
  }
}

async function testBulkSummary() {
  console.log('\n📝 TEST 6: Generando resumen masivo...');

  try {
    const documents = [
      {
        documentType: 'Certificado de Antecedentes',
        daysUntilExpiration: 3,
        employeeName: 'Juan Pérez'
      },
      {
        documentType: 'Licencia de Conducir',
        daysUntilExpiration: 7,
        employeeName: 'María García'
      },
      {
        documentType: 'DPI',
        daysUntilExpiration: 15,
        employeeName: 'Carlos López'
      }
    ];

    const result = await gpt5NanoService.generateBulkSummary(documents);

    if (result.success) {
      console.log('   ✅ Resumen generado:');
      console.log('   ' + result.summary);
      return true;
    } else {
      console.log('   ⚠️ Resumen por defecto:', result.summary);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = {
    gpt5Available: false,
    emailGeneration: false,
    subjectGeneration: false,
    contentImprovement: false,
    emailService: false,
    bulkSummary: false
  };

  // Test 1: Disponibilidad GPT-5 Nano
  results.gpt5Available = await testGPT5NanoService();

  if (results.gpt5Available) {
    // Test 2: Generación de email
    const emailTest = await testEmailGeneration();
    results.emailGeneration = emailTest.success;

    // Test 3: Variaciones de asunto
    results.subjectGeneration = await testSubjectGeneration();

    // Test 4: Mejora de contenido
    results.contentImprovement = await testContentImprovement();

    // Test 6: Resumen masivo
    results.bulkSummary = await testBulkSummary();
  } else {
    console.log('\n⚠️ GPT-5 Nano no disponible, saltando tests de IA...\n');
  }

  // Test 5: Servicio de email (independiente de IA)
  results.emailService = await testEmailService();

  // Resumen final
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('\n📊 RESUMEN DE TESTS:\n');

  const testNames = {
    gpt5Available: 'GPT-5 Nano Disponible',
    emailGeneration: 'Generación de Email con IA',
    subjectGeneration: 'Generación de Asuntos',
    contentImprovement: 'Mejora de Contenido',
    emailService: 'Servicio de Email (Resend)',
    bulkSummary: 'Resumen Masivo'
  };

  let passedTests = 0;
  const totalTests = Object.keys(results).length;

  Object.entries(results).forEach(([key, passed]) => {
    const emoji = passed ? '✅' : '❌';
    console.log(`   ${emoji} ${testNames[key]}`);
    if (passed) passedTests++;
  });

  console.log(`\n   Total: ${passedTests}/${totalTests} tests pasados`);

  if (results.gpt5Available && results.emailGeneration) {
    console.log('\n✅ FLUJO PRINCIPAL FUNCIONANDO CORRECTAMENTE');
    console.log('   El sistema está listo para generar emails con GPT-5 Nano y enviarlos via Resend');
  } else if (!results.gpt5Available) {
    console.log('\n⚠️ GPT-5 Nano no está disponible');
    console.log('   Verifica que GPT5_NANO_API_KEY esté configurada en .env');
    console.log('   El sistema funcionará con mensajes predeterminados');
  } else {
    console.log('\n⚠️ Algunos componentes no están funcionando correctamente');
    console.log('   Revisa los errores anteriores para más detalles');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  return results;
}

// Ejecutar tests
runAllTests()
  .then(() => {
    console.log('🏁 Testing completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en testing:', error);
    process.exit(1);
  });
