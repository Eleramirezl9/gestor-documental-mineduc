const { supabaseAdmin, testConnection } = require('../config/supabase');

class HealthService {
  async checkDatabaseHealth() {
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        return {
          status: 'error',
          message: 'No se puede conectar a la base de datos',
          timestamp: new Date().toISOString()
        };
      }

      // Verificar que las tablas principales existan
      const { data: tables, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['user_profiles', 'documents', 'workflows']);

      if (error || !tables || tables.length < 3) {
        return {
          status: 'warning',
          message: 'Algunas tablas principales no están disponibles',
          details: { tablesFound: tables?.length || 0, expectedTables: 3 },
          timestamp: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: 'Base de datos funcionando correctamente',
        details: { tablesFound: tables.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error verificando salud de la base de datos',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkStorageHealth() {
    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      
      if (error) {
        return {
          status: 'error',
          message: 'No se puede acceder al storage',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
      if (!documentsBucket) {
        return {
          status: 'warning',
          message: 'Bucket de documentos no encontrado',
          timestamp: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: 'Storage funcionando correctamente',
        details: { bucketsFound: buckets.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error verificando salud del storage',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkEnvironmentVariables() {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ];

    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      return {
        status: 'error',
        message: 'Variables de entorno faltantes',
        details: { missing },
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'Variables de entorno configuradas correctamente',
      timestamp: new Date().toISOString()
    };
  }

  async getFullHealthCheck() {
    const [database, storage, environment] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
      this.checkEnvironmentVariables()
    ]);

    const overall = [database, storage, environment].every(check => check.status === 'healthy')
      ? 'healthy'
      : [database, storage, environment].some(check => check.status === 'error')
      ? 'error'
      : 'warning';

    return {
      overall,
      checks: {
        database,
        storage,
        environment
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new HealthService();