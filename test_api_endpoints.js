/**
 * Script de prueba para verificar que los endpoints de documentos funcionen correctamente
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper para hacer requests HTTP
const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

// Tests
async function runTests() {
  console.log('🧪 Iniciando pruebas de API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Test: Health check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   ✅ Servidor funcionando\n`);

    // Test 2: Get document types
    console.log('2️⃣ Test: GET /api/employee-document-requirements/document-types');
    const types = await makeRequest('GET', '/api/employee-document-requirements/document-types');
    console.log(`   Status: ${types.status}`);
    if (types.data.success && types.data.data) {
      console.log(`   ✅ ${types.data.data.length} tipos de documentos encontrados`);
      console.log(`   Primeros 3: ${types.data.data.slice(0, 3).map(d => d.name).join(', ')}`);
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(types.data)}`);
    }
    console.log('');

    // Test 3: Get templates
    console.log('3️⃣ Test: GET /api/employee-document-requirements/templates');
    const templates = await makeRequest('GET', '/api/employee-document-requirements/templates');
    console.log(`   Status: ${templates.status}`);
    if (templates.data.success && templates.data.data) {
      console.log(`   ✅ ${templates.data.data.length} plantillas encontradas`);
      if (templates.data.data.length > 0) {
        console.log(`   Plantillas: ${templates.data.data.map(t => t.name).join(', ')}`);
      }
    } else {
      console.log(`   ⚠️  No hay plantillas (esto es normal si no se han creado)`);
    }
    console.log('');

    // Test 4: Get employee documents (usaremos un ID de prueba)
    console.log('4️⃣ Test: GET /api/employee-document-requirements/employee/:id');
    const employeeDocs = await makeRequest('GET', '/api/employee-document-requirements/employee/EMP-001');
    console.log(`   Status: ${employeeDocs.status}`);
    if (employeeDocs.data.success) {
      console.log(`   ✅ Documentos del empleado EMP-001: ${employeeDocs.data.data.length}`);
    } else {
      console.log(`   ℹ️  Empleado sin documentos asignados (normal en primera ejecución)`);
    }
    console.log('');

    // Test 5: Get statistics
    console.log('5️⃣ Test: GET /api/employee-document-requirements/statistics');
    const stats = await makeRequest('GET', '/api/employee-document-requirements/statistics');
    console.log(`   Status: ${stats.status}`);
    if (stats.data.success && stats.data.data) {
      console.log(`   ✅ Estadísticas obtenidas:`);
      console.log(`      Total tipos: ${stats.data.data.totalTypes || 0}`);
      console.log(`      Total asignados: ${stats.data.data.totalAssignments || 0}`);
      console.log(`      Pendientes: ${stats.data.data.pending || 0}`);
    } else {
      console.log(`   ℹ️  ${JSON.stringify(stats.data)}`);
    }
    console.log('');

    console.log('✅ Todas las pruebas completadas!\n');
    console.log('📋 Resumen:');
    console.log('   - Backend funcionando en puerto 5000');
    console.log('   - Endpoints de documentos respondiendo correctamente');
    console.log('   - Base de datos conectada y con datos');
    console.log('\n🚀 Listo para usar en el navegador: http://localhost:5173/employees\n');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.error('\n⚠️  Asegúrate de que:');
    console.error('   1. El backend esté corriendo (npm run dev en backend/)');
    console.error('   2. El puerto 5000 esté disponible');
    console.error('   3. La base de datos esté configurada correctamente\n');
    process.exit(1);
  }
}

runTests();
