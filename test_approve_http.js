/**
 * Test del endpoint HTTP de aprobar documento
 */

require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function test() {
  console.log('🧪 Probando endpoint HTTP de aprobar documento...\n');

  try {
    // 1. Autenticar para obtener token
    console.log('1️⃣  Autenticando...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@mineduc.gob.gt',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      return;
    }

    const token = authData.session.access_token;
    console.log('✅ Autenticado. Token:', token.substring(0, 20) + '...');

    // 2. Hacer solicitud al endpoint
    const requirementId = '5cb0c5b2-ab2e-46fa-b713-caa66b8468ee';
    console.log('\n2️⃣  Haciendo solicitud PUT a /api/employee-documents/requirement/' + requirementId + '/approve');

    const response = await axios.put(
      `${API_URL}/api/employee-documents/requirement/${requirementId}/approve`,
      { notes: 'Test de aprobación' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Respuesta exitosa:', response.status);
    console.log('Datos:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error en la solicitud:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('\nError completo:', error.message);

    if (error.response?.data?.details) {
      console.error('\n📋 Stack trace del backend:');
      console.error(error.response.data.details);
    }
  }
}

test();
