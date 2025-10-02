/**
 * Script de prueba para verificar el endpoint de documentos de empleado
 * Prueba: GET /api/employee-document-requirements/employee/:employee_id
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Credenciales de prueba
const TEST_EMAIL = 'admin@mineduc.gob.gt';
const TEST_PASSWORD = 'Admin123!';
const TEST_EMPLOYEE_ID = 'MIN25007';

async function testEmployeeDocumentsEndpoint() {
  try {
    console.log('🔐 Paso 1: Autenticando usuario...');

    // Autenticar
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.session.access_token;
    console.log('✅ Autenticación exitosa');
    console.log('📝 Token obtenido:', token.substring(0, 50) + '...\n');

    // Configurar headers con token
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    console.log(`📋 Paso 2: Obteniendo documentos del empleado ${TEST_EMPLOYEE_ID}...`);

    // Obtener documentos del empleado
    const documentsResponse = await axios.get(
      `${API_BASE_URL}/api/employee-document-requirements/employee/${TEST_EMPLOYEE_ID}`,
      config
    );

    console.log('✅ Documentos obtenidos exitosamente!');
    console.log('📊 Respuesta del servidor:\n');
    console.log(JSON.stringify(documentsResponse.data, null, 2));

    if (documentsResponse.data.success) {
      console.log(`\n✅ PRUEBA EXITOSA: Se obtuvieron ${documentsResponse.data.data.length} documentos`);
      return true;
    } else {
      console.log('\n❌ PRUEBA FALLIDA: La respuesta no indica éxito');
      return false;
    }

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Ejecutar prueba
console.log('🧪 INICIANDO PRUEBA DEL ENDPOINT DE DOCUMENTOS DE EMPLEADO\n');
console.log('=' .repeat(60));
console.log('\n');

testEmployeeDocumentsEndpoint()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 RESULTADO: TODAS LAS PRUEBAS PASARON');
      process.exit(0);
    } else {
      console.log('💥 RESULTADO: PRUEBA FALLIDA');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('💥 Error inesperado:', err);
    process.exit(1);
  });
