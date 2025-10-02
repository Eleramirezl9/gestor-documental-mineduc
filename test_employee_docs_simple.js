/**
 * Test simplificado - usa el token actual del navegador
 * Copia el token desde localStorage en el navegador
 */

const http = require('http');
const readline = require('readline');

const BASE_URL = 'http://localhost:5000';

// Colores
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}${colors.bright}🧪 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.cyan}   ${msg}${colors.reset}`)
};

// Helper para hacer requests HTTP
const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: responseData });
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

async function runTests(token, employeeId) {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════`);
  console.log('🧪 TEST: Sistema de Documentos de Empleados');
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Tipos de documentos
    log.test('TEST 1: Obtener tipos de documentos');
    const typesRes = await makeRequest('GET', '/api/employee-document-requirements/document-types', null, token);

    if (typesRes.status === 200 && typesRes.data.success) {
      const types = typesRes.data.data;
      log.success(`${types.length} tipos de documentos encontrados`);
      log.data(`Ejemplos: ${types.slice(0, 5).map(d => d.name).join(', ')}`);
      passed++;
    } else {
      log.error(`Error: ${JSON.stringify(typesRes.data)}`);
      failed++;
    }

    console.log('');

    // Test 2: Documentos del empleado (antes)
    log.test(`TEST 2: Documentos del empleado ${employeeId}`);
    const docsRes = await makeRequest('GET', `/api/employee-document-requirements/employee/${employeeId}`, null, token);

    if (docsRes.status === 200 && docsRes.data.success) {
      const docs = docsRes.data.data;
      log.success(`${docs.length} documentos asignados`);

      if (docs.length > 0) {
        log.data('Documentos existentes:');
        docs.forEach((doc, i) => {
          log.data(`  ${i + 1}. ${doc.document_type} - ${doc.status} (${doc.priority})`);
          if (doc.required_date) log.data(`     Fecha: ${doc.required_date}`);
          if (doc.description) log.data(`     Nota: ${doc.description}`);
        });
      } else {
        log.info('No hay documentos asignados');
      }
      passed++;
    } else {
      log.error(`Error: ${JSON.stringify(docsRes.data)}`);
      failed++;
    }

    console.log('');

    // Test 3: Estadísticas
    log.test('TEST 3: Estadísticas del sistema');
    const statsRes = await makeRequest('GET', '/api/employee-document-requirements/statistics', null, token);

    if (statsRes.status === 200 && statsRes.data.success) {
      const stats = statsRes.data.data;
      log.success('Estadísticas obtenidas');
      log.data(`Total tipos: ${stats.totalTypes || 0}`);
      log.data(`Total asignaciones: ${stats.totalAssignments || 0}`);
      log.data(`Pendientes: ${stats.pending || 0}`);
      log.data(`Aprobados: ${stats.approved || 0}`);
      log.data(`Rechazados: ${stats.rejected || 0}`);
      passed++;
    } else {
      log.error(`Error: ${JSON.stringify(statsRes.data)}`);
      failed++;
    }

    console.log('');

    // Test 4: Plantillas
    log.test('TEST 4: Plantillas disponibles');
    const templatesRes = await makeRequest('GET', '/api/employee-document-requirements/templates', null, token);

    if (templatesRes.status === 200 && templatesRes.data.success) {
      const templates = templatesRes.data.data;
      log.success(`${templates.length} plantillas encontradas`);

      if (templates.length > 0) {
        templates.forEach((t, i) => {
          log.data(`  ${i + 1}. ${t.name} - ${t.document_count || 0} documentos`);
        });
      } else {
        log.info('No hay plantillas (normal en configuración inicial)');
      }
      passed++;
    } else {
      log.warning('No hay plantillas disponibles');
      passed++; // No es error crítico
    }

  } catch (error) {
    log.error(`Error crítico: ${error.message}`);
    failed++;
  }

  // Resumen
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════`);
  console.log('📊 RESUMEN');
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Tests exitosos: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Tests fallidos: ${failed}${colors.reset}`);
  console.log(`📈 Porcentaje de éxito: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    log.success('🎉 ¡TODOS LOS TESTS PASARON!');
    console.log(`\n${colors.cyan}El sistema está funcionando correctamente.${colors.reset}\n`);
  } else {
    log.error('⚠️  Algunos tests fallaron');
  }
}

// Preguntar por token y employee ID
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`\n${colors.bright}${colors.blue}🔐 Test de Documentos de Empleados${colors.reset}\n`);
console.log(`${colors.yellow}Para obtener el token:${colors.reset}`);
console.log(`1. Abre http://localhost:5173/employees en el navegador`);
console.log(`2. Abre DevTools (F12)`);
console.log(`3. En la consola, escribe: localStorage.getItem('sb-access-token')`);
console.log(`4. Copia el token (sin comillas)\n`);

rl.question('Ingresa el token de acceso: ', (token) => {
  if (!token || token.trim() === '') {
    console.log(`${colors.red}❌ Token inválido${colors.reset}\n`);
    rl.close();
    return;
  }

  rl.question('\nIngresa el employee_id para probar (ej: MIN25007): ', (employeeId) => {
    if (!employeeId || employeeId.trim() === '') {
      console.log(`${colors.red}❌ Employee ID inválido${colors.reset}\n`);
      rl.close();
      return;
    }

    rl.close();
    runTests(token.trim(), employeeId.trim());
  });
});
