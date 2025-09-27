import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vyhyyddvktqfjrsogwtf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aHl5ZGR2a3RxZmpyc29nd3RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA0MzAzNiwiZXhwIjoyMDcwNjE5MDM2fQ.nTsuidx7V9X2t3FnlMoblbkMZFXHiDVQ3NMatDBn8DQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listTables() {
  try {
    console.log('🔍 Consultando tablas de la base de datos...\n');

    // Query para obtener todas las tablas del esquema público
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT
          schemaname,
          tablename,
          tableowner,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (error) {
      console.log('❌ Error con RPC, intentando método alternativo...');

      // Método alternativo usando information_schema
      const { data: altData, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (altError) {
        throw new Error(`No se pudieron consultar las tablas: ${altError.message}`);
      }

      console.log(`📊 Encontré ${altData.length} tablas:\n`);
      altData.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name} (${table.table_type})`);
      });

      return altData.length;
    }

    console.log(`📊 Encontré ${data.length} tablas:\n`);
    data.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename} (schema: ${table.schemaname})`);
      if (table.hasindexes) console.log(`   └─ Tiene índices`);
      if (table.hastriggers) console.log(`   └─ Tiene triggers`);
    });

    return data.length;

  } catch (err) {
    console.error('❌ Error:', err.message);
    return 0;
  }
}

listTables().then(count => {
  console.log(`\n✅ Total de tablas: ${count}`);
});