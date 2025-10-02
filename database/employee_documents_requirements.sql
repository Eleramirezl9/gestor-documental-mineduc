-- =====================================================
-- ESQUEMA PARA GESTIÓN DE DOCUMENTOS REQUERIDOS DE EMPLEADOS
-- Sistema MINEDUC - Gestión Documental
-- =====================================================

-- Tabla: document_types (Tipos/catálogo de documentos)
CREATE TABLE IF NOT EXISTS document_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    has_expiration BOOLEAN DEFAULT false,
    renewal_period INTEGER, -- en meses
    renewal_unit VARCHAR(20) DEFAULT 'months',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: document_templates (Plantillas de documentos por cargo)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    icon VARCHAR(50) DEFAULT 'template',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: template_documents (Documentos incluidos en una plantilla)
CREATE TABLE IF NOT EXISTS template_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
    has_custom_renewal BOOLEAN DEFAULT false,
    custom_renewal_period INTEGER,
    custom_renewal_unit VARCHAR(20) DEFAULT 'months',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, document_type_id)
);

-- Tabla: employee_document_requirements (Documentos asignados a empleados)
CREATE TABLE IF NOT EXISTS employee_document_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL, -- Código de empleado (ej: EMP-001)
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

-- Tabla: employee_documents (Documentos físicos subidos)
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requirement_id UUID REFERENCES employee_document_requirements(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL,
    document_type_id UUID REFERENCES document_types(id),
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL, -- Ruta en Supabase Storage
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

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category);
CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active);
CREATE INDEX IF NOT EXISTS idx_template_documents_template ON template_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_employee ON employee_document_requirements(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_requirements_status ON employee_document_requirements(status);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_status ON employee_documents(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON document_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_requirements_updated_at BEFORE UPDATE ON employee_document_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para document_types (todos pueden leer, solo admins pueden escribir)
CREATE POLICY "Anyone can view document types" ON document_types
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert document types" ON document_types
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

CREATE POLICY "Admins can update document types" ON document_types
    FOR UPDATE USING (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

-- Políticas para document_templates
CREATE POLICY "Anyone can view templates" ON document_templates
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage templates" ON document_templates
    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

-- Políticas para template_documents
CREATE POLICY "Anyone can view template documents" ON template_documents
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage template documents" ON template_documents
    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

-- Políticas para employee_document_requirements
CREATE POLICY "Anyone can view employee requirements" ON employee_document_requirements
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage employee requirements" ON employee_document_requirements
    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

-- Políticas para employee_documents
CREATE POLICY "Anyone can view employee documents" ON employee_documents
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage employee documents" ON employee_documents
    FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@mineduc.gob.gt');

-- =====================================================
-- DATOS SEMILLA (SEED DATA)
-- =====================================================

-- Insertar tipos de documentos por defecto
INSERT INTO document_types (name, category, description, required, has_expiration, renewal_period, renewal_unit) VALUES
('Curriculum Vitae', 'Personal', 'CV actualizado del empleado', true, true, 12, 'months'),
('DPI (Documento Personal de Identificación)', 'Identificación', 'Copia de DPI vigente', true, false, NULL, NULL),
('Fotografía Reciente', 'Personal', 'Fotografía tamaño cédula', true, true, 24, 'months'),
('Partida de Nacimiento', 'Identificación', 'Partida de nacimiento certificada', true, false, NULL, NULL),
('Certificado de Antecedentes Penales', 'Legal', 'Certificado de antecedentes penales vigente', true, true, 12, 'months'),
('Certificado de Antecedentes Policíacos', 'Legal', 'Certificado de antecedentes policíacos vigente', true, true, 12, 'months'),
('Título Universitario', 'Académico', 'Título profesional universitario', false, false, NULL, NULL),
('Diploma de Educación Media', 'Académico', 'Diploma de graduación de secundaria', true, false, NULL, NULL),
('Certificaciones Profesionales', 'Académico', 'Certificaciones adicionales relevantes', false, true, 36, 'months'),
('Certificado Médico', 'Salud', 'Certificado médico de aptitud laboral', true, true, 12, 'months'),
('Constancia de Trabajo Anterior', 'Laboral', 'Constancias de empleos anteriores', false, false, NULL, NULL),
('Referencias Laborales', 'Laboral', 'Cartas de referencia de empleadores anteriores', false, false, NULL, NULL),
('Referencias Personales', 'Personal', 'Cartas de referencia personal', false, false, NULL, NULL),
('Solvencia Fiscal (SAT)', 'Legal', 'Solvencia fiscal emitida por SAT', false, true, 12, 'months'),
('Solvencia Municipal', 'Legal', 'Solvencia municipal de residencia', false, true, 12, 'months'),
('Contrato de Trabajo', 'Laboral', 'Contrato de trabajo firmado', true, false, NULL, NULL),
('Declaración Jurada de Ingresos', 'Legal', 'Declaración jurada de ingresos', false, true, 12, 'months'),
('Carné de IGSS', 'Salud', 'Carné del Instituto Guatemalteco de Seguridad Social', true, false, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE document_types IS 'Catálogo de tipos de documentos requeridos';
COMMENT ON TABLE document_templates IS 'Plantillas de documentos por cargo/puesto';
COMMENT ON TABLE template_documents IS 'Relación entre plantillas y tipos de documentos';
COMMENT ON TABLE employee_document_requirements IS 'Documentos requeridos asignados a empleados';
COMMENT ON TABLE employee_documents IS 'Documentos físicos subidos por/para empleados';
