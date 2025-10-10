/**
 * Script de prueba para aprobar/rechazar documentos de empleados
 * Prueba los endpoints nuevos de aprobación y rechazo
 */

// Cargar variables de entorno desde backend/.env
require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}➡️  ${msg}${colors.reset}`)
};

let authToken = null;
let testEmployeeId = null;
let testRequirementId = null;

/**
 * Autenticar como admin
 */
async function authenticate() {
  try {
    log.step('Autenticando como admin...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@mineduc.gob.gt',
      password: 'Admin123!'
    });

    if (error) throw error;

    authToken = data.session.access_token;
    log.success('Autenticación exitosa');
    return true;
  } catch (error) {
    log.error(`Error en autenticación: ${error.message}`);
    return false;
  }
}

/**
 * Crear empleado de prueba
 */
async function createTestEmployee() {
  try {
    log.step('Creando empleado de prueba...');

    const response = await axios.post(
      `${API_BASE_URL}/api/employee-documents/register`,
      {
        email: `test.approval.${Date.now()}@mineduc.gob.gt`,
        first_name: 'Test',
        last_name: 'Approval',
        department: 'Testing',
        hire_date: new Date().toISOString().split('T')[0],
        position: 'Tester',
        phone: '5555-5555'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      testEmployeeId = response.data.employee.id;
      log.success(`Empleado creado: ${testEmployeeId}`);
      return true;
    } else {
      log.error('No se pudo crear el empleado');
      return false;
    }
  } catch (error) {
    log.error(`Error creando empleado: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

/**
 * Crear requerimiento de documento
 */
async function createDocumentRequirement() {
  try {
    log.step('Creando requerimiento de documento...');

    const response = await axios.post(
      `${API_BASE_URL}/api/employee-documents/employee/${testEmployeeId}/requirements`,
      {
        document_type: 'DPI',
        description: 'Documento de identificación personal',
        required_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      testRequirementId = response.data.requirement.id;
      log.success(`Requerimiento creado: ${testRequirementId}`);
      log.info(`Estado inicial: ${response.data.requirement.status}`);
      return true;
    } else {
      log.error('No se pudo crear el requerimiento');
      return false;
    }
  } catch (error) {
    log.error(`Error creando requerimiento: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Aprobar documento
 */
async function approveDocument() {
  try {
    log.step('Aprobando documento...');

    const response = await axios.put(
      `${API_BASE_URL}/api/employee-documents/requirement/${testRequirementId}/approve`,
      {
        notes: 'Documento aprobado en prueba automatizada'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      log.success('Documento aprobado exitosamente');
      log.info(`Estado: ${response.data.document.status}`);
      log.info(`Aprobado por: ${response.data.document.approved_by}`);
      log.info(`Fecha de aprobación: ${response.data.document.approved_at}`);

      // Verificar que el estado es 'approved'
      if (response.data.document.status === 'approved') {
        log.success('✓ Estado correcto: approved');
        return true;
      } else {
        log.error(`Estado incorrecto: ${response.data.document.status}`);
        return false;
      }
    } else {
      log.error('No se pudo aprobar el documento');
      return false;
    }
  } catch (error) {
    log.error(`Error aprobando documento: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

/**
 * Crear otro requerimiento para prueba de rechazo
 */
async function createSecondRequirement() {
  try {
    log.step('Creando segundo requerimiento para prueba de rechazo...');

    const response = await axios.post(
      `${API_BASE_URL}/api/employee-documents/employee/${testEmployeeId}/requirements`,
      {
        document_type: 'Título Profesional',
        description: 'Título universitario',
        required_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      testRequirementId = response.data.requirement.id;
      log.success(`Segundo requerimiento creado: ${testRequirementId}`);
      return true;
    } else {
      log.error('No se pudo crear el segundo requerimiento');
      return false;
    }
  } catch (error) {
    log.error(`Error creando segundo requerimiento: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

/**
 * Rechazar documento
 */
async function rejectDocument() {
  try {
    log.step('Rechazando documento...');

    const response = await axios.put(
      `${API_BASE_URL}/api/employee-documents/requirement/${testRequirementId}/reject`,
      {
        rejection_reason: 'Documento incompleto - prueba automatizada',
        notes: 'Se requiere documento completo y legible'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      log.success('Documento rechazado exitosamente');
      log.info(`Estado: ${response.data.document.status}`);
      log.info(`Motivo de rechazo: ${response.data.document.rejection_reason}`);
      log.info(`Fecha de rechazo: ${response.data.document.rejected_at}`);

      // Verificar que el estado es 'rejected'
      if (response.data.document.status === 'rejected') {
        log.success('✓ Estado correcto: rejected');
        return true;
      } else {
        log.error(`Estado incorrecto: ${response.data.document.status}`);
        return false;
      }
    } else {
      log.error('No se pudo rechazar el documento');
      return false;
    }
  } catch (error) {
    log.error(`Error rechazando documento: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

/**
 * Verificar estado final en la base de datos
 */
async function verifyFinalState() {
  try {
    log.step('Verificando estado final en la base de datos...');

    const { data: requirements, error } = await supabase
      .from('employee_document_requirements')
      .select('*')
      .eq('employee_id', testEmployeeId);

    if (error) throw error;

    log.info(`Total de requerimientos: ${requirements.length}`);

    requirements.forEach((req, index) => {
      log.info(`\nRequerimiento ${index + 1}:`);
      log.info(`  - Tipo: ${req.document_type}`);
      log.info(`  - Estado: ${req.status}`);
      log.info(`  - Prioridad: ${req.priority}`);
      if (req.status === 'approved') {
        log.info(`  - Aprobado el: ${req.approved_at}`);
        log.info(`  - Aprobado por: ${req.approved_by}`);
      }
      if (req.status === 'rejected') {
        log.info(`  - Rechazado el: ${req.rejected_at}`);
        log.info(`  - Motivo: ${req.rejection_reason}`);
      }
    });

    // Verificar que tenemos un aprobado y un rechazado
    const approvedCount = requirements.filter(r => r.status === 'approved').length;
    const rejectedCount = requirements.filter(r => r.status === 'rejected').length;

    if (approvedCount === 1 && rejectedCount === 1) {
      log.success('✓ Estados correctos en la base de datos');
      return true;
    } else {
      log.error(`Estados incorrectos: ${approvedCount} aprobado(s), ${rejectedCount} rechazado(s)`);
      return false;
    }
  } catch (error) {
    log.error(`Error verificando estado final: ${error.message}`);
    return false;
  }
}

/**
 * Limpiar datos de prueba
 */
async function cleanup() {
  try {
    log.step('Limpiando datos de prueba...');

    // Eliminar empleado (esto eliminará en cascada los requerimientos)
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', testEmployeeId);

    if (error) throw error;

    log.success('Datos de prueba eliminados');
    return true;
  } catch (error) {
    log.error(`Error limpiando datos: ${error.message}`);
    return false;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runTests() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}  TEST: Aprobar/Rechazar Documentos de Empleados${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Autenticación', fn: authenticate },
    { name: 'Crear empleado de prueba', fn: createTestEmployee },
    { name: 'Crear requerimiento de documento', fn: createDocumentRequirement },
    { name: 'Aprobar documento', fn: approveDocument },
    { name: 'Crear segundo requerimiento', fn: createSecondRequirement },
    { name: 'Rechazar documento', fn: rejectDocument },
    { name: 'Verificar estado final', fn: verifyFinalState }
  ];

  for (const test of tests) {
    results.total++;
    console.log(`\n${colors.bright}[Test ${results.total}/${tests.length}] ${test.name}${colors.reset}`);
    console.log(`${'-'.repeat(60)}`);

    const success = await test.fn();

    if (success) {
      results.passed++;
    } else {
      results.failed++;
      log.error(`Prueba fallida: ${test.name}`);
      break; // Detener si falla una prueba
    }
  }

  // Limpiar siempre, incluso si las pruebas fallan
  if (testEmployeeId) {
    console.log(`\n${colors.bright}Limpieza${colors.reset}`);
    console.log(`${'-'.repeat(60)}`);
    await cleanup();
  }

  // Resumen final
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}  RESUMEN DE PRUEBAS${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
  console.log(`  Total de pruebas: ${results.total}`);
  console.log(`  ${colors.green}Pasadas: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Fallidas: ${results.failed}${colors.reset}`);

  if (results.failed === 0) {
    console.log(`\n  ${colors.green}${colors.bright}🎉 ¡Todas las pruebas pasaron exitosamente!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${colors.red}${colors.bright}❌ Algunas pruebas fallaron${colors.reset}\n`);
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests().catch((error) => {
  log.error(`Error inesperado: ${error.message}`);
  console.error(error);
  process.exit(1);
});
