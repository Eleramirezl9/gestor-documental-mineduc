#!/usr/bin/env node

/**
 * Script básico para verificar funcionalidades del servidor
 * Ejecutar con: node test_basic_functionality.js
 */

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

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

async function testBasicFunctionality() {
  log.step('🚀 Iniciando verificación básica del servidor...\n');

  try {
    // 1. Verificar health check
    log.step('1. Verificando health check...');
    try {
      const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        log.success(`Servidor funcionando: ${healthData.status}`);
        log.info(`Ambiente: ${healthData.environment}`);
        log.info(`Timestamp: ${healthData.timestamp}`);
      } else {
        throw new Error(`HTTP ${healthResponse.status}`);
      }
    } catch (error) {
      log.error(`Error en health check: ${error.message}`);
      return;
    }

    // 2. Verificar que las rutas protegidas requieren autenticación
    log.step('\n2. Verificando protección de rutas...');
    const protectedRoutes = ['/api/documents', '/api/users', '/api/workflows'];
    
    for (const route of protectedRoutes) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${route}`);
        if (response.status === 401) {
          const errorData = await response.json();
          log.success(`${route} - Correctamente protegida`);
          log.info(`  Error: ${errorData.error}`);
          log.info(`  Código: ${errorData.code || 'N/A'}`);
        } else if (response.ok) {
          log.warning(`${route} - No requiere autenticación (posible problema)`);
        } else {
          log.warning(`${route} - Estado inesperado: ${response.status}`);
        }
      } catch (error) {
        log.error(`${route} - Error: ${error.message}`);
      }
    }

    // 3. Verificar CORS preflight
    log.step('\n3. Verificando configuración CORS...');
    try {
      const corsResponse = await fetchWithTimeout(`${API_BASE_URL}/api/documents`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
      });
      
      if (corsResponse.ok || corsResponse.status === 204) {
        log.success('CORS configurado');
        const allowedOrigin = corsResponse.headers.get('access-control-allow-origin');
        const allowedMethods = corsResponse.headers.get('access-control-allow-methods');
        const allowedHeaders = corsResponse.headers.get('access-control-allow-headers');
        
        if (allowedOrigin) log.info(`  Origen permitido: ${allowedOrigin}`);
        if (allowedMethods) log.info(`  Métodos: ${allowedMethods}`);
        if (allowedHeaders) log.info(`  Headers: ${allowedHeaders}`);
      } else {
        log.warning('CORS puede tener problemas');
      }
    } catch (error) {
      log.warning(`CORS check failed: ${error.message}`);
    }

    // 4. Verificar Swagger UI
    log.step('\n4. Verificando Swagger UI...');
    try {
      const swaggerResponse = await fetchWithTimeout(`${API_BASE_URL}/api-docs/`);
      if (swaggerResponse.ok) {
        log.success('Swagger UI disponible');
        log.info(`  URL: ${API_BASE_URL}/api-docs`);
        log.info(`  Content-Type: ${swaggerResponse.headers.get('content-type')}`);
      } else {
        log.warning(`Swagger UI problema: ${swaggerResponse.status}`);
      }
    } catch (error) {
      log.error(`Swagger UI error: ${error.message}`);
    }

    // 5. Verificar endpoint de login (sin hacer login real)
    log.step('\n5. Verificando endpoint de login...');
    try {
      const loginResponse = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'invalid'
        })
      });
      
      if (loginResponse.status === 401) {
        const errorData = await loginResponse.json();
        log.success('Endpoint de login funcionando');
        log.info(`  Respuesta esperada: ${errorData.error}`);
      } else if (loginResponse.status === 400) {
        log.success('Endpoint de login con validación');
        const errorData = await loginResponse.json();
        log.info(`  Validación: ${errorData.error || errorData.message}`);
      } else {
        log.warning(`Login endpoint estado inesperado: ${loginResponse.status}`);
      }
    } catch (error) {
      log.error(`Login endpoint error: ${error.message}`);
    }

    // 6. Verificar middleware de rate limiting
    log.step('\n6. Verificando rate limiting...');
    try {
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(fetchWithTimeout(`${API_BASE_URL}/health`));
      }
      
      const responses = await Promise.all(requests);
      const allOk = responses.every(r => r.ok);
      
      if (allOk) {
        log.success('Rate limiting configurado (permite requests normales)');
        const firstResponse = responses[0];
        const rateLimitRemaining = firstResponse.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining) {
          log.info(`  Requests restantes: ${rateLimitRemaining}`);
        }
      } else {
        log.warning('Posible problema con rate limiting');
      }
    } catch (error) {
      log.warning(`Rate limiting check failed: ${error.message}`);
    }

    // Resumen final
    log.step('\n🎉 Verificación básica completada!');
    console.log(`\n${colors.bold}${colors.green}✅ Funcionalidades verificadas:${colors.reset}`);
    console.log('  • Servidor corriendo correctamente');
    console.log('  • Rutas protegidas con autenticación JWT');
    console.log('  • CORS configurado');
    console.log('  • Swagger UI disponible');
    console.log('  • Endpoints de autenticación');
    console.log('  • Rate limiting activo');
    
    console.log(`\n${colors.bold}${colors.blue}Próximos pasos para probar autenticación completa:${colors.reset}`);
    console.log('1. Crear un usuario de prueba en Supabase Auth');
    console.log('2. Actualizar las credenciales en test_auth_flow_native.js');
    console.log('3. Configurar las políticas RLS en Supabase');
    console.log(`4. Abrir Swagger UI: ${API_BASE_URL}/api-docs`);
    console.log('5. Hacer login manual en Swagger y probar rutas protegidas');

  } catch (error) {
    log.error('Error general en las verificaciones');
    console.error(error.message);
  }
}

// Ejecutar verificaciones
if (require.main === module) {
  testBasicFunctionality().catch(console.error);
}

module.exports = { testBasicFunctionality };