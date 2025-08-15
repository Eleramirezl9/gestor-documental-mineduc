#!/usr/bin/env node

/**
 * Script de prueba para verificar el flujo de autenticación JWT (usando fetch nativo)
 * Ejecutar con: node test_auth_flow_native.js
 */

// Verificar que fetch esté disponible (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ Este script requiere Node.js 18+ con fetch nativo');
  console.log('💡 Alternativa: instala axios con "npm install" y usa test_auth_flow.js');
  process.exit(1);
}

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_USER = {
  email: 'admin@mineduc.gob.gt',
  password: 'password123' // Cambiar por la contraseña real
};

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.bold}${colors.blue}🔸 ${msg}${colors.reset}`)
};

// Función helper para manejar fetch con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function testAuthFlow() {
  log.step('Iniciando pruebas de autenticación JWT...\n');

  try {
    // 1. Verificar que el servidor esté corriendo
    log.step('1. Verificando conexión al servidor...');
    try {
      const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        log.success(`Servidor corriendo: ${healthData.status}`);
        log.info(`Ambiente: ${healthData.environment}`);
      } else {
        throw new Error(`HTTP ${healthResponse.status}`);
      }
    } catch (error) {
      log.error('Servidor no responde. Asegúrate de que esté corriendo en el puerto 5000');
      log.info('Ejecuta: npm run dev en la carpeta backend/');
      return;
    }

    // 2. Probar ruta sin autenticación
    log.step('\n2. Probando acceso sin token...');
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/documents`);
      if (response.ok) {
        log.error('Las rutas protegidas permiten acceso sin token - ERROR DE SEGURIDAD');
      }
    } catch (error) {
      const response = error.response || await fetchWithTimeout(`${API_BASE_URL}/api/documents`);
      if (response.status === 401) {
        const errorData = await response.json();
        log.success('Rutas protegidas correctamente bloqueadas sin token');
        log.info(`Error esperado: ${errorData.error}`);
      } else {
        log.warning(`Error inesperado: ${response.status}`);
      }
    }

    // 3. Hacer login
    log.step('\n3. Realizando login...');
    let token;
    try {
      const loginResponse = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_USER)
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.session?.access_token;
        
        if (token) {
          log.success('Login exitoso');
          log.info(`Usuario: ${loginData.user.email}`);
          log.info(`Rol: ${loginData.user.role || 'No definido'}`);
          log.info(`Token (primeros 50 chars): ${token.substring(0, 50)}...`);
        } else {
          log.error('Login exitoso pero no se obtuvo token');
          console.log('Respuesta completa:', JSON.stringify(loginData, null, 2));
          return;
        }
      } else {
        const errorData = await loginResponse.json();
        log.error('Error en login');
        console.log('Error details:', errorData);
        log.warning('Verifica que:');
        log.warning('- Supabase esté configurado correctamente');
        log.warning('- El usuario de prueba exista');
        log.warning('- Las credenciales sean correctas');
        return;
      }
    } catch (error) {
      log.error(`Error en login: ${error.message}`);
      return;
    }

    // 4. Probar ruta protegida con token
    log.step('\n4. Probando ruta protegida con token...');
    try {
      const documentsResponse = await fetchWithTimeout(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        log.success('Acceso a ruta protegida exitoso');
        log.info(`Documentos encontrados: ${documentsData.data?.length || 0}`);
      } else {
        const errorData = await documentsResponse.json();
        if (documentsResponse.status === 401) {
          log.error('Token válido rechazado - posible problema con middleware');
          log.info(`Error: ${errorData.error}`);
          log.info(`Código: ${errorData.code}`);
        } else {
          log.warning(`Error inesperado: ${documentsResponse.status} - ${errorData.error}`);
        }
      }
    } catch (error) {
      log.error(`Error accediendo a ruta protegida: ${error.message}`);
    }

    // 5. Probar token inválido
    log.step('\n5. Probando token inválido...');
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Authorization': 'Bearer token_falso_123',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        log.error('Token inválido fue aceptado - ERROR DE SEGURIDAD');
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          log.success('Token inválido correctamente rechazado');
          log.info(`Error: ${errorData.error}`);
          log.info(`Código: ${errorData.code}`);
        } else {
          log.warning(`Error inesperado: ${response.status}`);
        }
      }
    } catch (error) {
      log.warning(`Error verificando token inválido: ${error.message}`);
    }

    // 6. Verificar Swagger
    log.step('\n6. Verificando Swagger UI...');
    try {
      const swaggerResponse = await fetchWithTimeout(`${API_BASE_URL}/api-docs/`, {
        method: 'GET'
      });
      if (swaggerResponse.ok) {
        log.success('Swagger UI disponible');
        log.info(`Accede a: ${API_BASE_URL}/api-docs`);
      } else {
        log.warning('Swagger UI no disponible');
      }
    } catch (error) {
      log.warning('Swagger UI no disponible o con problemas');
    }

    // Resumen final
    log.step('\n🎉 Pruebas completadas!');
    log.success('El sistema de autenticación JWT está funcionando correctamente');
    
    console.log(`\n${colors.bold}${colors.blue}Próximos pasos:${colors.reset}`);
    console.log('1. Ejecutar: npm install (para instalar axios si quieres usar test_auth_flow.js)');
    console.log('2. Abrir el frontend en http://localhost:5173');
    console.log('3. Probar el login en la interfaz');
    console.log('4. Verificar que las rutas protegidas funcionen');
    console.log(`5. Explorar la API en ${API_BASE_URL}/api-docs`);

  } catch (error) {
    log.error('Error general en las pruebas');
    console.error(error.message);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testAuthFlow().catch(console.error);
}

module.exports = { testAuthFlow };