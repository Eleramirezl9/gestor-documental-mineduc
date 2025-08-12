-- =====================================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA GESTOR DOCUMENTAL MINEDUC
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: user_profiles
-- Perfiles de usuario extendidos (complementa auth.users de Supabase)
-- =====================================================
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '[]'::jsonb,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_profiles
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- =====================================================
-- TABLA: document_categories
-- Categorías de documentos
-- =====================================================
CREATE TABLE document_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Color hex para UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO document_categories (name, description, color) VALUES
('Administrativo', 'Documentos administrativos generales', '#3b82f6'),
('Académico', 'Documentos relacionados con actividades académicas', '#10b981'),
('Legal', 'Documentos legales y normativos', '#f59e0b'),
('Financiero', 'Documentos financieros y presupuestarios', '#ef4444'),
('Recursos Humanos', 'Documentos de personal y RRHH', '#8b5cf6'),
('Infraestructura', 'Documentos de infraestructura y mantenimiento', '#06b6d4');

-- =====================================================
-- TABLA: documents
-- Documentos principales del sistema
-- =====================================================
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Metadatos
    category_id UUID REFERENCES document_categories(id),
    tags JSONB DEFAULT '[]'::jsonb,
    extracted_text TEXT, -- Texto extraído por OCR
    ai_classification JSONB, -- Clasificación automática por IA
    
    -- Estado y flujo
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
    version INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT false,
    
    -- Fechas importantes
    effective_date DATE,
    expiration_date DATE,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

-- Índices para documents
CREATE INDEX idx_documents_title ON documents USING gin(to_tsvector('spanish', title));
CREATE INDEX idx_documents_description ON documents USING gin(to_tsvector('spanish', description));
CREATE INDEX idx_documents_extracted_text ON documents USING gin(to_tsvector('spanish', extracted_text));
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_tags ON documents USING gin(tags);

-- =====================================================
-- TABLA: document_versions
-- Historial de versiones de documentos
-- =====================================================
CREATE TABLE document_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    changes_description TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(document_id, version_number)
);

-- Índices para document_versions
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at);

-- =====================================================
-- TABLA: workflows
-- Flujos de aprobación de documentos
-- =====================================================
CREATE TABLE workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    workflow_type VARCHAR(50) DEFAULT 'approval',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
    
    -- Participantes
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    current_approver_id UUID REFERENCES auth.users(id),
    
    -- Metadatos del flujo
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    comments TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Índices para workflows
CREATE INDEX idx_workflows_document_id ON workflows(document_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_requester_id ON workflows(requester_id);
CREATE INDEX idx_workflows_current_approver_id ON workflows(current_approver_id);
CREATE INDEX idx_workflows_due_date ON workflows(due_date);

-- =====================================================
-- TABLA: workflow_steps
-- Pasos individuales en los flujos de trabajo
-- =====================================================
CREATE TABLE workflow_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
    step_order INTEGER NOT NULL,
    approver_id UUID REFERENCES auth.users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    comments TEXT,
    decision_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workflow_id, step_order)
);

-- Índices para workflow_steps
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_approver_id ON workflow_steps(approver_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);

-- =====================================================
-- TABLA: notifications
-- Sistema de notificaciones
-- =====================================================
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    
    -- Metadatos
    related_entity_type VARCHAR(50), -- 'document', 'workflow', 'user', etc.
    related_entity_id UUID,
    action_url VARCHAR(500),
    
    -- Estado
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- TABLA: audit_logs
-- Registro de auditoría del sistema
-- =====================================================
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- =====================================================
-- TABLA: system_settings
-- Configuraciones del sistema
-- =====================================================
CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones por defecto
INSERT INTO system_settings (key, value, description, is_public) VALUES
('max_file_size', '52428800', 'Tamaño máximo de archivo en bytes (50MB)', false),
('allowed_file_types', '["pdf", "doc", "docx", "jpg", "jpeg", "png", "gif"]', 'Tipos de archivo permitidos', false),
('notification_email', '"noreply@mineduc.gob.gt"', 'Email para notificaciones del sistema', false),
('system_name', '"MINEDUC - Sistema de Gestión Documental"', 'Nombre del sistema', true),
('maintenance_mode', 'false', 'Modo de mantenimiento', false);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener estadísticas de auditoría
CREATE OR REPLACE FUNCTION get_audit_stats(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE(
    action VARCHAR(100),
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH total_actions AS (
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
    )
    SELECT 
        al.action,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / ta.total), 2) as percentage
    FROM audit_logs al
    CROSS JOIN total_actions ta
    WHERE al.timestamp BETWEEN start_date AND end_date
    GROUP BY al.action, ta.total
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en las tablas principales
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para documents
CREATE POLICY "Users can view documents they created" ON documents
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can view public documents" ON documents
    FOR SELECT USING (is_public = true AND status = 'approved');

CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (created_by = auth.uid());

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de documentos con información completa
CREATE VIEW documents_full AS
SELECT 
    d.*,
    dc.name as category_name,
    dc.color as category_color,
    up_creator.first_name || ' ' || up_creator.last_name as created_by_name,
    up_creator.email as created_by_email,
    up_approver.first_name || ' ' || up_approver.last_name as approved_by_name,
    up_approver.email as approved_by_email
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
LEFT JOIN user_profiles up_creator ON d.created_by = up_creator.id
LEFT JOIN user_profiles up_approver ON d.approved_by = up_approver.id;

-- Vista de workflows con información completa
CREATE VIEW workflows_full AS
SELECT 
    w.*,
    d.title as document_title,
    d.file_name as document_file_name,
    up_requester.first_name || ' ' || up_requester.last_name as requester_name,
    up_requester.email as requester_email,
    up_approver.first_name || ' ' || up_approver.last_name as current_approver_name,
    up_approver.email as current_approver_email
FROM workflows w
LEFT JOIN documents d ON w.document_id = d.id
LEFT JOIN user_profiles up_requester ON w.requester_id = up_requester.id
LEFT JOIN user_profiles up_approver ON w.current_approver_id = up_approver.id;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE user_profiles IS 'Perfiles extendidos de usuarios del sistema';
COMMENT ON TABLE documents IS 'Documentos principales del sistema de gestión';
COMMENT ON TABLE workflows IS 'Flujos de trabajo para aprobación de documentos';
COMMENT ON TABLE notifications IS 'Sistema de notificaciones para usuarios';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de todas las acciones del sistema';

-- Fin del esquema

