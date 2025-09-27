import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function in Supabase...');

  const sqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text, sql_params json DEFAULT '[]'::json)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        EXECUTE sql_query INTO result USING sql_params;
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object('error', SQLERRM);
    END;
    $$;
  `;

  try {
    const { data, error } = await supabase.rpc('exec', { sql: sqlFunction });

    if (error) {
      // Try alternative approach with direct query
      const { data: result, error: queryError } = await supabase
        .from('information_schema.routines')
        .select('*')
        .limit(1);

      if (queryError) {
        console.error('❌ Error creating function:', error.message);
        console.log('\n📝 Please execute this SQL manually in your Supabase SQL Editor:');
        console.log('\n' + sqlFunction);
        return;
      }
    }

    console.log('✅ exec_sql function created successfully!');

    // Test the function
    console.log('🧪 Testing function...');
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT current_timestamp as test_time'
    });

    if (testError) {
      console.log('⚠️  Function created but test failed. You may need to create it manually.');
      console.log('📝 Execute this in your Supabase SQL Editor:');
      console.log('\n' + sqlFunction);
    } else {
      console.log('🎉 Function working correctly!', testData);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📝 Please execute this SQL manually in your Supabase SQL Editor:');
    console.log('\n' + sqlFunction);
  }
}

createExecSqlFunction();