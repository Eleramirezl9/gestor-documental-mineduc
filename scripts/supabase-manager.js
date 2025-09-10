#!/usr/bin/env node

/**
 * SUPABASE MANAGER - Gestor Completo de Configuración
 * 
 * Este script puede:
 * - Verificar configuración actual
 * - Crear/eliminar tablas y esquemas
 * - Aplicar/resetear políticas RLS
 * - Gestionar storage y buckets
 * - Crear usuarios de prueba
 * - Exportar/importar configuraciones
 * 
 * Uso: node scripts/supabase-manager.js [comando]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class SupabaseManager {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.error('❌ Variables de entorno faltantes. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
    this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  log(status, message, details = '') {
    const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : status === 'info' ? 'ℹ️' : '❌';
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`${icon} [${timestamp}] ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async confirm(message) {
    return new Promise((resolve) => {
      this.rl.question(`${message} (y/n): `, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async loadSQLFile(filename) {
    try {
      const filePath = path.join(__dirname, '..', 'database', filename);
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      this.log('error', `Error cargando archivo ${filename}`, error.message);
      return null;
    }
  }

  // =====================================================
  // INFORMACIÓN Y ESTADO
  // =====================================================

  async showStatus() {
    console.log('\n📊 Estado Actual de Supabase\n');
    
    // Variables de entorno
    console.log('🔧 Variables de Entorno:');
    console.log(`   SUPABASE_URL: ${this.supabaseUrl ? '✅ Configurada' : '❌ Faltante'}`);
    console.log(`   SUPABASE_ANON_KEY: ${this.supabaseAnonKey ? '✅ Configurada' : '❌ Faltante'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${this.supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}`);

    // Tablas
    await this.checkTables();
    
    // Storage
    await this.checkStorage();
    
    // Usuarios
    await this.checkUsers();
  }

  async checkTables() {
    console.log('\n📋 Tablas:');
    
    const expectedTables = [
      'user_profiles', 'document_categories', 'documents', 'document_versions',
      'workflows', 'workflow_steps', 'notifications', 'audit_logs', 'system_settings'
    ];

    for (const table of expectedTables) {
      try {
        const { data, error } = await this.supabaseAdmin
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          console.log(`   ${table}: ❌ Error (${error.message})`);
        } else {
          console.log(`   ${table}: ✅ Existe`);
        }
      } catch (err) {
        console.log(`   ${table}: ❌ No accesible`);
      }
    }
  }

  async checkStorage() {
    console.log('\n📁 Storage:');
    
    try {
      const { data: buckets, error } = await this.supabaseAdmin.storage.listBuckets();
      
      if (error) {
        console.log(`   Storage: ❌ Error (${error.message})`);
        return;
      }

      console.log(`   Buckets encontrados: ${buckets.length}`);
      
      const documentsBucket = buckets.find(b => b.name === 'documents');
      if (documentsBucket) {
        console.log(`   documents bucket: ✅ Existe (${documentsBucket.public ? 'público' : 'privado'})`);
      } else {
        console.log(`   documents bucket: ❌ No existe`);
      }
    } catch (err) {
      console.log(`   Storage: ❌ Error de conexión`);
    }
  }

  async checkUsers() {
    console.log('\n👥 Usuarios:');
    
    try {
      const { data, error } = await this.supabaseAdmin
        .from('user_profiles')
        .select('role, count(*)')
        .group('role');

      if (error) {
        console.log(`   Usuarios: ❌ Error (${error.message})`);
        return;
      }

      if (data && data.length > 0) {
        data.forEach(row => {
          console.log(`   ${row.role}: ${row.count} usuarios`);
        });
      } else {
        console.log(`   Usuarios: ⚠️ No hay usuarios registrados`);
      }
    } catch (err) {
      console.log(`   Usuarios: ❌ Error de consulta`);
    }
  }

  // =====================================================
  // GESTIÓN DE ESQUEMA
  // =====================================================

  async setupSchema() {
    console.log('\n🏗️ Configurando Esquema de Base de Datos\n');
    
    if (!await this.confirm('¿Ejecutar schema.sql? Esto creará todas las tablas')) {
      return;
    }

    const schema = await this.loadSQLFile('schema.sql');
    if (!schema) return;

    try {
      // Supabase no permite múltiples statements en una sola query
      // Dividimos el SQL en statements individuales
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      this.log('info', `Ejecutando ${statements.length} declaraciones SQL...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (statement.includes('INSERT INTO') || statement.includes('CREATE TABLE') || 
            statement.includes('CREATE INDEX') || statement.includes('CREATE EXTENSION')) {
          try {
            // Para las extensiones e inserts, usar rpc
            if (statement.includes('CREATE EXTENSION')) {
              continue; // Skip extensions, deben estar habilitadas desde dashboard
            }
            
            this.log('info', `Ejecutando statement ${i + 1}/${statements.length}...`);
            
            // Ejecutar usando rpc para operaciones DDL
            const { error } = await this.supabaseAdmin.rpc('exec_sql', { 
              sql_text: statement 
            });
            
            if (error) {
              console.log(`   ⚠️ Statement ${i + 1}: ${error.message}`);
            } else {
              console.log(`   ✅ Statement ${i + 1}: Ejecutado`);
            }
          } catch (err) {
            console.log(`   ❌ Statement ${i + 1}: ${err.message}`);
          }
        }
      }

      this.log('success', 'Schema ejecutado completamente');
      this.log('info', 'Verifica manualmente en el dashboard si hay errores');
      
    } catch (error) {
      this.log('error', 'Error ejecutando schema', error.message);
    }
  }

  async resetSchema() {
    console.log('\n🗑️ Resetear Esquema\n');
    
    if (!await this.confirm('⚠️ PELIGRO: ¿Eliminar TODAS las tablas y datos? Esto es IRREVERSIBLE')) {
      return;
    }

    if (!await this.confirm('🚨 ÚLTIMA CONFIRMACIÓN: ¿Estás SEGURO? Esto eliminará TODO')) {
      return;
    }

    const tables = [
      'audit_logs', 'workflow_steps', 'workflows', 'document_versions', 
      'documents', 'document_categories', 'notifications', 'system_settings', 'user_profiles'
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabaseAdmin.rpc('exec_sql', {
          sql_text: `DROP TABLE IF EXISTS ${table} CASCADE`
        });
        
        if (error) {
          this.log('warning', `Error eliminando ${table}`, error.message);
        } else {
          this.log('success', `Tabla ${table} eliminada`);
        }
      } catch (err) {
        this.log('error', `Error crítico eliminando ${table}`, err.message);
      }
    }
  }

  // =====================================================
  // GESTIÓN DE RLS
  // =====================================================

  async setupRLS() {
    console.log('\n🛡️ Configurando Políticas RLS\n');
    
    if (!await this.confirm('¿Aplicar políticas de seguridad RLS?')) {
      return;
    }

    const rlsSQL = await this.loadSQLFile('reset_and_apply_rls_safe.sql');
    if (!rlsSQL) return;

    try {
      // Dividir en statements y ejecutar uno por uno
      const statements = rlsSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      this.log('info', `Ejecutando ${statements.length} declaraciones RLS...`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        try {
          const { error } = await this.supabaseAdmin.rpc('exec_sql', { 
            sql_text: statement 
          });
          
          if (error) {
            console.log(`   ⚠️ RLS ${i + 1}: ${error.message.substring(0, 100)}...`);
            errorCount++;
          } else {
            console.log(`   ✅ RLS ${i + 1}: OK`);
            successCount++;
          }
        } catch (err) {
          console.log(`   ❌ RLS ${i + 1}: ${err.message.substring(0, 100)}...`);
          errorCount++;
        }
      }

      this.log('success', `RLS aplicado: ${successCount} exitosos, ${errorCount} errores`);
      
    } catch (error) {
      this.log('error', 'Error ejecutando RLS', error.message);
    }
  }

  async disableRLS() {
    console.log('\n🔓 Deshabilitando RLS\n');
    
    if (!await this.confirm('¿Deshabilitar RLS en todas las tablas?')) {
      return;
    }

    const tables = [
      'user_profiles', 'document_categories', 'documents', 'document_versions',
      'workflows', 'workflow_steps', 'notifications', 'audit_logs', 'system_settings'
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabaseAdmin.rpc('exec_sql', {
          sql_text: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`
        });
        
        if (error) {
          this.log('warning', `Error deshabilitando RLS en ${table}`, error.message);
        } else {
          this.log('success', `RLS deshabilitado en ${table}`);
        }
      } catch (err) {
        this.log('error', `Error crítico con ${table}`, err.message);
      }
    }
  }

  // =====================================================
  // GESTIÓN DE STORAGE
  // =====================================================

  async setupStorage() {
    console.log('\n📁 Configurando Storage\n');
    
    try {
      // Verificar si el bucket existe
      const { data: buckets, error: listError } = await this.supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        this.log('error', 'Error accediendo a storage', listError.message);
        return;
      }

      const documentsBucket = buckets.find(b => b.name === 'documents');
      
      if (documentsBucket) {
        this.log('info', 'Bucket "documents" ya existe', `Público: ${documentsBucket.public}`);
        
        if (await this.confirm('¿Recrear el bucket? (eliminará archivos existentes)')) {
          await this.deleteStorage();
          await this.createDocumentsBucket();
        }
      } else {
        await this.createDocumentsBucket();
      }
      
    } catch (error) {
      this.log('error', 'Error configurando storage', error.message);
    }
  }

  async createDocumentsBucket() {
    try {
      const { data, error } = await this.supabaseAdmin.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif'
        ]
      });

      if (error) {
        this.log('error', 'Error creando bucket', error.message);
      } else {
        this.log('success', 'Bucket "documents" creado exitosamente');
        
        // Crear estructura de carpetas
        await this.createFolderStructure();
      }
    } catch (err) {
      this.log('error', 'Error crítico creando bucket', err.message);
    }
  }

  async createFolderStructure() {
    const folders = [
      'public/.gitkeep',
      'system/.gitkeep',
      'temp/.gitkeep'
    ];

    for (const folder of folders) {
      try {
        const { error } = await this.supabaseAdmin.storage
          .from('documents')
          .upload(folder, new Blob([''], { type: 'text/plain' }));

        if (error) {
          this.log('warning', `Error creando ${folder}`, error.message);
        } else {
          this.log('success', `Carpeta creada: ${folder}`);
        }
      } catch (err) {
        this.log('warning', `Error con carpeta ${folder}`, err.message);
      }
    }
  }

  async deleteStorage() {
    try {
      const { error } = await this.supabaseAdmin.storage.deleteBucket('documents');
      
      if (error) {
        this.log('error', 'Error eliminando bucket', error.message);
      } else {
        this.log('success', 'Bucket "documents" eliminado');
      }
    } catch (err) {
      this.log('error', 'Error crítico eliminando bucket', err.message);
    }
  }

  // =====================================================
  // GESTIÓN DE USUARIOS
  // =====================================================

  async createTestUsers() {
    console.log('\n👥 Creando Usuarios de Prueba\n');
    
    if (!await this.confirm('¿Crear usuarios de prueba (admin, editor, viewer)?')) {
      return;
    }

    const testUsers = [
      {
        email: 'admin@mineduc.gob.gt',
        password: 'admin123456',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'MINEDUC',
        department: 'Administración'
      },
      {
        email: 'editor@mineduc.gob.gt',
        password: 'editor123456',
        role: 'editor',
        first_name: 'Editor',
        last_name: 'MINEDUC',
        department: 'Documentación'
      },
      {
        email: 'viewer@mineduc.gob.gt',
        password: 'viewer123456',
        role: 'viewer',
        first_name: 'Viewer',
        last_name: 'MINEDUC',
        department: 'Consulta'
      }
    ];

    for (const user of testUsers) {
      try {
        // Crear usuario en auth
        const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (authError) {
          this.log('warning', `Error creando auth para ${user.email}`, authError.message);
          continue;
        }

        // Crear perfil
        const { error: profileError } = await this.supabaseAdmin
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            department: user.department,
            is_active: true
          });

        if (profileError) {
          this.log('warning', `Error creando perfil para ${user.email}`, profileError.message);
        } else {
          this.log('success', `Usuario creado: ${user.email} (${user.role})`);
        }

      } catch (err) {
        this.log('error', `Error crítico con ${user.email}`, err.message);
      }
    }
  }

  async listUsers() {
    console.log('\n👥 Usuarios Existentes:\n');
    
    try {
      const { data, error } = await this.supabaseAdmin
        .from('user_profiles')
        .select('email, role, first_name, last_name, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        this.log('error', 'Error obteniendo usuarios', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log('   No hay usuarios registrados');
        return;
      }

      data.forEach((user, index) => {
        const status = user.is_active ? '🟢' : '🔴';
        const date = new Date(user.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${status} ${user.email}`);
        console.log(`      Nombre: ${user.first_name} ${user.last_name}`);
        console.log(`      Rol: ${user.role} | Creado: ${date}`);
        console.log('');
      });

    } catch (err) {
      this.log('error', 'Error crítico listando usuarios', err.message);
    }
  }

  // =====================================================
  // UTILIDADES AVANZADAS
  // =====================================================

  async exportConfig() {
    console.log('\n📤 Exportando Configuración\n');
    
    try {
      const config = {
        timestamp: new Date().toISOString(),
        supabase_url: this.supabaseUrl,
        tables: {},
        users: [],
        storage: {}
      };

      // Exportar estructura de tablas
      const tables = ['user_profiles', 'document_categories', 'documents'];
      for (const table of tables) {
        try {
          const { data, error } = await this.supabaseAdmin
            .from(table)
            .select('*')
            .limit(5);

          if (!error) {
            config.tables[table] = {
              count: data.length,
              sample: data
            };
          }
        } catch (err) {
          // Ignorar errores de tablas individuales
        }
      }

      // Exportar usuarios
      const { data: users } = await this.supabaseAdmin
        .from('user_profiles')
        .select('email, role, first_name, last_name, is_active');

      if (users) {
        config.users = users;
      }

      // Exportar info de storage
      const { data: buckets } = await this.supabaseAdmin.storage.listBuckets();
      if (buckets) {
        config.storage.buckets = buckets.map(b => ({ name: b.name, public: b.public }));
      }

      const configPath = path.join(__dirname, '..', 'supabase-config-export.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      this.log('success', `Configuración exportada a: ${configPath}`);

    } catch (error) {
      this.log('error', 'Error exportando configuración', error.message);
    }
  }

  async runFullSetup() {
    console.log('\n🚀 Configuración Completa Automática\n');
    console.log('Este proceso configurará todo desde cero:');
    console.log('1. Esquema de base de datos');
    console.log('2. Políticas RLS');
    console.log('3. Storage bucket');
    console.log('4. Usuarios de prueba');
    
    if (!await this.confirm('\n¿Continuar con la configuración completa?')) {
      return;
    }

    this.log('info', 'Iniciando configuración completa...');
    
    await this.setupSchema();
    await this.setupRLS();
    await this.setupStorage();
    await this.createTestUsers();
    
    this.log('success', '🎉 Configuración completa terminada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Verifica en el dashboard de Supabase que todo se creó correctamente');
    console.log('2. Ejecuta: node scripts/verify-deployment.js');
    console.log('3. Prueba el login con: admin@mineduc.gob.gt / admin123456');
  }

  // =====================================================
  // INTERFAZ DE COMANDOS
  // =====================================================

  showMenu() {
    console.log('\n🛠️ SUPABASE MANAGER - Gestor Completo\n');
    console.log('Comandos disponibles:');
    console.log('  status          - Ver estado actual');
    console.log('  setup-schema    - Crear tablas del esquema');
    console.log('  reset-schema    - ⚠️ ELIMINAR todas las tablas');
    console.log('  setup-rls       - Aplicar políticas de seguridad');
    console.log('  disable-rls     - Deshabilitar RLS');
    console.log('  setup-storage   - Configurar storage bucket');
    console.log('  create-users    - Crear usuarios de prueba');
    console.log('  list-users      - Listar usuarios existentes');
    console.log('  export-config   - Exportar configuración actual');
    console.log('  full-setup      - 🚀 Configuración completa automática');
    console.log('  help            - Mostrar este menú');
    console.log('  exit            - Salir');
    console.log('\nEjemplo: node scripts/supabase-manager.js status');
  }

  async run() {
    const command = process.argv[2];

    if (!command || command === 'help') {
      this.showMenu();
      this.rl.close();
      return;
    }

    switch (command) {
      case 'status':
        await this.showStatus();
        break;
      case 'setup-schema':
        await this.setupSchema();
        break;
      case 'reset-schema':
        await this.resetSchema();
        break;
      case 'setup-rls':
        await this.setupRLS();
        break;
      case 'disable-rls':
        await this.disableRLS();
        break;
      case 'setup-storage':
        await this.setupStorage();
        break;
      case 'create-users':
        await this.createTestUsers();
        break;
      case 'list-users':
        await this.listUsers();
        break;
      case 'export-config':
        await this.exportConfig();
        break;
      case 'full-setup':
        await this.runFullSetup();
        break;
      default:
        console.log(`❌ Comando desconocido: ${command}`);
        this.showMenu();
    }

    this.rl.close();
  }
}

// Ejecutar manager
if (require.main === module) {
  const manager = new SupabaseManager();
  manager.run().catch(error => {
    console.error('❌ Error ejecutando Supabase Manager:', error);
    process.exit(1);
  });
}

module.exports = SupabaseManager;