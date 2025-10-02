/**
 * Script para crear tablas de documentos de empleados en Supabase
 * Ejecutar con: node database/setup_employee_docs.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTables() {
  console.log('🚀 Iniciando configuración de base de datos...\n');

  try {
    // 1. Crear tabla document_types
    console.log('📝 Creando tabla document_types...');
    const { error: docTypesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS document_types (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          required BOOLEAN DEFAULT false,
          has_expiration BOOLEAN DEFAULT false,
          renewal_period INTEGER,
          renewal_unit VARCHAR(20) DEFAULT 'months',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category);
        CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active);
      `
    });

    if (docTypesError) {
      console.error('❌ Error creando document_types:', docTypesError);
    } else {
      console.log('✅ Tabla document_types creada\n');
    }

    // 2. Crear tabla document_templates
    console.log('📝 Creando tabla document_templates...');
    const { error: templatesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS document_templates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          icon VARCHAR(50) DEFAULT 'template',
          is_active BOOLEAN DEFAULT true,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (templatesError) {
      console.error('❌ Error creando document_templates:', templatesError);
    } else {
      console.log('✅ Tabla document_templates creada\n');
    }

    // 3. Crear tabla template_documents
    console.log('📝 Creando tabla template_documents...');
    const { error: templateDocsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS template_documents (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
          document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
          has_custom_renewal BOOLEAN DEFAULT false,
          custom_renewal_period INTEGER,
          custom_renewal_unit VARCHAR(20) DEFAULT 'months',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(template_id, document_type_id)
        );

        CREATE INDEX IF NOT EXISTS idx_template_documents_template ON template_documents(template_id);
      `
    });

    if (templateDocsError) {
      console.error('❌ Error creando template_documents:', templateDocsError);
    } else {
      console.log('✅ Tabla template_documents creada\n');
    }

    // 4. Crear tabla employee_document_requirements
    console.log('📝 Creando tabla employee_document_requirements...');
    const { error: requirementsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS employee_document_requirements (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          employee_id VARCHAR(50) NOT NULL,
          document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
          due_date DATE,
          status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'subido', 'aprobado', 'rechazado', 'vencido')),
          notes TEXT,
          assigned_by UUID REFERENCES auth.users(id),
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(employee_id, document_type_id)
        );

        CREATE INDEX IF NOT EXISTS idx_employee_requirements_employee ON employee_document_requirements(employee_id);
        CREATE INDEX IF NOT EXISTS idx_employee_requirements_status ON employee_document_requirements(status);
      `
    });

    if (requirementsError) {
      console.error('❌ Error creando employee_document_requirements:', requirementsError);
    } else {
      console.log('✅ Tabla employee_document_requirements creada\n');
    }

    // 5. Crear tabla employee_documents
    console.log('📝 Creando tabla employee_documents...');
    const { error: docsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS employee_documents (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          requirement_id UUID REFERENCES employee_document_requirements(id) ON DELETE CASCADE,
          employee_id VARCHAR(50) NOT NULL,
          document_type_id UUID REFERENCES document_types(id),
          file_name VARCHAR(500) NOT NULL,
          file_path VARCHAR(1000) NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          version INTEGER DEFAULT 1,
          upload_date TIMESTAMPTZ DEFAULT NOW(),
          expiration_date DATE,
          status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
          approval_notes TEXT,
          uploaded_by UUID REFERENCES auth.users(id),
          approved_by UUID REFERENCES auth.users(id),
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
        CREATE INDEX IF NOT EXISTS idx_employee_documents_status ON employee_documents(status);
      `
    });

    if (docsError) {
      console.error('❌ Error creando employee_documents:', docsError);
    } else {
      console.log('✅ Tabla employee_documents creada\n');
    }

    // 6. Insertar datos semilla
    console.log('📝 Insertando datos semilla...');
    const { error: seedError } = await supabase
      .from('document_types')
      .upsert([
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
      ], { onConflict: 'name', ignoreDuplicates: true });

    if (seedError) {
      console.error('❌ Error insertando datos semilla:', seedError);
    } else {
      console.log('✅ Datos semilla insertados (18 tipos de documentos)\n');
    }

    console.log('🎉 ¡Configuración completada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log('   ✅ 5 tablas creadas');
    console.log('   ✅ 18 tipos de documentos insertados');
    console.log('   ✅ Índices creados para optimización');
    console.log('\n💡 Ahora puedes usar el sistema de documentos requeridos en /employees\n');

  } catch (error) {
    console.error('❌ Error general en la configuración:', error);
    process.exit(1);
  }
}

// Ejecutar configuración
setupTables().then(() => {
  console.log('✅ Script finalizado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
