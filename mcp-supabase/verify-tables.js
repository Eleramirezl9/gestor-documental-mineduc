import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying available tables and testing MCP functionality...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test common application tables
const testTables = [
  'user_profiles',
  'document_categories',
  'documents',
  'workflows',
  'notifications',
  'audit_logs'
];

async function verifyTables() {
  console.log('📋 Testing available tables...\n');

  const results = [];

  for (const tableName of testTables) {
    try {
      console.log(`🔍 Testing table: ${tableName}`);

      // Test basic SELECT
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({ table: tableName, status: 'error', error: error.message });
      } else {
        console.log(`   ✅ Available - Records: ${count ?? 'unknown'}`);
        results.push({ table: tableName, status: 'success', count });

        // Test actual data fetch for successful tables
        const { data: sampleData, error: dataError } = await supabase
          .from(tableName)
          .select('*')
          .limit(2);

        if (!dataError && sampleData?.length > 0) {
          console.log(`   📄 Sample columns: ${Object.keys(sampleData[0]).slice(0, 3).join(', ')}...`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      results.push({ table: tableName, status: 'exception', error: err.message });
    }

    console.log(''); // Empty line for readability
  }

  return results;
}

async function testMCPOperations(workingTable) {
  console.log(`\n🧪 Testing MCP operations with table: ${workingTable}\n`);

  try {
    // Test 1: Simple SELECT
    console.log('1. Testing SELECT...');
    const { data: selectData, error: selectError } = await supabase
      .from(workingTable)
      .select('*')
      .limit(3);

    console.log(selectError ? `   ❌ ${selectError.message}` : `   ✅ Success - ${selectData?.length || 0} records`);

    // Test 2: COUNT
    console.log('2. Testing COUNT...');
    const { count, error: countError } = await supabase
      .from(workingTable)
      .select('*', { count: 'exact', head: true });

    console.log(countError ? `   ❌ ${countError.message}` : `   ✅ Success - ${count} total records`);

    // Test 3: Filtered query (if we have data)
    if (selectData && selectData.length > 0) {
      console.log('3. Testing FILTERED query...');
      const firstColumn = Object.keys(selectData[0])[0];
      const firstValue = selectData[0][firstColumn];

      const { data: filteredData, error: filterError } = await supabase
        .from(workingTable)
        .select('*')
        .eq(firstColumn, firstValue)
        .limit(1);

      console.log(filterError ? `   ❌ ${filterError.message}` : `   ✅ Success - Filtered by ${firstColumn}`);
    }

    return true;
  } catch (err) {
    console.error(`❌ MCP Operations failed: ${err.message}`);
    return false;
  }
}

async function runVerification() {
  const results = await verifyTables();

  console.log('\n📊 Summary:\n');

  const successfulTables = results.filter(r => r.status === 'success');
  const errorTables = results.filter(r => r.status !== 'success');

  if (successfulTables.length > 0) {
    console.log('✅ Available tables:');
    successfulTables.forEach(r => {
      console.log(`   • ${r.table} (${r.count ?? 'unknown'} records)`);
    });
  }

  if (errorTables.length > 0) {
    console.log('\n❌ Unavailable tables:');
    errorTables.forEach(r => {
      console.log(`   • ${r.table}: ${r.error}`);
    });
  }

  // Test MCP operations with the first working table
  if (successfulTables.length > 0) {
    const workingTable = successfulTables[0].table;
    const mcpWorking = await testMCPOperations(workingTable);

    console.log('\n🎯 MCP Status:');
    console.log(`Connection: ✅ Success`);
    console.log(`Tables available: ${successfulTables.length}/${testTables.length}`);
    console.log(`Operations: ${mcpWorking ? '✅ Working' : '❌ Failed'}`);

    if (mcpWorking) {
      console.log('\n🎉 MCP Supabase is ready to use!');
      console.log('\n💡 Recommended tables for MCP operations:');
      successfulTables.slice(0, 3).forEach(r => {
        console.log(`   • ${r.table}`);
      });
    }
  } else {
    console.log('\n⚠️  No tables are available. You may need to:');
    console.log('   1. Run the database schema setup (database/schema.sql)');
    console.log('   2. Check RLS policies');
    console.log('   3. Verify service role key permissions');
  }
}

runVerification().catch(console.error);