-- =====================================================
-- MIGRACIÓN: Sistema de Invitaciones de Usuarios
-- Fecha: 2025-01-25
-- Descripción: Sistema completo de invitaciones para colaboradores MINEDUC
-- =====================================================

-- Crear tabla de invitaciones (drop first to ensure clean creation)
DROP TABLE IF EXISTS user_invitations CASCADE;
CREATE TABLE user_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Información del invitado
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    position VARCHAR(150),
    department VARCHAR(100),

    -- Información de invitación
    invitation_token VARCHAR(128) UNIQUE NOT NULL,
    invitation_type VARCHAR(30) DEFAULT 'employee' CHECK (invitation_type IN ('employee', 'contractor', 'consultant', 'intern', 'temporary')),
    invited_role VARCHAR(20) NOT NULL CHECK (invited_role IN ('admin', 'editor', 'viewer')),

    -- Quién invitó
    invited_by UUID NOT NULL REFERENCES user_profiles(id),
    invited_by_name VARCHAR(200), -- Cache del nombre para histórico

    -- Estado de la invitación
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),

    -- Fechas importantes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMPTZ,

    -- Campos específicos para pre-llenado
    suggested_employee_id VARCHAR(20),
    expected_hire_date DATE,
    expected_salary_range VARCHAR(50),
    contract_type VARCHAR(30) DEFAULT 'permanent' CHECK (contract_type IN ('permanent', 'temporary', 'consultant', 'intern')),

    -- Personalización del mensaje
    custom_message TEXT,
    welcome_message TEXT,

    -- Configuración de onboarding
    required_documents JSONB DEFAULT '[]'::jsonb,
    onboarding_checklist JSONB DEFAULT '[]'::jsonb,

    -- Configuración de acceso
    document_upload_enabled BOOLEAN DEFAULT true,
    upload_folder_path VARCHAR(255),
    allowed_document_types JSONB DEFAULT '["pdf", "doc", "docx", "jpg", "png"]'::jsonb,

    -- Seguimiento
    email_sent_count INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,

    -- Resultado de la invitación
    created_user_id UUID REFERENCES user_profiles(id),
    rejection_reason TEXT,

    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para optimización (drop existing first to avoid conflicts)
DROP INDEX IF EXISTS idx_user_invitations_email;
DROP INDEX IF EXISTS idx_user_invitations_token;
DROP INDEX IF EXISTS idx_unique_active_invitation_per_email;
DROP INDEX IF EXISTS idx_user_invitations_status;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;
DROP INDEX IF EXISTS idx_user_invitations_expires_at;
DROP INDEX IF EXISTS idx_user_invitations_created_at;
DROP INDEX IF EXISTS idx_user_invitations_department;

CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE UNIQUE INDEX idx_unique_active_invitation_per_email ON user_invitations(email) WHERE status = 'pending';
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_user_invitations_created_at ON user_invitations(created_at);
CREATE INDEX idx_user_invitations_department ON user_invitations(department);

-- Función para generar token único
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists_token BOOLEAN := TRUE;
BEGIN
    WHILE exists_token LOOP
        -- Generar token de 64 caracteres
        token := encode(gen_random_bytes(48), 'base64');
        -- Remover caracteres problemáticos para URLs
        token := REPLACE(REPLACE(REPLACE(token, '+', ''), '/', ''), '=', '');
        -- Asegurar longitud consistente
        token := LEFT(token, 64);

        -- Verificar si el token ya existe
        SELECT EXISTS(SELECT 1 FROM user_invitations WHERE invitation_token = token)
        INTO exists_token;
    END LOOP;

    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar token automáticamente
CREATE OR REPLACE FUNCTION set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_token IS NULL OR NEW.invitation_token = '' THEN
        NEW.invitation_token := generate_invitation_token();
    END IF;

    -- Auto-llenar el nombre del invitador
    IF NEW.invited_by_name IS NULL THEN
        SELECT COALESCE(first_name || ' ' || last_name, email)
        INTO NEW.invited_by_name
        FROM user_profiles
        WHERE id = NEW.invited_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invitation_token ON user_invitations;
CREATE TRIGGER trigger_set_invitation_token
    BEFORE INSERT ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_token();

-- Función para limpiar invitaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE user_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Función para extender expiración de invitación
CREATE OR REPLACE FUNCTION extend_invitation_expiry(
    p_invitation_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_invitations
    SET
        expires_at = NOW() + (p_days || ' days')::INTERVAL,
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{extended_at}',
            to_jsonb(NOW()::text)
        )
    WHERE id = p_invitation_id
    AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- Crear tabla de historial de emails de invitación
DROP TABLE IF EXISTS invitation_email_history CASCADE;
CREATE TABLE invitation_email_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL, -- 'invitation', 'reminder', 'welcome', 'expiration_warning'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT,
    email_template VARCHAR(100),
    sent_by UUID REFERENCES user_profiles(id),
    delivery_status VARCHAR(30) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'failed'
    external_message_id VARCHAR(255), -- Para tracking con servicio de email
    metadata JSONB DEFAULT '{}'::jsonb
);

DROP INDEX IF EXISTS idx_invitation_email_history_invitation_id;
DROP INDEX IF EXISTS idx_invitation_email_history_sent_at;
DROP INDEX IF EXISTS idx_invitation_email_history_email_type;

CREATE INDEX idx_invitation_email_history_invitation_id ON invitation_email_history(invitation_id);
CREATE INDEX idx_invitation_email_history_sent_at ON invitation_email_history(sent_at);
CREATE INDEX idx_invitation_email_history_email_type ON invitation_email_history(email_type);

-- Función para registrar envío de email
CREATE OR REPLACE FUNCTION log_invitation_email(
    p_invitation_id UUID,
    p_email_type VARCHAR(50),
    p_recipient_email VARCHAR(255),
    p_subject TEXT,
    p_sent_by UUID DEFAULT NULL,
    p_template VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO invitation_email_history (
        invitation_id,
        email_type,
        recipient_email,
        subject,
        email_template,
        sent_by
    ) VALUES (
        p_invitation_id,
        p_email_type,
        p_recipient_email,
        p_subject,
        p_template,
        p_sent_by
    ) RETURNING id INTO log_id;

    -- Actualizar contador en la invitación
    UPDATE user_invitations
    SET
        email_sent_count = email_sent_count + 1,
        last_email_sent_at = NOW()
    WHERE id = p_invitation_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_email_history ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver todas las invitaciones, otros usuarios solo las que enviaron
DROP POLICY IF EXISTS invitation_access_policy ON user_invitations;
CREATE POLICY invitation_access_policy ON user_invitations
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'admin'
        )
        OR auth.uid() = invited_by
    );

DROP POLICY IF EXISTS invitation_email_history_policy ON invitation_email_history;
CREATE POLICY invitation_email_history_policy ON invitation_email_history
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'admin'
        )
        OR invitation_id IN (
            SELECT id FROM user_invitations WHERE invited_by = auth.uid()
        )
    );

-- Grant permisos
GRANT SELECT, INSERT, UPDATE ON user_invitations TO authenticated;
GRANT SELECT, INSERT ON invitation_email_history TO authenticated;

-- Vista para dashboard de invitaciones (creada después de todas las tablas y políticas)
DROP VIEW IF EXISTS invitation_dashboard;
CREATE VIEW invitation_dashboard AS
SELECT
    i.id,
    i.email,
    i.first_name,
    i.last_name,
    i.position,
    i.department,
    i.invitation_type,
    i.invited_role,
    i.status,
    i.created_at,
    i.expires_at,
    i.responded_at,
    i.invited_by_name,
    CASE
        WHEN i.status = 'pending' AND i.expires_at < NOW() THEN true
        ELSE false
    END as is_expired,
    CASE
        WHEN i.status = 'pending' AND i.expires_at > NOW() THEN
            EXTRACT(days FROM (i.expires_at - NOW()))
        ELSE NULL
    END as days_until_expiry,
    i.email_sent_count,
    i.last_email_sent_at,
    i.viewed_at IS NOT NULL as has_been_viewed
FROM user_invitations i
ORDER BY i.created_at DESC;

GRANT SELECT ON invitation_dashboard TO authenticated;

-- Comentarios para documentación
COMMENT ON TABLE user_invitations IS 'Sistema de invitaciones para nuevos colaboradores MINEDUC';
COMMENT ON TABLE invitation_email_history IS 'Historial de emails enviados relacionados con invitaciones';
COMMENT ON VIEW invitation_dashboard IS 'Vista consolidada para dashboard de invitaciones';

COMMENT ON COLUMN user_invitations.invitation_token IS 'Token único para acceso a la invitación';
COMMENT ON COLUMN user_invitations.required_documents IS 'Lista JSON de documentos requeridos durante onboarding';
COMMENT ON COLUMN user_invitations.onboarding_checklist IS 'Lista JSON de pasos de onboarding';
COMMENT ON COLUMN user_invitations.allowed_document_types IS 'Tipos de archivo permitidos para upload';

-- Crear algunos datos de ejemplo para testing (solo si existe un usuario admin)
INSERT INTO user_invitations (
    email,
    first_name,
    last_name,
    position,
    department,
    invited_role,
    invited_by,
    invitation_type,
    expected_hire_date,
    custom_message,
    required_documents,
    onboarding_checklist
)
SELECT
    'maria.gonzalez@mineduc.gob.gt',
    'María',
    'González',
    'Analista de Documentos',
    'Secretaría General',
    'editor',
    admin_user.id,
    'employee',
    CURRENT_DATE + INTERVAL '15 days',
    'Bienvenida al equipo de Secretaría General. Estamos emocionados de trabajar contigo.',
    '["CV actualizado", "Copia de DPI", "Certificados académicos", "Referencias laborales"]'::jsonb,
    '["Completar información personal", "Subir documentos requeridos", "Configurar cuenta de email", "Orientación departamental"]'::jsonb
FROM (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1) admin_user
WHERE admin_user.id IS NOT NULL;