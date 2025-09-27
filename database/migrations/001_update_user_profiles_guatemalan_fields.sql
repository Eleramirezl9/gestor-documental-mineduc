-- =====================================================
-- MIGRACIÓN: Actualización de user_profiles con campos guatemaltecos
-- Fecha: 2025-01-25
-- Descripción: Agrega campos específicos para gestión de empleados MINEDUC Guatemala
-- =====================================================

-- Agregar nuevos campos a la tabla user_profiles
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

-- Actualizar campos existentes para hacerlos opcionales durante migración
ALTER TABLE user_profiles
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dpi ON user_profiles(dpi);
CREATE INDEX IF NOT EXISTS idx_user_profiles_nit ON user_profiles(nit);
CREATE INDEX IF NOT EXISTS idx_user_profiles_position ON user_profiles(position);
CREATE INDEX IF NOT EXISTS idx_user_profiles_supervisor_id ON user_profiles(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_contract_type ON user_profiles(contract_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hire_date ON user_profiles(hire_date);

-- Crear constraint único compuesto para evitar duplicados de DPI (sin nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_dpi_unique
ON user_profiles(dpi) WHERE dpi IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_nit_unique
ON user_profiles(nit) WHERE nit IS NOT NULL;

-- Función para validar DPI guatemalteco (13 dígitos)
CREATE OR REPLACE FUNCTION validate_guatemalan_dpi(dpi_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- DPI guatemalteco debe tener exactamente 13 dígitos
    IF dpi_value IS NULL THEN
        RETURN TRUE; -- Permitir NULL
    END IF;

    -- Verificar que tenga exactamente 13 caracteres y solo números
    IF LENGTH(dpi_value) = 13 AND dpi_value ~ '^[0-9]{13}$' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función para validar NIT guatemalteco
CREATE OR REPLACE FUNCTION validate_guatemalan_nit(nit_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- NIT guatemalteco puede ser 8-12 dígitos, a veces con guión
    IF nit_value IS NULL THEN
        RETURN TRUE; -- Permitir NULL
    END IF;

    -- Formato: 12345678-9 o 123456789
    IF nit_value ~ '^[0-9]{8,12}(-[0-9])?$' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Agregar constraints de validación
ALTER TABLE user_profiles
ADD CONSTRAINT chk_user_profiles_dpi CHECK (validate_guatemalan_dpi(dpi)),
ADD CONSTRAINT chk_user_profiles_nit CHECK (validate_guatemalan_nit(nit));

-- Función para generar employee_id automático
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT := RIGHT(EXTRACT(year FROM NOW())::TEXT, 2);
    sequence_num INTEGER;
    new_id TEXT;
BEGIN
    -- Obtener el siguiente número de secuencia para el año
    SELECT COALESCE(MAX(CAST(RIGHT(employee_id, 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM user_profiles
    WHERE employee_id LIKE 'MIN' || year_suffix || '%';

    -- Formatear como MIN25XXXX
    new_id := 'MIN' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar employee_id automáticamente si no se proporciona
CREATE OR REPLACE FUNCTION set_employee_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NULL THEN
        NEW.employee_id := generate_employee_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_employee_id
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_employee_id();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en las columnas para documentación
COMMENT ON COLUMN user_profiles.employee_id IS 'Código único del empleado (MIN25XXXX)';
COMMENT ON COLUMN user_profiles.dpi IS 'Documento Personal de Identificación guatemalteco (13 dígitos)';
COMMENT ON COLUMN user_profiles.nit IS 'Número de Identificación Tributaria guatemalteco';
COMMENT ON COLUMN user_profiles.position IS 'Cargo o puesto del empleado';
COMMENT ON COLUMN user_profiles.hire_date IS 'Fecha de contratación';
COMMENT ON COLUMN user_profiles.supervisor_id IS 'ID del supervisor directo';
COMMENT ON COLUMN user_profiles.salary_range IS 'Rango salarial (ej: Q5000-Q8000)';
COMMENT ON COLUMN user_profiles.contract_type IS 'Tipo de contrato: permanent, temporary, consultant, intern';
COMMENT ON COLUMN user_profiles.emergency_contact_name IS 'Nombre del contacto de emergencia';
COMMENT ON COLUMN user_profiles.emergency_contact_phone IS 'Teléfono del contacto de emergencia';
COMMENT ON COLUMN user_profiles.skills IS 'Array JSON de habilidades del empleado';
COMMENT ON COLUMN user_profiles.certifications IS 'Array JSON de certificaciones';
COMMENT ON COLUMN user_profiles.documents_submitted IS 'Array JSON de documentos entregados durante onboarding';

-- Actualizar política RLS para incluir supervisor
DROP POLICY IF EXISTS user_profiles_policy ON user_profiles;

CREATE POLICY user_profiles_policy ON user_profiles
    FOR ALL
    USING (
        auth.uid() = id
        OR auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'admin'
        )
        OR auth.uid() = supervisor_id
    );

-- Crear vista para estructura organizacional
CREATE OR REPLACE VIEW organizational_structure AS
SELECT
    u.id,
    u.employee_id,
    u.first_name,
    u.last_name,
    u.email,
    u.position,
    u.department,
    u.role,
    s.first_name AS supervisor_first_name,
    s.last_name AS supervisor_last_name,
    s.position AS supervisor_position,
    s.employee_id AS supervisor_employee_id
FROM user_profiles u
LEFT JOIN user_profiles s ON u.supervisor_id = s.id
WHERE u.is_active = true
ORDER BY u.department, u.position;

-- Grant permisos en la vista
GRANT SELECT ON organizational_structure TO authenticated;

COMMENT ON TABLE user_profiles IS 'Perfiles completos de usuarios/empleados del sistema MINEDUC Guatemala';
COMMENT ON VIEW organizational_structure IS 'Vista de la estructura organizacional con relaciones supervisor-empleado';