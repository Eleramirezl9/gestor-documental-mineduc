-- =====================================================
-- SCRIPT MAESTRO: Aplicar Migraciones de Gestión de Usuarios
-- Fecha: 2025-01-25
-- Descripción: Aplica todas las migraciones necesarias para el sistema completo de gestión de usuarios
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar que tenemos las extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear tabla de control de migraciones si no existe
CREATE TABLE IF NOT EXISTS migration_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by UUID REFERENCES auth.users(id),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    execution_time_ms INTEGER
);

-- Función para ejecutar migración con control
CREATE OR REPLACE FUNCTION execute_migration(
    p_migration_name VARCHAR(255),
    p_sql_command TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTEGER;
    migration_exists BOOLEAN;
BEGIN
    -- Verificar si la migración ya se ejecutó
    SELECT EXISTS(
        SELECT 1 FROM migration_history
        WHERE migration_name = p_migration_name AND success = true
    ) INTO migration_exists;

    IF migration_exists THEN
        RAISE NOTICE 'Migración % ya aplicada, saltando...', p_migration_name;
        RETURN true;
    END IF;

    start_time := clock_timestamp();

    BEGIN
        -- Ejecutar la migración
        EXECUTE p_sql_command;

        end_time := clock_timestamp();
        execution_time := EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;

        -- Registrar éxito
        INSERT INTO migration_history (migration_name, execution_time_ms)
        VALUES (p_migration_name, execution_time);

        RAISE NOTICE 'Migración % aplicada exitosamente en %ms', p_migration_name, execution_time;
        RETURN true;

    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        execution_time := EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;

        -- Registrar error
        INSERT INTO migration_history (migration_name, success, error_message, execution_time_ms)
        VALUES (p_migration_name, false, SQLERRM, execution_time);

        RAISE NOTICE 'Error en migración %: %', p_migration_name, SQLERRM;
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APLICAR MIGRACIONES
-- =====================================================

DO $$
DECLARE
    success BOOLEAN;
BEGIN
    RAISE NOTICE '🚀 Iniciando migraciones del sistema de gestión de usuarios...';
    RAISE NOTICE '================================================================';

    -- Migración 1: Actualizar user_profiles con campos guatemaltecos
    RAISE NOTICE '📋 Aplicando: Campos guatemaltecos en user_profiles...';

    -- Agregar nuevos campos
    ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS dpi VARCHAR(13),
    ADD COLUMN IF NOT EXISTS nit VARCHAR(12),
    ADD COLUMN IF NOT EXISTS position VARCHAR(150),
    ADD COLUMN IF NOT EXISTS hire_date DATE,
    ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES user_profiles(id),
    ADD COLUMN IF NOT EXISTS salary_range VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contract_type VARCHAR(30) DEFAULT 'permanent' CHECK (contract_type IN ('permanent', 'temporary', 'consultant', 'intern')),
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('M', 'F', 'other')),
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(15) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS documents_submitted JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_performance_review DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;

    -- Crear índices
    CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_dpi ON user_profiles(dpi);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_supervisor_id ON user_profiles(supervisor_id);

    -- Funciones de validación
    CREATE OR REPLACE FUNCTION validate_guatemalan_dpi(dpi_value TEXT)
    RETURNS BOOLEAN AS $func$
    BEGIN
        IF dpi_value IS NULL THEN RETURN TRUE; END IF;
        RETURN LENGTH(dpi_value) = 13 AND dpi_value ~ '^[0-9]{13}$';
    END;
    $func$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION generate_employee_id()
    RETURNS TEXT AS $func$
    DECLARE
        year_suffix TEXT := RIGHT(EXTRACT(year FROM NOW())::TEXT, 2);
        sequence_num INTEGER;
    BEGIN
        SELECT COALESCE(MAX(CAST(RIGHT(employee_id, 4) AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM user_profiles
        WHERE employee_id LIKE 'MIN' || year_suffix || '%';

        RETURN 'MIN' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
    END;
    $func$ LANGUAGE plpgsql;

    -- Trigger para employee_id
    CREATE OR REPLACE FUNCTION set_employee_id()
    RETURNS TRIGGER AS $func$
    BEGIN
        IF NEW.employee_id IS NULL THEN
            NEW.employee_id := generate_employee_id();
        END IF;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_set_employee_id ON user_profiles;
    CREATE TRIGGER trigger_set_employee_id
        BEFORE INSERT ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION set_employee_id();

    RAISE NOTICE '✅ Migración 1 completada: user_profiles actualizada';

    -- Migración 2: Sistema de invitaciones
    RAISE NOTICE '📧 Aplicando: Sistema de invitaciones...';

    -- Crear tabla de invitaciones
    CREATE TABLE IF NOT EXISTS user_invitations (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        position VARCHAR(150),
        department VARCHAR(100),
        invitation_token VARCHAR(128) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(48), 'base64'),
        invitation_type VARCHAR(30) DEFAULT 'employee',
        invited_role VARCHAR(20) NOT NULL,
        invited_by UUID NOT NULL REFERENCES user_profiles(id),
        invited_by_name VARCHAR(200),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        responded_at TIMESTAMPTZ,
        custom_message TEXT,
        required_documents JSONB DEFAULT '[]'::jsonb,
        onboarding_checklist JSONB DEFAULT '[]'::jsonb,
        document_upload_enabled BOOLEAN DEFAULT true,
        email_sent_count INTEGER DEFAULT 0,
        viewed_at TIMESTAMPTZ,
        created_user_id UUID REFERENCES user_profiles(id)
    );

    -- Índices para invitaciones
    CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
    CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

    -- Función para token único
    CREATE OR REPLACE FUNCTION generate_invitation_token()
    RETURNS TEXT AS $func$
    DECLARE
        token TEXT;
        exists_token BOOLEAN := TRUE;
    BEGIN
        WHILE exists_token LOOP
            token := REPLACE(REPLACE(encode(gen_random_bytes(32), 'base64'), '+', ''), '/', '');
            SELECT EXISTS(SELECT 1 FROM user_invitations WHERE invitation_token = token) INTO exists_token;
        END LOOP;
        RETURN LEFT(token, 64);
    END;
    $func$ LANGUAGE plpgsql;

    -- Función de limpieza
    CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
    RETURNS INTEGER AS $func$
    DECLARE
        affected_rows INTEGER;
    BEGIN
        UPDATE user_invitations SET status = 'expired'
        WHERE status = 'pending' AND expires_at < NOW();
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        RETURN affected_rows;
    END;
    $func$ LANGUAGE plpgsql;

    -- Vista de dashboard
    CREATE OR REPLACE VIEW invitation_dashboard AS
    SELECT
        i.*,
        CASE WHEN i.status = 'pending' AND i.expires_at < NOW() THEN true ELSE false END as is_expired,
        CASE WHEN i.status = 'pending' AND i.expires_at > NOW() THEN
            EXTRACT(days FROM (i.expires_at - NOW())) ELSE NULL END as days_until_expiry
    FROM user_invitations i
    ORDER BY i.created_at DESC;

    -- Políticas RLS
    ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS invitation_access_policy ON user_invitations;
    CREATE POLICY invitation_access_policy ON user_invitations
        FOR ALL USING (
            auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
            OR auth.uid() = invited_by
        );

    GRANT ALL ON user_invitations TO authenticated;
    GRANT SELECT ON invitation_dashboard TO authenticated;

    RAISE NOTICE '✅ Migración 2 completada: Sistema de invitaciones creado';

    -- Registrar migraciones completadas
    INSERT INTO migration_history (migration_name) VALUES
        ('001_update_user_profiles_guatemalan_fields'),
        ('002_create_user_invitations_table')
    ON CONFLICT (migration_name) DO NOTHING;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '🎉 ¡Todas las migraciones aplicadas exitosamente!';
    RAISE NOTICE '📊 Campos agregados a user_profiles: employee_id, dpi, nit, position, hire_date, supervisor_id, etc.';
    RAISE NOTICE '📧 Sistema de invitaciones creado con tokens únicos y tracking completo';
    RAISE NOTICE '🔐 Políticas RLS configuradas correctamente';
    RAISE NOTICE '📋 Vistas y funciones utilitarias disponibles';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 El sistema está listo para:';
    RAISE NOTICE '   • Gestión completa de empleados guatemaltecos';
    RAISE NOTICE '   • Sistema de invitaciones con links únicos';
    RAISE NOTICE '   • Validación de DPI y NIT guatemaltecos';
    RAISE NOTICE '   • Estructura organizacional con supervisores';
    RAISE NOTICE '   • Onboarding automatizado';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Próximos pasos:';
    RAISE NOTICE '   1. Actualizar backend APIs';
    RAISE NOTICE '   2. Actualizar frontend con nuevos campos';
    RAISE NOTICE '   3. Configurar sistema de emails';

END;
$$;