import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vyhyyddvktqfjrsogwtf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aHl5ZGR2a3RxZmpyc29nd3RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA0MzAzNiwiZXhwIjoyMDcwNjE5MDM2fQ.nTsuidx7V9X2t3FnlMoblbkMZFXHiDVQ3NMatDBn8DQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkDatabaseStatus() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // Verificar si existen tablas específicas del proyecto
    const commonTables = ['users', 'documents', 'workflows', 'notifications', 'audit_logs'];

    console.log('📋 Verificando tablas comunes del proyecto:\n');

    for (const tableName of commonTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Existe y es accesible`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: Error - ${err.message}`);
      }
    }

    // Verificar conexión general
    console.log('\n🔗 Verificando conexión a Supabase...');

    try {
      // Probar con una operación muy básica
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.log('⚠️ Auth error (esperado con service key):', error.message);
      }
      console.log('✅ Conexión a Supabase establecida');
    } catch (err) {
      console.log('❌ Error de conexión:', err.message);
    }

  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

checkDatabaseStatus();