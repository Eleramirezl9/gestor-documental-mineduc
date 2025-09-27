-- =====================================================
-- MIGRACIÓN DE EMPLEADOS: Agregar al script principal
-- Fecha: 2025-01-25
-- Descripción: Script para agregar gestión de empleados al sistema
-- IMPORTANTE: Agregar al final del archivo apply_user_management_migrations.sql
-- =====================================================

    -- Migración 3: Sistema de gestión de empleados
    RAISE NOTICE '👥 Aplicando: Sistema de gestión de empleados...';

    -- Crear tabla principal de empleados
    CREATE TABLE IF NOT EXISTS employees (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,

        -- Información laboral
        department VARCHAR(100) NOT NULL,
        position VARCHAR(100),
        hire_date DATE NOT NULL,
        salary DECIMAL(10,2),
        employment_status VARCHAR(20) DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'suspended')),

        -- Información personal
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        national_id VARCHAR(20),

        -- Información adicional
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),

        -- Configuraciones
        is_active BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,

        -- Relación con usuario del sistema (opcional)
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

        -- Auditoría
        created_by UUID REFERENCES auth.users(id),
        updated_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Crear tabla para documentos requeridos por empleado
    CREATE TABLE IF NOT EXISTS employee_document_requirements (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        description TEXT,
        required_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

        -- Documento asociado (cuando se sube)
        document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

        -- Fechas de seguimiento
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,

        -- Comentarios y notas
        notes TEXT,
        rejection_reason TEXT,

        -- Auditoría
        created_by UUID REFERENCES auth.users(id) NOT NULL,
        updated_by UUID REFERENCES auth.users(id),
        approved_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Crear tabla para historial de empleados
    CREATE TABLE IF NOT EXISTS employee_history (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
        action VARCHAR(50) NOT NULL,
        field_changed VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        effective_date DATE,

        -- Auditoría
        created_by UUID REFERENCES auth.users(id) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Crear índices para empleados
    CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
    CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
    CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

    -- Crear índices para requerimientos de documentos
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_employee_id ON employee_document_requirements(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_status ON employee_document_requirements(status);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_required_date ON employee_document_requirements(required_date);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_document_type ON employee_document_requirements(document_type);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_priority ON employee_document_requirements(priority);

    -- Crear índices para historial
    CREATE INDEX IF NOT EXISTS idx_employee_history_employee_id ON employee_history(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_history_action ON employee_history(action);
    CREATE INDEX IF NOT EXISTS idx_employee_history_created_at ON employee_history(created_at);

    -- Función para actualizar timestamp automáticamente
    CREATE OR REPLACE FUNCTION update_employee_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Crear triggers para actualizar timestamp
    DROP TRIGGER IF EXISTS trigger_update_employees_updated_at ON employees;
    CREATE TRIGGER trigger_update_employees_updated_at
        BEFORE UPDATE ON employees
        FOR EACH ROW
        EXECUTE FUNCTION update_employee_updated_at();

    DROP TRIGGER IF EXISTS trigger_update_employee_doc_req_updated_at ON employee_document_requirements;
    CREATE TRIGGER trigger_update_employee_doc_req_updated_at
        BEFORE UPDATE ON employee_document_requirements
        FOR EACH ROW
        EXECUTE FUNCTION update_employee_updated_at();

    -- Función para crear historial automáticamente
    CREATE OR REPLACE FUNCTION create_employee_history()
    RETURNS TRIGGER AS $func$
    BEGIN
        -- Solo crear historial en actualizaciones, no en inserts
        IF TG_OP = 'UPDATE' THEN
            -- Verificar si hay cambios importantes
            IF OLD.department IS DISTINCT FROM NEW.department THEN
                INSERT INTO employee_history (employee_id, action, field_changed, old_value, new_value, created_by)
                VALUES (NEW.id, 'department_change', 'department', OLD.department, NEW.department, NEW.updated_by);
            END IF;

            IF OLD.position IS DISTINCT FROM NEW.position THEN
                INSERT INTO employee_history (employee_id, action, field_changed, old_value, new_value, created_by)
                VALUES (NEW.id, 'position_change', 'position', OLD.position, NEW.position, NEW.updated_by);
            END IF;

            IF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
                INSERT INTO employee_history (employee_id, action, field_changed, old_value, new_value, created_by)
                VALUES (NEW.id, 'status_change', 'employment_status', OLD.employment_status, NEW.employment_status, NEW.updated_by);
            END IF;

            IF OLD.salary IS DISTINCT FROM NEW.salary THEN
                INSERT INTO employee_history (employee_id, action, field_changed, old_value, new_value, created_by)
                VALUES (NEW.id, 'salary_change', 'salary', OLD.salary::text, NEW.salary::text, NEW.updated_by);
            END IF;
        END IF;

        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Crear trigger para historial automático
    DROP TRIGGER IF EXISTS trigger_create_employee_history ON employees;
    CREATE TRIGGER trigger_create_employee_history
        AFTER UPDATE ON employees
        FOR EACH ROW
        EXECUTE FUNCTION create_employee_history();

    -- Función para obtener próximo employee_id
    CREATE OR REPLACE FUNCTION get_next_employee_id()
    RETURNS VARCHAR(20) AS $func$
    DECLARE
        next_number INTEGER;
        next_id VARCHAR(20);
    BEGIN
        -- Obtener el último número de employee_id
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(employee_id FROM 4) AS INTEGER)),
            24000
        ) + 1 INTO next_number
        FROM employees
        WHERE employee_id ~ '^MIN[0-9]+$';

        -- Formatear como MIN25001, MIN25002, etc.
        next_id := 'MIN' || LPAD(next_number::text, 5, '0');

        RETURN next_id;
    END;
    $func$ LANGUAGE plpgsql;

    -- Vista para empleados con estado de documentos
    CREATE OR REPLACE VIEW employee_document_status AS
    SELECT
        e.*,
        COUNT(edr.id) as total_requirements,
        COUNT(CASE WHEN edr.status = 'pending' THEN 1 END) as pending_requirements,
        COUNT(CASE WHEN edr.status = 'approved' THEN 1 END) as approved_requirements,
        COUNT(CASE WHEN edr.status = 'expired' THEN 1 END) as expired_requirements,
        COUNT(CASE WHEN edr.status = 'rejected' THEN 1 END) as rejected_requirements,
        COUNT(CASE WHEN edr.required_date < CURRENT_DATE AND edr.status = 'pending' THEN 1 END) as overdue_requirements,
        COUNT(CASE WHEN edr.required_date <= CURRENT_DATE + INTERVAL '30 days' AND edr.status = 'pending' THEN 1 END) as urgent_requirements,

        -- Estado general del empleado basado en documentos
        CASE
            WHEN COUNT(CASE WHEN edr.required_date < CURRENT_DATE AND edr.status = 'pending' THEN 1 END) > 0 THEN 'critical'
            WHEN COUNT(CASE WHEN edr.required_date <= CURRENT_DATE + INTERVAL '30 days' AND edr.status = 'pending' THEN 1 END) > 0 THEN 'attention'
            WHEN COUNT(CASE WHEN edr.status = 'pending' THEN 1 END) > 0 THEN 'normal'
            ELSE 'complete'
        END as overall_status
    FROM employees e
    LEFT JOIN employee_document_requirements edr ON e.id = edr.employee_id
    GROUP BY e.id;

    -- Políticas de Row Level Security (RLS)
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employee_document_requirements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;

    -- Políticas para employees
    DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
    CREATE POLICY "Admins can view all employees" ON employees
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role IN ('admin')
            )
        );

    DROP POLICY IF EXISTS "Editors can view all employees" ON employees;
    CREATE POLICY "Editors can view all employees" ON employees
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        );

    DROP POLICY IF EXISTS "Users can view their own employee record" ON employees;
    CREATE POLICY "Users can view their own employee record" ON employees
        FOR SELECT USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
    CREATE POLICY "Admins can insert employees" ON employees
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    DROP POLICY IF EXISTS "Admins can update employees" ON employees;
    CREATE POLICY "Admins can update employees" ON employees
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    -- Políticas para employee_document_requirements
    DROP POLICY IF EXISTS "Users can view requirements for all employees" ON employee_document_requirements;
    CREATE POLICY "Users can view requirements for all employees" ON employee_document_requirements
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
            )
        );

    DROP POLICY IF EXISTS "Admins and editors can manage requirements" ON employee_document_requirements;
    CREATE POLICY "Admins and editors can manage requirements" ON employee_document_requirements
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        );

    -- Políticas para employee_history
    DROP POLICY IF EXISTS "Admins can view employee history" ON employee_history;
    CREATE POLICY "Admins can view employee history" ON employee_history
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    -- Otorgar permisos
    GRANT ALL ON employees TO authenticated;
    GRANT ALL ON employee_document_requirements TO authenticated;
    GRANT ALL ON employee_history TO authenticated;
    GRANT SELECT ON employee_document_status TO authenticated;

    RAISE NOTICE '✅ Migración 3 completada: Sistema de gestión de empleados creado';

    -- Registrar migración completada
    INSERT INTO migration_history (migration_name) VALUES
        ('003_create_employee_management_system')
    ON CONFLICT (migration_name) DO NOTHING;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 ¡Sistema de empleados listo!';
    RAISE NOTICE '👥 Tabla de empleados con información completa';
    RAISE NOTICE '📋 Sistema de requerimientos de documentos';
    RAISE NOTICE '📊 Historial de cambios automático';
    RAISE NOTICE '🔐 Políticas RLS configuradas';
    RAISE NOTICE '📈 Vista de estado de documentos disponible';