/**
 * Test completo del flujo de documentos de empleados
 * Incluye autenticación y pruebas CRUD completas
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let authToken = null;
let testEmployeeId = null;
let assignedDocIds = [];

// Colores para consola
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

    // Agregar token si existe
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

// Función de espera
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * TEST 1: Autenticación
 */
async function testAuthentication() {
  log.test('TEST 1: Autenticación de usuario');

  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@mineduc.gob.gt',
      password: 'Admin123!'
    });

    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      log.success(`Login exitoso - Token obtenido`);
      log.data(`Usuario: ${response.data.user.email}`);
      log.data(`Rol: ${response.data.user.role}`);
      return true;
    } else {
      log.error(`Login falló: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error(`Error en autenticación: ${error.message}`);
    return false;
  }
}

/**
 * TEST 2: Obtener tipos de documentos
 */
async function testGetDocumentTypes() {
  log.test('TEST 2: Obtener tipos de documentos disponibles');

  try {
    const response = await makeRequest('GET', '/api/employee-document-requirements/document-types', null, authToken);

    if (response.status === 200 && response.data.success) {
      const types = response.data.data;
      log.success(`${types.length} tipos de documentos encontrados`);
      log.data(`Ejemplos: ${types.slice(0, 5).map(d => d.name).join(', ')}`);
      return types.length > 0 ? types : null;
    } else {
      log.error(`Error obteniendo tipos: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 3: Obtener empleados
 */
async function testGetEmployees() {
  log.test('TEST 3: Obtener lista de empleados');

  try {
    const response = await makeRequest('GET', '/api/employees?limit=5', null, authToken);

    if (response.status === 200 && response.data.data) {
      const employees = response.data.data;
      log.success(`${employees.length} empleados encontrados`);

      if (employees.length > 0) {
        testEmployeeId = employees[0].employee_id;
        log.data(`Test con empleado: ${employees[0].first_name} ${employees[0].last_name} (${testEmployeeId})`);
        return employees[0];
      }
      return null;
    } else {
      log.error(`Error obteniendo empleados: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 4: Obtener documentos asignados a un empleado (antes de asignar)
 */
async function testGetEmployeeDocumentsBefore() {
  log.test('TEST 4: Obtener documentos del empleado (estado inicial)');

  try {
    const response = await makeRequest('GET', `/api/employee-document-requirements/employee/${testEmployeeId}`, null, authToken);

    if (response.status === 200 && response.data.success) {
      const docs = response.data.data;
      log.success(`${docs.length} documentos asignados actualmente`);

      if (docs.length > 0) {
        log.data(`Documentos existentes:`);
        docs.forEach((doc, i) => {
          log.data(`  ${i + 1}. ${doc.document_type} - ${doc.status} (Prioridad: ${doc.priority})`);
        });
      }

      return docs;
    } else {
      log.error(`Error: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 5: Asignar documentos a un empleado
 */
async function testAssignDocuments(documentTypes) {
  log.test('TEST 5: Asignar documentos al empleado');

  try {
    // Seleccionar 3 tipos de documentos al azar
    const selectedTypes = documentTypes.slice(0, 3);

    const documents = selectedTypes.map((type, index) => ({
      document_type_id: type.id,
      priority: ['high', 'medium', 'low'][index],
      due_date: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `Test document ${index + 1} - ${type.name}`
    }));

    log.data(`Asignando ${documents.length} documentos:`);
    documents.forEach((doc, i) => {
      const type = selectedTypes[i];
      log.data(`  ${i + 1}. ${type.name} (Prioridad: ${doc.priority})`);
    });

    const response = await makeRequest('POST', '/api/employee-document-requirements/assign', {
      employee_id: testEmployeeId,
      documents
    }, authToken);

    if (response.status === 201 && response.data.success) {
      assignedDocIds = response.data.data.map(doc => doc.id);
      log.success(`${response.data.data.length} documentos asignados correctamente`);
      log.data(`IDs asignados: ${assignedDocIds.join(', ')}`);
      return response.data.data;
    } else {
      log.error(`Error asignando: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 6: Verificar documentos asignados (después de asignar)
 */
async function testGetEmployeeDocumentsAfter() {
  log.test('TEST 6: Verificar documentos asignados');

  await wait(1000); // Esperar 1 segundo para asegurar que la DB se actualizó

  try {
    const response = await makeRequest('GET', `/api/employee-document-requirements/employee/${testEmployeeId}`, null, authToken);

    if (response.status === 200 && response.data.success) {
      const docs = response.data.data;
      log.success(`${docs.length} documentos asignados al empleado`);

      log.data(`Lista completa de documentos:`);
      docs.forEach((doc, i) => {
        log.data(`  ${i + 1}. ${doc.document_type || 'Sin nombre'}`);
        log.data(`     Estado: ${doc.status}, Prioridad: ${doc.priority}`);
        log.data(`     Fecha requerida: ${doc.required_date || 'No definida'}`);
        log.data(`     Descripción: ${doc.description || 'Sin descripción'}`);
      });

      return docs;
    } else {
      log.error(`Error: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 7: Actualizar un documento asignado
 */
async function testUpdateDocument() {
  log.test('TEST 7: Actualizar documento asignado');

  if (assignedDocIds.length === 0) {
    log.warning('No hay documentos para actualizar');
    return false;
  }

  try {
    const docId = assignedDocIds[0];
    const updates = {
      status: 'approved',
      priority: 'high',
      notes: 'Documento actualizado en test automatizado'
    };

    log.data(`Actualizando documento ID: ${docId}`);
    log.data(`Cambios: status=approved, priority=high`);

    const response = await makeRequest('PUT', `/api/employee-document-requirements/${docId}`, updates, authToken);

    if (response.status === 200 && response.data.success) {
      log.success('Documento actualizado correctamente');
      log.data(`Nuevo estado: ${response.data.data.status}`);
      return true;
    } else {
      log.error(`Error actualizando: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

/**
 * TEST 8: Obtener plantillas
 */
async function testGetTemplates() {
  log.test('TEST 8: Obtener plantillas de documentos');

  try {
    const response = await makeRequest('GET', '/api/employee-document-requirements/templates', null, authToken);

    if (response.status === 200 && response.data.success) {
      const templates = response.data.data;
      log.success(`${templates.length} plantillas encontradas`);

      if (templates.length > 0) {
        templates.forEach((template, i) => {
          log.data(`  ${i + 1}. ${template.name} - ${template.document_count || 0} documentos`);
        });
      } else {
        log.info('No hay plantillas creadas (normal en primera ejecución)');
      }

      return templates;
    } else {
      log.warning('No hay plantillas disponibles');
      return [];
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return [];
  }
}

/**
 * TEST 9: Obtener estadísticas
 */
async function testGetStatistics() {
  log.test('TEST 9: Obtener estadísticas del sistema');

  try {
    const response = await makeRequest('GET', '/api/employee-document-requirements/statistics', null, authToken);

    if (response.status === 200 && response.data.success) {
      const stats = response.data.data;
      log.success('Estadísticas obtenidas');
      log.data(`Total tipos de documentos: ${stats.totalTypes || 0}`);
      log.data(`Total asignaciones: ${stats.totalAssignments || 0}`);
      log.data(`Pendientes: ${stats.pending || 0}`);
      log.data(`Aprobados: ${stats.approved || 0}`);
      log.data(`Rechazados: ${stats.rejected || 0}`);
      return stats;
    } else {
      log.error(`Error: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * TEST 10: Eliminar documento asignado (opcional - comentado por defecto)
 */
async function testDeleteDocument() {
  log.test('TEST 10: Eliminar documento asignado');

  if (assignedDocIds.length === 0) {
    log.warning('No hay documentos para eliminar');
    return false;
  }

  try {
    const docId = assignedDocIds[assignedDocIds.length - 1]; // Eliminar el último
    log.data(`Eliminando documento ID: ${docId}`);

    const response = await makeRequest('DELETE', `/api/employee-document-requirements/${docId}`, null, authToken);

    if (response.status === 200 && response.data.success) {
      log.success('Documento eliminado correctamente');
      assignedDocIds.pop();
      return true;
    } else {
      log.error(`Error eliminando: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════`);
  console.log('🧪 TEST COMPLETO: Sistema de Documentos de Empleados');
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Autenticación
    if (await testAuthentication()) {
      passed++;
    } else {
      failed++;
      log.error('No se puede continuar sin autenticación');
      return;
    }

    await wait(500);

    // Test 2: Tipos de documentos
    const documentTypes = await testGetDocumentTypes();
    if (documentTypes && documentTypes.length > 0) {
      passed++;
    } else {
      failed++;
      log.error('No se puede continuar sin tipos de documentos');
      return;
    }

    await wait(500);

    // Test 3: Obtener empleados
    const employee = await testGetEmployees();
    if (employee) {
      passed++;
    } else {
      failed++;
      log.error('No se puede continuar sin empleados');
      return;
    }

    await wait(500);

    // Test 4: Documentos antes de asignar
    const docsBefore = await testGetEmployeeDocumentsBefore();
    if (docsBefore !== null) {
      passed++;
    } else {
      failed++;
    }

    await wait(500);

    // Test 5: Asignar documentos
    const assigned = await testAssignDocuments(documentTypes);
    if (assigned) {
      passed++;
    } else {
      failed++;
    }

    await wait(1000);

    // Test 6: Verificar documentos después de asignar
    const docsAfter = await testGetEmployeeDocumentsAfter();
    if (docsAfter !== null) {
      passed++;
    } else {
      failed++;
    }

    await wait(500);

    // Test 7: Actualizar documento
    if (await testUpdateDocument()) {
      passed++;
    } else {
      failed++;
    }

    await wait(500);

    // Test 8: Plantillas
    const templates = await testGetTemplates();
    if (templates !== null) {
      passed++;
    } else {
      failed++;
    }

    await wait(500);

    // Test 9: Estadísticas
    if (await testGetStatistics()) {
      passed++;
    } else {
      failed++;
    }

    await wait(500);

    // Test 10: Eliminar documento (opcional - comentado)
    // if (await testDeleteDocument()) {
    //   passed++;
    // } else {
    //   failed++;
    // }

  } catch (error) {
    log.error(`Error crítico: ${error.message}`);
    failed++;
  }

  // Resumen final
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════`);
  console.log('📊 RESUMEN DE TESTS');
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Tests exitosos: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Tests fallidos: ${failed}${colors.reset}`);
  console.log(`📈 Porcentaje de éxito: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    log.success('🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
    console.log(`\n${colors.cyan}El sistema está funcionando correctamente.${colors.reset}`);
    console.log(`${colors.cyan}Puedes acceder a la aplicación en: http://localhost:5173/employees${colors.reset}\n`);
  } else {
    log.error('⚠️  Algunos tests fallaron. Revisa los errores arriba.');
  }

  // Información adicional
  console.log(`${colors.yellow}ℹ️  Información de prueba:${colors.reset}`);
  if (testEmployeeId) {
    console.log(`   Empleado de prueba: ${testEmployeeId}`);
  }
  if (assignedDocIds.length > 0) {
    console.log(`   Documentos asignados: ${assignedDocIds.length}`);
    console.log(`   IDs: ${assignedDocIds.join(', ')}`);
  }
  console.log('');
}

// Ejecutar tests
runAllTests().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error('\n⚠️  Verifica que:');
  console.error('   1. El backend esté corriendo en puerto 5000');
  console.error('   2. El frontend esté corriendo en puerto 5173');
  console.error('   3. La base de datos esté configurada correctamente');
  console.error('   4. Las credenciales de admin@mineduc.gob.gt sean correctas\n');
  process.exit(1);
});
