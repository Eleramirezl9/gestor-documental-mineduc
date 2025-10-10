/**
 * Test directo del endpoint de aprobar documento
 * Para depuración del error 500
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testApprove() {
  console.log('🧪 Probando aprobación de documento directamente en la DB...\n');

  // ID del documento del error
  const requirementId = '5cb0c5b2-ab2e-46fa-b713-caa66b8468ee';
  const userId = '9c9caad5-b16a-47c7-ba34-430419ab4549'; // admin@mineduc.gob.gt

  try {
    // 1. Verificar que el documento existe
    console.log('1️⃣  Buscando documento...');
    const { data: doc, error: fetchError } = await supabase
      .from('employee_document_requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (fetchError) {
      console.error('❌ Error buscando documento:', fetchError);
      return;
    }

    if (!doc) {
      console.error('❌ Documento no encontrado');
      return;
    }

    console.log('✅ Documento encontrado:', {
      id: doc.id,
      document_type: doc.document_type,
      status: doc.status,
      employee_id: doc.employee_id
    });

    // 2. Intentar actualizar el documento
    console.log('\n2️⃣  Intentando aprobar documento...');
    const { data: updated, error: updateError } = await supabase
      .from('employee_document_requirements')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        updated_by: userId
      })
      .eq('id', requirementId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error actualizando:', updateError);
      console.error('Detalles:', JSON.stringify(updateError, null, 2));
      return;
    }

    console.log('✅ Documento aprobado exitosamente:', {
      id: updated.id,
      status: updated.status,
      approved_at: updated.approved_at,
      approved_by: updated.approved_by
    });

    // 3. Verificar el cambio
    console.log('\n3️⃣  Verificando cambio en la BD...');
    const { data: verified, error: verifyError } = await supabase
      .from('employee_document_requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
      return;
    }

    console.log('✅ Verificación exitosa:', {
      status: verified.status,
      approved_at: verified.approved_at,
      approved_by: verified.approved_by
    });

    console.log('\n✅ ¡Prueba completada exitosamente!');
    console.log('\nCONCLUSIÓN: El problema NO está en la base de datos.');
    console.log('El problema está en el endpoint del backend.');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

testApprove();
