/**
 * Script de migración: Crear registros en tabla 'documents' para documentos de empleados
 * que solo existen en 'employee_documents' y actualizar las referencias en
 * 'employee_document_requirements'
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateEmployeeDocuments() {
  console.log('🔄 Iniciando migración de documentos de empleados...\n');

  try {
    // 0. Obtener un usuario del sistema para usar como created_by
    console.log('👤 Buscando usuario del sistema en auth.users...');

    let systemUserId = null;

    // Buscar directamente en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !authUsers || authUsers.users.length === 0) {
      console.error('❌ No se pudo obtener usuarios de auth.users');
      throw new Error('No hay usuarios autenticados en el sistema. No se puede continuar con la migración.');
    }

    // Usar el primer usuario encontrado
    systemUserId = authUsers.users[0].id;
    console.log(`✅ Usuario del sistema encontrado: ${systemUserId} (${authUsers.users[0].email})\n`);

    // 1. Obtener todos los requirements que tienen status 'approved' pero document_id es NULL
    console.log('📋 Buscando requirements aprobados sin document_id...');

    const { data: requirements, error: reqError } = await supabase
      .from('employee_document_requirements')
      .select('*')
      .eq('status', 'approved')
      .is('document_id', null);

    if (reqError) {
      console.error('❌ Error obteniendo requirements:', reqError);
      throw reqError;
    }

    console.log(`✅ Encontrados ${requirements.length} requirements a migrar\n`);

    if (requirements.length === 0) {
      console.log('✨ No hay documentos para migrar. Todo está actualizado.');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // 2. Para cada requirement, buscar el documento correspondiente en employee_documents
    for (const req of requirements) {
      console.log(`\n📄 Procesando: ${req.document_type} (ID: ${req.id})`);

      // Buscar documento en employee_documents por requirement_id
      const { data: empDocs, error: empDocError } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('requirement_id', req.id)
        .order('upload_date', { ascending: false })
        .limit(1);

      if (empDocError) {
        console.error('  ❌ Error buscando en employee_documents:', empDocError.message);
        errorCount++;
        continue;
      }

      if (!empDocs || empDocs.length === 0) {
        console.log('  ⚠️  No se encontró documento asociado en employee_documents');
        continue;
      }

      const empDoc = empDocs[0];
      console.log(`  📎 Encontrado archivo: ${empDoc.file_name}`);

      // 3. Crear registro en tabla 'documents'
      const documentData = {
        title: req.document_type,
        description: `Documento de empleado migrado - ${req.document_type}`,
        file_name: empDoc.file_name,
        file_path: empDoc.file_path,
        file_size: empDoc.file_size,
        file_type: path.extname(empDoc.file_name).substring(1).toUpperCase() || 'UNKNOWN',
        mime_type: empDoc.mime_type,
        status: 'approved', // Ya está aprobado
        is_public: false,
        created_by: systemUserId // Usuario del sistema para created_by
      };

      console.log('  💾 Creando registro en tabla "documents"...');

      const { data: newDoc, error: newDocError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (newDocError) {
        console.error('  ❌ Error creando documento:', newDocError.message);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Documento creado con ID: ${newDoc.id}`);

      // 4. Actualizar el requirement con el nuevo document_id
      console.log('  🔗 Actualizando reference en employee_document_requirements...');

      const { error: updateError } = await supabase
        .from('employee_document_requirements')
        .update({ document_id: newDoc.id })
        .eq('id', req.id);

      if (updateError) {
        console.error('  ❌ Error actualizando requirement:', updateError.message);
        errorCount++;
        continue;
      }

      console.log('  ✅ Requirement actualizado correctamente');
      migratedCount++;
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Documentos migrados exitosamente: ${migratedCount}`);
    console.log(`❌ Errores encontrados: ${errorCount}`);
    console.log(`📋 Total procesados: ${requirements.length}`);
    console.log('='.repeat(60) + '\n');

    if (migratedCount > 0) {
      console.log('🎉 Migración completada con éxito!');
      console.log('💡 Los documentos ahora deberían aparecer en los reportes PDF.\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
console.log('\n' + '='.repeat(60));
console.log('🚀 SCRIPT DE MIGRACIÓN DE DOCUMENTOS');
console.log('='.repeat(60) + '\n');

migrateEmployeeDocuments()
  .then(() => {
    console.log('✨ Script finalizado.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando script:', error);
    process.exit(1);
  });
