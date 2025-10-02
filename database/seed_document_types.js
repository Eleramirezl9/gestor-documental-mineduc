/**
 * Script para insertar datos semilla de tipos de documentos
 * IMPORTANTE: Primero ejecuta el SQL en Supabase Dashboard
 * Luego ejecuta: node database/seed_document_types.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const documentTypes = [
  { name: 'Curriculum Vitae', category: 'Personal', description: 'CV actualizado del empleado', required: true, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'DPI (Documento Personal de Identificación)', category: 'Identificación', description: 'Copia de DPI vigente', required: true, has_expiration: false },
  { name: 'Fotografía Reciente', category: 'Personal', description: 'Fotografía tamaño cédula', required: true, has_expiration: true, renewal_period: 24, renewal_unit: 'months' },
  { name: 'Partida de Nacimiento', category: 'Identificación', description: 'Partida de nacimiento certificada', required: true, has_expiration: false },
  { name: 'Certificado de Antecedentes Penales', category: 'Legal', description: 'Certificado de antecedentes penales vigente', required: true, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Certificado de Antecedentes Policíacos', category: 'Legal', description: 'Certificado de antecedentes policíacos vigente', required: true, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Título Universitario', category: 'Académico', description: 'Título profesional universitario', required: false, has_expiration: false },
  { name: 'Diploma de Educación Media', category: 'Académico', description: 'Diploma de graduación de secundaria', required: true, has_expiration: false },
  { name: 'Certificaciones Profesionales', category: 'Académico', description: 'Certificaciones adicionales relevantes', required: false, has_expiration: true, renewal_period: 36, renewal_unit: 'months' },
  { name: 'Certificado Médico', category: 'Salud', description: 'Certificado médico de aptitud laboral', required: true, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Constancia de Trabajo Anterior', category: 'Laboral', description: 'Constancias de empleos anteriores', required: false, has_expiration: false },
  { name: 'Referencias Laborales', category: 'Laboral', description: 'Cartas de referencia de empleadores anteriores', required: false, has_expiration: false },
  { name: 'Referencias Personales', category: 'Personal', description: 'Cartas de referencia personal', required: false, has_expiration: false },
  { name: 'Solvencia Fiscal (SAT)', category: 'Legal', description: 'Solvencia fiscal emitida por SAT', required: false, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Solvencia Municipal', category: 'Legal', description: 'Solvencia municipal de residencia', required: false, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Contrato de Trabajo', category: 'Laboral', description: 'Contrato de trabajo firmado', required: true, has_expiration: false },
  { name: 'Declaración Jurada de Ingresos', category: 'Legal', description: 'Declaración jurada de ingresos', required: false, has_expiration: true, renewal_period: 12, renewal_unit: 'months' },
  { name: 'Carné de IGSS', category: 'Salud', description: 'Carné del Instituto Guatemalteco de Seguridad Social', required: true, has_expiration: false }
];

async function seedData() {
  console.log('🌱 Insertando datos semilla...\n');

  try {
    const { data, error } = await supabase
      .from('document_types')
      .upsert(documentTypes, { onConflict: 'name', ignoreDuplicates: true })
      .select();

    if (error) {
      console.error('❌ Error insertando datos:', error);
      process.exit(1);
    }

    console.log(`✅ ${data?.length || documentTypes.length} tipos de documentos insertados correctamente\n`);
    console.log('📊 Categorías insertadas:');
    console.log('   • Personal: 3 documentos');
    console.log('   • Identificación: 2 documentos');
    console.log('   • Legal: 5 documentos');
    console.log('   • Académico: 3 documentos');
    console.log('   • Salud: 2 documentos');
    console.log('   • Laboral: 3 documentos');
    console.log('\n✅ ¡Datos insertados exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedData().then(() => {
  console.log('\n✅ Script finalizado');
  process.exit(0);
});
