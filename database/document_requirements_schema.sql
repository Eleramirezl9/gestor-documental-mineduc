-- =====================================================
-- ESQUEMA PARA GESTIÓN INTELIGENTE DE DOCUMENTOS Y RECORDATORIOS
-- Sistema de documentos requeridos, vencimientos y notificaciones automáticas
-- =====================================================

-- =====================================================
-- TABLA: document_types
-- Tipos de documentos requeridos por la organización
-- =====================================================
CREATE TABLE document_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES document_categories(id),
    
    -- Configuración de vencimiento
    validity_period_months INTEGER, -- Duración en meses antes de vencer
    requires_renewal BOOLEAN DEFAULT true,
    
    -- Configuración de recordatorios
    reminder_before_days INTEGER DEFAULT 7, -- Días antes de vencer para enviar recordatorio
    urgent_reminder_days INTEGER DEFAULT 1, -- Días antes para recordatorio urgente
    
    -- Aplicabilidad
    required_for_roles JSONB DEFAULT '["admin", "editor", "viewer"]'::jsonb,
    required_for_departments JSONB DEFAULT '[]'::jsonb, -- Vacío = todos los departamentos
    
    is_mandatory BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para document_types
CREATE INDEX idx_document_types_category ON document_types(category_id);
CREATE INDEX idx_document_types_active ON document_types(is_active);
CREATE INDEX idx_document_types_mandatory ON document_types(is_mandatory);

-- =====================================================
-- TABLA: user_document_requirements
-- Documentos requeridos específicos para cada usuario
-- =====================================================
CREATE TABLE user_document_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    
    -- Estado del documento
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
    current_document_id UUID REFERENCES documents(id), -- Documento actual subido
    
    -- Fechas importantes
    required_date DATE NOT NULL, -- Fecha límite para entregar
    submitted_date TIMESTAMPTZ, -- Fecha de entrega
    approved_date TIMESTAMPTZ, -- Fecha de aprobación
    expiration_date DATE, -- Fecha de vencimiento del documento actual
    next_renewal_date DATE, -- Próxima fecha de renovación
    
    -- Seguimiento
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMPTZ,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, document_type_id)
);

-- Índices para user_document_requirements
CREATE INDEX idx_user_doc_req_user_id ON user_document_requirements(user_id);
CREATE INDEX idx_user_doc_req_type_id ON user_document_requirements(document_type_id);
CREATE INDEX idx_user_doc_req_status ON user_document_requirements(status);
CREATE INDEX idx_user_doc_req_expiration ON user_document_requirements(expiration_date);
CREATE INDEX idx_user_doc_req_renewal ON user_document_requirements(next_renewal_date);

-- =====================================================
-- TABLA: document_reminders
-- Histórico de recordatorios enviados
-- =====================================================
CREATE TABLE document_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_document_requirement_id UUID REFERENCES user_document_requirements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('initial', 'warning', 'urgent', 'expired', 'renewal')),
    days_before_expiration INTEGER,
    
    notification_id UUID REFERENCES notifications(id), -- Referencia a la notificación enviada
    
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para document_reminders
CREATE INDEX idx_document_reminders_user_req ON document_reminders(user_document_requirement_id);
CREATE INDEX idx_document_reminders_user_id ON document_reminders(user_id);
CREATE INDEX idx_document_reminders_type ON document_reminders(reminder_type);
CREATE INDEX idx_document_reminders_sent_at ON document_reminders(sent_at);

-- =====================================================
-- TABLA: department_document_policies
-- Políticas de documentos por departamento
-- =====================================================
CREATE TABLE department_document_policies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    
    -- Configuración específica del departamento
    validity_period_months INTEGER, -- Anula la configuración global si se especifica
    reminder_before_days INTEGER,
    urgent_reminder_days INTEGER,
    
    is_mandatory BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(department, document_type_id)
);

-- Índices para department_document_policies
CREATE INDEX idx_dept_doc_policies_dept ON department_document_policies(department);
CREATE INDEX idx_dept_doc_policies_type ON department_document_policies(document_type_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS PARA AUTOMATIZACIÓN
-- =====================================================

-- Función para crear automáticamente requerimientos cuando se crea un usuario
CREATE OR REPLACE FUNCTION create_user_document_requirements()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar requerimientos de documentos para el nuevo usuario
    INSERT INTO user_document_requirements (user_id, document_type_id, required_date, created_by)
    SELECT 
        NEW.id,
        dt.id,
        CURRENT_DATE + INTERVAL '30 days', -- Fecha límite inicial de 30 días
        NEW.id
    FROM document_types dt
    WHERE dt.is_active = true 
    AND dt.is_mandatory = true
    AND (
        dt.required_for_roles::jsonb ? NEW.role
        OR dt.required_for_departments::jsonb ? NEW.department
        OR (dt.required_for_departments = '[]'::jsonb AND dt.required_for_roles::jsonb ? NEW.role)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear requerimientos automáticamente
CREATE TRIGGER trigger_create_user_document_requirements
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_user_document_requirements();

-- Función para actualizar fechas de vencimiento cuando se aprueba un documento
CREATE OR REPLACE FUNCTION update_document_expiration()
RETURNS TRIGGER AS $$
DECLARE
    doc_type RECORD;
    validity_months INTEGER;
BEGIN
    -- Solo procesar si el documento fue aprobado
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Buscar si este documento corresponde a un requerimiento
        SELECT dt.*, udr.id as requirement_id
        INTO doc_type
        FROM user_document_requirements udr
        JOIN document_types dt ON dt.id = udr.document_type_id
        WHERE udr.current_document_id = NEW.id
        LIMIT 1;
        
        IF FOUND THEN
            -- Determinar período de validez
            validity_months := doc_type.validity_period_months;
            
            -- Verificar si hay política específica del departamento
            SELECT dp.validity_period_months INTO validity_months
            FROM department_document_policies dp
            JOIN user_profiles up ON up.department = dp.department
            WHERE dp.document_type_id = doc_type.id
            AND up.id = NEW.created_by
            AND dp.validity_period_months IS NOT NULL
            LIMIT 1;
            
            -- Actualizar el requerimiento
            UPDATE user_document_requirements
            SET 
                status = 'approved',
                approved_date = NOW(),
                expiration_date = CASE 
                    WHEN validity_months IS NOT NULL THEN CURRENT_DATE + (validity_months || ' months')::INTERVAL
                    ELSE NULL
                END,
                next_renewal_date = CASE 
                    WHEN validity_months IS NOT NULL THEN CURRENT_DATE + (validity_months || ' months')::INTERVAL - INTERVAL '7 days'
                    ELSE NULL
                END,
                updated_at = NOW()
            WHERE id = doc_type.requirement_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar vencimientos automáticamente
CREATE TRIGGER trigger_update_document_expiration
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_expiration();

-- =====================================================
-- DATOS INICIALES DE TIPOS DE DOCUMENTOS
-- =====================================================

-- Insertar tipos de documentos comunes para una organización educativa
INSERT INTO document_types (name, description, category_id, validity_period_months, reminder_before_days, urgent_reminder_days, required_for_roles) VALUES
-- Documentos administrativos
('Certificado de Antecedentes Penales', 'Certificado de antecedentes penales vigente', 
 (SELECT id FROM document_categories WHERE name = 'Legal'), 12, 30, 7, '["admin", "editor"]'),

('Certificado Médico', 'Certificado médico de aptitud laboral', 
 (SELECT id FROM document_categories WHERE name = 'Recursos Humanos'), 12, 15, 3, '["admin", "editor", "viewer"]'),

('Evaluación de Desempeño', 'Evaluación anual de desempeño laboral', 
 (SELECT id FROM document_categories WHERE name = 'Recursos Humanos'), 12, 30, 7, '["admin", "editor", "viewer"]'),

-- Documentos académicos
('Título Profesional', 'Copia del título profesional', 
 (SELECT id FROM document_categories WHERE name = 'Académico'), NULL, 90, 30, '["admin", "editor"]'),

('Certificación Docente', 'Certificación para ejercer la docencia', 
 (SELECT id FROM document_categories WHERE name = 'Académico'), 24, 60, 14, '["editor"]'),

-- Documentos financieros
('Declaración Patrimonial', 'Declaración patrimonial anual', 
 (SELECT id FROM document_categories WHERE name = 'Financiero'), 12, 45, 14, '["admin"]'),

-- Documentos de capacitación
('Certificado de Capacitación', 'Certificados de capacitación continua', 
 (SELECT id FROM document_categories WHERE name = 'Académico'), 24, 30, 7, '["admin", "editor", "viewer"]');

-- =====================================================
-- VISTAS ÚTILES PARA CONSULTAS
-- =====================================================

-- Vista para documentos próximos a vencer
CREATE VIEW documents_expiring_soon AS
SELECT 
    udr.*,
    dt.name as document_type_name,
    dt.description as document_type_description,
    up.first_name || ' ' || up.last_name as user_name,
    up.email as user_email,
    up.department,
    d.title as current_document_title,
    CASE 
        WHEN udr.expiration_date <= CURRENT_DATE THEN 'expired'
        WHEN udr.expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN udr.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'ok'
    END as urgency_level,
    udr.expiration_date - CURRENT_DATE as days_until_expiration
FROM user_document_requirements udr
JOIN document_types dt ON dt.id = udr.document_type_id
JOIN user_profiles up ON up.id = udr.user_id
LEFT JOIN documents d ON d.id = udr.current_document_id
WHERE udr.expiration_date IS NOT NULL
AND up.is_active = true
ORDER BY udr.expiration_date ASC;

-- Vista para documentos pendientes por usuario
CREATE VIEW user_pending_documents AS
SELECT 
    udr.*,
    dt.name as document_type_name,
    dt.description as document_type_description,
    dt.is_mandatory,
    up.first_name || ' ' || up.last_name as user_name,
    up.email as user_email,
    up.department,
    CASE 
        WHEN udr.required_date <= CURRENT_DATE THEN 'overdue'
        WHEN udr.required_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN udr.required_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'pending'
    END as priority_level,
    udr.required_date - CURRENT_DATE as days_until_due
FROM user_document_requirements udr
JOIN document_types dt ON dt.id = udr.document_type_id
JOIN user_profiles up ON up.id = udr.user_id
WHERE udr.status IN ('pending', 'rejected')
AND up.is_active = true
ORDER BY udr.required_date ASC;