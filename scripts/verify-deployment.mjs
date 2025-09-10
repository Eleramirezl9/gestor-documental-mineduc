#!/usr/bin/env node

/**
 * Script de verificación de despliegue (ESM)
 * Verifica que la arquitectura esté configurada correctamente
 */

import axios from 'axios';
import chalk from 'chalk';

class DeploymentVerifier {
  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://gestor-documental-mineduc.vercel.app';
    this.backendUrl = process.env.BACKEND_URL || 'https://gestor-documental-mineduc-backend.onrender.com';
    this.results = [];
  }

  log(status, message, details = '') {
    const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    const color = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red';
    
    console.log(chalk[color](`${icon} ${message}`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
    
    this.results.push({ status, message, details });
  }

  async checkBackendHealth() {
    console.log(chalk.blue('\n🔍 Verificando Backend...'));
    
    try {
      const response = await axios.get(`${this.backendUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        const health = response.data;
        
        if (health.overall === 'healthy') {
          this.log('success', 'Backend funcionando correctamente');
          
          // Verificar cada componente
          if (health.checks?.database?.status === 'healthy') {
            this.log('success', 'Conexión a base de datos: OK');
          } else {
            this.log('error', 'Problema con base de datos', health.checks?.database?.message);
          }
          
          if (health.checks?.storage?.status === 'healthy') {
            this.log('success', 'Storage de Supabase: OK');
          } else {
            this.log('warning', 'Problema con storage', health.checks?.storage?.message);
          }
          
          if (health.checks?.environment?.status === 'healthy') {
            this.log('success', 'Variables de entorno: OK');
          } else {
            this.log('error', 'Variables de entorno faltantes', health.checks?.environment?.details?.missing?.join(', '));
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
    console.log(chalk.blue('\n🔍 Verificando Endpoints Críticos...'));
    
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
        if (endpoint.expectError && error.response?.status === 404) {
          this.log('success', `${endpoint.name}: Comportamiento esperado (404)`);
        } else {
          this.log('error', `${endpoint.name}: Error`, error.message);
        }
      }
    }
  }

  async checkFrontend() {
    console.log(chalk.blue('\n🔍 Verificando Frontend...'));
    
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
    console.log(chalk.blue('\n🔍 Verificando CORS...'));
    
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

  async checkEnvironmentVariables() {
    console.log(chalk.blue('\n🔍 Verificando Variables de Entorno...'));
    
    // Solo podemos verificar las variables locales
    console.log(chalk.gray('   Verificación local de variables de entorno...'));
    
    // Verificar que las URLs estén configuradas correctamente
    if (this.frontendUrl.includes('vercel.app')) {
      this.log('success', 'Frontend URL configurada para Vercel');
    } else {
      this.log('warning', 'Frontend URL no parece ser de Vercel');
    }
    
    if (this.backendUrl.includes('onrender.com')) {
      this.log('success', 'Backend URL configurada para Render');
    } else {
      this.log('warning', 'Backend URL no parece ser de Render');
    }
  }

  generateReport() {
    console.log(chalk.blue('\n📊 Resumen de Verificación\n'));
    
    const successes = this.results.filter(r => r.status === 'success').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    
    console.log(chalk.green(`✅ Exitosos: ${successes}`));
    console.log(chalk.yellow(`⚠️  Advertencias: ${warnings}`));
    console.log(chalk.red(`❌ Errores: ${errors}`));
    
    if (errors === 0 && warnings === 0) {
      console.log(chalk.green('\n🎉 ¡Despliegue verificado exitosamente!'));
      console.log(chalk.green('Tu aplicación está lista para usar.'));
    } else if (errors === 0) {
      console.log(chalk.yellow('\n⚠️  Despliegue funcional con advertencias'));
      console.log(chalk.yellow('Revisa las advertencias para optimizar la configuración.'));
    } else {
      console.log(chalk.red('\n❌ Despliegue con errores críticos'));
      console.log(chalk.red('Revisa y corrige los errores antes de usar la aplicación.'));
    }
    
    console.log(chalk.blue('\n🔗 URLs de la aplicación:'));
    console.log(chalk.blue(`Frontend: ${this.frontendUrl}`));
    console.log(chalk.blue(`Backend: ${this.backendUrl}`));
    console.log(chalk.blue(`API Docs: ${this.backendUrl}/api-docs`));
    
    console.log(chalk.blue('\n👥 Usuarios de prueba:'));
    console.log(chalk.blue('Admin: admin@mineduc.gob.gt / admin123456'));
    console.log(chalk.blue('Editor: editor@mineduc.gob.gt / editor123456'));
    console.log(chalk.blue('Viewer: viewer@mineduc.gob.gt / viewer123456'));
  }

  async run() {
    console.log(chalk.blue('🚀 Iniciando verificación de despliegue...'));
    console.log(chalk.blue(`Frontend: ${this.frontendUrl}`));
    console.log(chalk.blue(`Backend: ${this.backendUrl}`));
    
    await this.checkBackendHealth();
    await this.checkBackendEndpoints();
    await this.checkFrontend();
    await this.checkCORS();
    await this.checkEnvironmentVariables();
    
    this.generateReport();
  }
}

// Ejecutar verificación
const verifier = new DeploymentVerifier();
verifier.run().catch(error => {
  console.error(chalk.red('Error ejecutando verificación:'), error);
  process.exit(1);
});