#!/usr/bin/env node

/**
 * SUPABASE MANAGER - Gestor Completo de Configuración (ESM)
 * 
 * Uso: node scripts/supabase-manager.mjs [comando]
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

  async showStatus() {
    console.log('\n📊 Estado Actual de Supabase\n');
    
    // Variables de entorno
    console.log('🔧 Variables de Entorno:');
    console.log(`   SUPABASE_URL: ${this.supabaseUrl ? '✅ Configurada' : '❌ Faltante'}`);
    console.log(`   SUPABASE_ANON_KEY: ${this.supabaseAnonKey ? '✅ Configurada' : '❌ Faltante'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${this.supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}`);

    // Tablas
    await this.checkTables();
    
    // RLS Status
    await this.checkRLS();
    
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

  async checkRLS() {
    console.log('\n🛡️ Row Level Security (RLS):');
    
    const tables = ['user_profiles', 'documents', 'workflows'];
    
    try {
      for (const table of tables) {
        const { data, error } = await this.supabaseAdmin
          .from('pg_tables')
          .select('tablename, rowsecurity')
          .eq('tablename', table)
          .eq('schemaname', 'public');

        if (error) {
          console.log(`   ${table}: ❌ Error verificando RLS`);
        } else if (data && data.length > 0) {
          const rlsEnabled = data[0].rowsecurity;
          console.log(`   ${table}: ${rlsEnabled ? '✅ RLS Habilitado' : '⚠️ RLS Deshabilitado'}`);
        } else {
          console.log(`   ${table}: ❌ Tabla no encontrada`);
        }
      }
    } catch (err) {
      console.log('   ❌ Error verificando estado de RLS');
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
        
        // Verificar contenido
        try {
          const { data: files, error: filesError } = await this.supabaseAdmin.storage
            .from('documents')
            .list('', { limit: 5 });

          if (!filesError) {
            console.log(`   Archivos/carpetas: ${files.length}`);
          }
        } catch (listErr) {
          console.log(`   ⚠️ No se puede listar contenido`);
        }
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
        .select('role')
        .order('created_at', { ascending: false });

      if (error) {
        console.log(`   Usuarios: ❌ Error (${error.message})`);
        return;
      }

      if (data && data.length > 0) {
        const roleCount = data.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        Object.entries(roleCount).forEach(([role, count]) => {
          console.log(`   ${role}: ${count} usuarios`);
        });
        
        console.log(`   Total: ${data.length} usuarios`);
      } else {
        console.log(`   Usuarios: ⚠️ No hay usuarios registrados`);
      }
    } catch (err) {
      console.log(`   Usuarios: ❌ Error de consulta`);
    }
  }

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
        // Verificar si ya existe
        const { data: existingUser } = await this.supabaseAdmin
          .from('user_profiles')
          .select('email')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          this.log('info', `Usuario ${user.email} ya existe, saltando...`);
          continue;
        }

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

  async setupStorage() {
    console.log('\n📁 Configurando Storage\n');
    
    try {
      const { data: buckets, error: listError } = await this.supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        this.log('error', 'Error accediendo a storage', listError.message);
        return;
      }

      const documentsBucket = buckets.find(b => b.name === 'documents');
      
      if (documentsBucket) {
        this.log('info', 'Bucket "documents" ya existe', `Público: ${documentsBucket.public}`);
        return;
      }

      if (await this.confirm('¿Crear bucket "documents"?')) {
        const { data, error } = await this.supabaseAdmin.storage.createBucket('documents', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

        if (error) {
          this.log('error', 'Error creando bucket', error.message);
        } else {
          this.log('success', 'Bucket "documents" creado exitosamente');
        }
      }
      
    } catch (error) {
      this.log('error', 'Error configurando storage', error.message);
    }
  }

  async testConnection() {
    console.log('\n🔍 Probando Conexión...\n');
    
    try {
      // Test básico
      const { data, error } = await this.supabaseAdmin
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (error) {
        this.log('error', 'Error en conexión básica', error.message);
        return false;
      }

      this.log('success', 'Conexión a Supabase exitosa');

      // Test de auth
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'dummy'
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          this.log('success', 'Sistema de autenticación funcional');
        } else {
          this.log('warning', 'Auth responde pero con error', authError.message);
        }
      }

      return true;
    } catch (err) {
      this.log('error', 'Error crítico de conexión', err.message);
      return false;
    }
  }

  showMenu() {
    console.log('\n🛠️ SUPABASE MANAGER - Gestor Completo\n');
    console.log('Comandos disponibles:');
    console.log('  status          - Ver estado actual');
    console.log('  test            - Probar conexión');
    console.log('  create-users    - Crear usuarios de prueba');
    console.log('  setup-storage   - Configurar storage bucket');
    console.log('  help            - Mostrar este menú');
    console.log('  exit            - Salir');
    console.log('\nEjemplo: node scripts/supabase-manager.mjs status');
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
      case 'test':
        await this.testConnection();
        break;
      case 'create-users':
        await this.createTestUsers();
        break;
      case 'setup-storage':
        await this.setupStorage();
        break;
      default:
        console.log(`❌ Comando desconocido: ${command}`);
        this.showMenu();
    }

    this.rl.close();
  }
}

// Ejecutar manager
const manager = new SupabaseManager();
manager.run().catch(error => {
  console.error('❌ Error ejecutando Supabase Manager:', error);
  process.exit(1);
});