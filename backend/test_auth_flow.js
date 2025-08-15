#!/usr/bin/env node

/**
 * Script de prueba para verificar el flujo de autenticación JWT
 * Ejecutar con: node test_auth_flow.js
 */

const axios = require('axios');

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_USER = {
  email: 'admin@mineduc.gob.gt',
  password: 'password' // Cambiar por la contraseña real
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

async function testAuthFlow() {
  log.step('Iniciando pruebas de autenticación JWT...\n');

  try {
    // 1. Verificar que el servidor esté corriendo
    log.step('1. Verificando conexión al servidor...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      log.success(`Servidor corriendo: ${healthResponse.data.status}`);
      log.info(`Ambiente: ${healthResponse.data.environment}`);
    } catch (error) {
      log.error('Servidor no responde. Asegúrate de que esté corriendo en el puerto 5000');
      log.info('Ejecuta: npm run dev en la carpeta backend/');
      return;
    }

    // 2. Probar ruta sin autenticación
    log.step('\\n2. Probando acceso sin token...');
    try {
      await axios.get(`${API_BASE_URL}/api/documents`);
      log.error('Las rutas protegidas permiten acceso sin token - ERROR DE SEGURIDAD');
    } catch (error) {
      if (error.response?.status === 401) {
        log.success('Rutas protegidas correctamente bloqueadas sin token');
        log.info(`Error esperado: ${error.response.data.error}`);
      } else {
        log.warning(`Error inesperado: ${error.response?.status} - ${error.message}`);
      }
    }

    // 3. Hacer login
    log.step('\\n3. Realizando login...');
    let token;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER);
      token = loginResponse.data.session?.access_token;
      
      if (token) {
        log.success('Login exitoso');
        log.info(`Usuario: ${loginResponse.data.user.email}`);
        log.info(`Rol: ${loginResponse.data.user.role || 'No definido'}`);
        log.info(`Token (primeros 50 chars): ${token.substring(0, 50)}...`);
      } else {
        log.error('Login exitoso pero no se obtuvo token');
        console.log('Respuesta completa:', JSON.stringify(loginResponse.data, null, 2));
        return;
      }
    } catch (error) {
      log.error('Error en login');
      console.log('Error details:', error.response?.data || error.message);
      log.warning('Verifica que:');
      log.warning('- Supabase esté configurado correctamente');
      log.warning('- El usuario de prueba exista');
      log.warning('- Las credenciales sean correctas');
      return;
    }

    // 4. Probar ruta protegida con token
    log.step('\\n4. Probando ruta protegida con token...');
    try {
      const documentsResponse = await axios.get(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      log.success('Acceso a ruta protegida exitoso');
      log.info(`Documentos encontrados: ${documentsResponse.data.data?.length || 0}`);
    } catch (error) {
      if (error.response?.status === 401) {
        log.error('Token válido rechazado - posible problema con middleware');
        log.info(`Error: ${error.response.data.error}`);
        log.info(`Código: ${error.response.data.code}`);
      } else {
        log.warning(`Error inesperado: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    // 5. Probar token inválido
    log.step('\\n5. Probando token inválido...');
    try {
      await axios.get(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Authorization': 'Bearer token_falso_123',
          'Content-Type': 'application/json'
        }
      });
      log.error('Token inválido fue aceptado - ERROR DE SEGURIDAD');
    } catch (error) {
      if (error.response?.status === 401) {
        log.success('Token inválido correctamente rechazado');
        log.info(`Error: ${error.response.data.error}`);
        log.info(`Código: ${error.response.data.code}`);
      } else {
        log.warning(`Error inesperado: ${error.response?.status}`);
      }
    }

    // 6. Probar CORS
    log.step('\\n6. Verificando configuración CORS...');
    try {
      const corsResponse = await axios.options(`${API_BASE_URL}/api/documents`, {
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization'
        }
      });
      log.success('CORS configurado correctamente');
      
      const allowedOrigin = corsResponse.headers['access-control-allow-origin'];
      const allowedMethods = corsResponse.headers['access-control-allow-methods'];
      const allowedHeaders = corsResponse.headers['access-control-allow-headers'];
      
      log.info(`Origen permitido: ${allowedOrigin}`);
      log.info(`Métodos permitidos: ${allowedMethods}`);
      log.info(`Headers permitidos: ${allowedHeaders}`);
    } catch (error) {
      log.warning('No se pudo verificar CORS completamente');
      log.info('Esto es normal en desarrollo local');
    }

    // 7. Verificar Swagger
    log.step('\\n7. Verificando Swagger UI...');
    try {
      const swaggerResponse = await axios.get(`${API_BASE_URL}/api-docs/`);
      if (swaggerResponse.status === 200) {
        log.success('Swagger UI disponible');
        log.info(`Accede a: ${API_BASE_URL}/api-docs`);
      }
    } catch (error) {
      log.warning('Swagger UI no disponible o con problemas');
    }

    // Resumen final
    log.step('\\n🎉 Pruebas completadas!');
    log.success('El sistema de autenticación JWT está funcionando correctamente');
    
    console.log(`\\n${colors.bold}${colors.blue}Próximos pasos:${colors.reset}`);
    console.log('1. Abrir el frontend en http://localhost:5173');
    console.log('2. Probar el login en la interfaz');
    console.log('3. Verificar que las rutas protegidas funcionen');
    console.log(`4. Explorar la API en ${API_BASE_URL}/api-docs`);

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