#!/usr/bin/env node

/**
 * Script de verificación de despliegue - CommonJS
 * Verifica que la arquitectura esté configurada correctamente
 */

const axios = require('axios');

class DeploymentVerifier {
  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://gestor-documental-mineduc.vercel.app';
    this.backendUrl = process.env.BACKEND_URL || 'https://gestor-documental-mineduc-backend.onrender.com';
    this.results = [];
  }

  log(status, message, details = '') {
    const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    
    console.log(`${icon} ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }
    
    this.results.push({ status, message, details });
  }

  async checkBackendHealth() {
    console.log('\n🔍 Verificando Backend...');
    
    try {
      const response = await axios.get(`${this.backendUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        const health = response.data;
        
        if (health.overall === 'healthy') {
          this.log('success', 'Backend funcionando correctamente');
          
          // Verificar cada componente
          if (health.checks && health.checks.database && health.checks.database.status === 'healthy') {
            this.log('success', 'Conexión a base de datos: OK');
          } else {
            this.log('error', 'Problema con base de datos', health.checks?.database?.message || 'Sin detalles');
          }
          
          if (health.checks && health.checks.storage && health.checks.storage.status === 'healthy') {
            this.log('success', 'Storage de Supabase: OK');
          } else {
            this.log('warning', 'Problema con storage', health.checks?.storage?.message || 'Sin detalles');
          }
          
          if (health.checks && health.checks.environment && health.checks.environment.status === 'healthy') {
            this.log('success', 'Variables de entorno: OK');
          } else {
            const missing = health.checks?.environment?.details?.missing || [];
            this.log('error', 'Variables de entorno faltantes', missing.join(', '));
          }
          
        } else {
          this.log('warning', 'Backend con advertencias', `Estado: ${health.overall}`);
        }
      } else {
        this.log('error', 'Backend responde pero con errores', `Status: ${response.status}`);
      }
    } catch (error) {
      this.log('error', 'Backend no accesible', `${error.message}`);
    }
  }

  async checkBackendEndpoints() {
    console.log('\n🔍 Verificando Endpoints Críticos...');
    
    const endpoints = [
      { path: '/api-docs', name: 'Documentación API' },
      { path: '/api/auth', name: 'Endpoint Auth (debería dar 404)', expectError: true }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.backendUrl}${endpoint.path}`, {
          timeout: 5000
        });
        
        if (endpoint.expectError) {
          this.log('warning', `${endpoint.name}: Respuesta inesperada`, `Status: ${response.status}`);
        } else {
          this.log('success', `${endpoint.name}: Disponible`);
        }
      } catch (error) {
        if (endpoint.expectError && error.response && error.response.status === 404) {
          this.log('success', `${endpoint.name}: Comportamiento esperado (404)`);
        } else {
          this.log('error', `${endpoint.name}: Error`, error.message);
        }
      }
    }
  }

  async checkFrontend() {
    console.log('\n🔍 Verificando Frontend...');
    
    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.log('success', 'Frontend accesible');
        
        // Verificar si contiene el contenido esperado
        const content = response.data;
        if (content.includes('MINEDUC') || content.includes('Gestor Documental')) {
          this.log('success', 'Contenido del frontend correcto');
        } else {
          this.log('warning', 'Contenido del frontend no reconocido');
        }
      } else {
        this.log('error', 'Frontend responde con error', `Status: ${response.status}`);
      }
    } catch (error) {
      this.log('error', 'Frontend no accesible', error.message);
    }
  }

  async checkCORS() {
    console.log('\n🔍 Verificando CORS...');
    
    try {
      const response = await axios.get(`${this.backendUrl}/health`, {
        headers: {
          'Origin': this.frontendUrl
        },
        timeout: 5000
      });
      
      const corsHeaders = response.headers['access-control-allow-origin'];
      if (corsHeaders) {
        this.log('success', 'CORS configurado correctamente');
      } else {
        this.log('warning', 'Headers CORS no detectados');
      }
    } catch (error) {
      this.log('error', 'Error verificando CORS', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Resumen de Verificación\n');
    
    const successes = this.results.filter(r => r.status === 'success').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    
    console.log(`✅ Exitosos: ${successes}`);
    console.log(`⚠️  Advertencias: ${warnings}`);
    console.log(`❌ Errores: ${errors}`);
    
    if (errors === 0 && warnings === 0) {
      console.log('\n🎉 ¡Despliegue verificado exitosamente!');
      console.log('Tu aplicación está lista para usar.');
    } else if (errors === 0) {
      console.log('\n⚠️  Despliegue funcional con advertencias');
      console.log('Revisa las advertencias para optimizar la configuración.');
    } else {
      console.log('\n❌ Despliegue con errores críticos');
      console.log('Revisa y corrige los errores antes de usar la aplicación.');
    }
    
    console.log('\n🔗 URLs de la aplicación:');
    console.log(`Frontend: ${this.frontendUrl}`);
    console.log(`Backend: ${this.backendUrl}`);
    console.log(`API Docs: ${this.backendUrl}/api-docs`);
    
    console.log('\n👥 Usuarios de prueba:');
    console.log('Admin: admin@mineduc.gob.gt / admin123456');
    console.log('Editor: editor@mineduc.gob.gt / editor123456');
    console.log('Viewer: viewer@mineduc.gob.gt / viewer123456');
  }

  async run() {
    console.log('🚀 Iniciando verificación de despliegue...');
    console.log(`Frontend: ${this.frontendUrl}`);
    console.log(`Backend: ${this.backendUrl}`);
    
    await this.checkBackendHealth();
    await this.checkBackendEndpoints();
    await this.checkFrontend();
    await this.checkCORS();
    
    this.generateReport();
  }
}

// Ejecutar verificación
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.run().catch(error => {
    console.error('Error ejecutando verificación:', error);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier;