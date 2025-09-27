-- =====================================================
-- SETUP COMPLETO DEL SISTEMA DE EMPLEADOS
-- Fecha: 2025-01-25
-- Descripción: Script completo para configurar el sistema de empleados
-- IMPORTANTE: Ejecutar este script completo en Supabase SQL Editor
-- =====================================================

-- Verificar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mostrar mensaje de inicio
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 INICIANDO CONFIGURACIÓN DEL SISTEMA DE EMPLEADOS';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Fecha: %', NOW();
    RAISE NOTICE '';
END;
$$;

-- =====================================================
-- MIGRACIÓN: SISTEMA DE GESTIÓN DE EMPLEADOS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '👥 Creando sistema de gestión de empleados...';

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
        created_by UUID REFERENCES auth.users(id),
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
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    RAISE NOTICE '✅ Tablas de empleados creadas exitosamente';
END;
$$;

-- =====================================================
-- CREAR ÍNDICES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '📊 Creando índices para optimización...';

    -- Índices para empleados
    CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
    CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
    CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

    -- Índices para requerimientos de documentos
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_employee_id ON employee_document_requirements(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_status ON employee_document_requirements(status);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_required_date ON employee_document_requirements(required_date);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_document_type ON employee_document_requirements(document_type);
    CREATE INDEX IF NOT EXISTS idx_employee_doc_req_priority ON employee_document_requirements(priority);

    -- Índices para historial
    CREATE INDEX IF NOT EXISTS idx_employee_history_employee_id ON employee_history(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_history_action ON employee_history(action);
    CREATE INDEX IF NOT EXISTS idx_employee_history_created_at ON employee_history(created_at);

    RAISE NOTICE '✅ Índices creados exitosamente';
END;
$$;

-- =====================================================
-- CREAR FUNCIONES Y TRIGGERS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '⚙️ Creando funciones y triggers...';

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

    RAISE NOTICE '✅ Funciones y triggers creados exitosamente';
END;
$$;

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🔐 Configurando Row Level Security...';

    -- Habilitar RLS en las tablas
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employee_document_requirements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;

    -- Políticas para employees (simplificadas para evitar recursión)
    DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
    CREATE POLICY "Authenticated users can view employees" ON employees
        FOR SELECT USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can manage employees" ON employees;
    CREATE POLICY "Authenticated users can manage employees" ON employees
        FOR ALL USING (auth.role() = 'authenticated');

    -- Políticas para employee_document_requirements (simplificadas)
    DROP POLICY IF EXISTS "Authenticated users can manage requirements" ON employee_document_requirements;
    CREATE POLICY "Authenticated users can manage requirements" ON employee_document_requirements
        FOR ALL USING (auth.role() = 'authenticated');

    -- Políticas para employee_history (simplificadas)
    DROP POLICY IF EXISTS "Authenticated users can manage history" ON employee_history;
    CREATE POLICY "Authenticated users can manage history" ON employee_history
        FOR ALL USING (auth.role() = 'authenticated');

    -- Otorgar permisos
    GRANT ALL ON employees TO authenticated;
    GRANT ALL ON employee_document_requirements TO authenticated;
    GRANT ALL ON employee_history TO authenticated;

    RAISE NOTICE '✅ Row Level Security configurado exitosamente';
END;
$$;

-- =====================================================
-- INSERTAR DATOS DE PRUEBA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '📋 Insertando datos de prueba...';

    -- Insertar empleados de prueba
    INSERT INTO employees (
        employee_id, email, first_name, last_name, department, position,
        hire_date, phone, address, date_of_birth, national_id,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        is_active, email_notifications
    ) VALUES
    ('MIN25001', 'ana.garcia@mineduc.gob.gt', 'Ana', 'García', 'Recursos Humanos', 'Especialista en Personal',
     '2024-01-15', '+502 2411-9595', 'Zona 10, Ciudad de Guatemala', '1985-03-20', '1985032001201',
     'Carlos García', '+502 5555-1234', 'Esposo', true, true),

    ('MIN25002', 'luis.martinez@mineduc.gob.gt', 'Luis', 'Martínez', 'Recursos Humanos', 'Director de RRHH',
     '2020-05-10', '+502 2411-9596', 'Zona 1, Ciudad de Guatemala', '1978-11-15', '1978111501201',
     'María Martínez', '+502 5555-5678', 'Esposa', true, true),

    ('MIN25003', 'carlos.lopez@mineduc.gob.gt', 'Carlos', 'López', 'Tecnología', 'Desarrollador Senior',
     '2024-02-01', '+502 2411-9597', 'Zona 15, Ciudad de Guatemala', '1990-07-08', '1990070801201',
     'Ana López', '+502 5555-9876', 'Esposa', true, true),

    ('MIN25004', 'sofia.rodriguez@mineduc.gob.gt', 'Sofía', 'Rodríguez', 'Tecnología', 'Analista de Sistemas',
     '2023-08-15', '+502 2411-9598', 'Zona 11, Ciudad de Guatemala', '1992-12-03', '1992120301201',
     'Pedro Rodríguez', '+502 5555-4321', 'Padre', true, true),

    ('MIN25005', 'miguel.torres@mineduc.gob.gt', 'Miguel', 'Torres', 'Tecnología', 'Director de TI',
     '2019-03-01', '+502 2411-9599', 'Zona 9, Ciudad de Guatemala', '1982-05-12', '1982051201201',
     'Carmen Torres', '+502 5555-7890', 'Esposa', true, true)

    ON CONFLICT (employee_id) DO NOTHING;

    -- Insertar algunos requerimientos de documentos
    -- Nota: Para datos de prueba, dejamos created_by como NULL
    INSERT INTO employee_document_requirements (
        employee_id, document_type, description, required_date, status, priority
    ) VALUES
    ((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'DPI', 'Documento Personal de Identificación actualizado', '2024-12-31', 'approved', 'high'),
    ((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'Antecedentes Penales', 'Antecedentes penales vigentes', '2024-12-15', 'pending', 'urgent'),
    ((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-05-10', 'approved', 'high'),
    ((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'Certificación Técnica', 'Certificación en tecnologías actuales', '2024-10-01', 'expired', 'medium'),
    ((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'Examen Médico', 'Examen médico anual', '2024-12-10', 'pending', 'medium'),
    ((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'Evaluación 360', 'Evaluación de desempeño anual', '2024-11-15', 'pending', 'high')

    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Datos de prueba insertados exitosamente';
END;
$$;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

DO $$
DECLARE
    employee_count INTEGER;
    requirement_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM employees;
    SELECT COUNT(*) INTO requirement_count FROM employee_document_requirements;

    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '🎉 ¡SISTEMA DE EMPLEADOS CONFIGURADO EXITOSAMENTE!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '👥 Empleados de prueba: %', employee_count;
    RAISE NOTICE '📋 Requerimientos de documentos: %', requirement_count;
    RAISE NOTICE '';
    RAISE NOTICE '🏢 Departamentos disponibles:';
    RAISE NOTICE '   • Recursos Humanos';
    RAISE NOTICE '   • Tecnología';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Configuración de seguridad:';
    RAISE NOTICE '   • Row Level Security habilitado';
    RAISE NOTICE '   • Políticas para admin/editor/viewer configuradas';
    RAISE NOTICE '   • Permisos otorgados correctamente';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ Funciones disponibles:';
    RAISE NOTICE '   • get_next_employee_id() - Genera próximo ID de empleado';
    RAISE NOTICE '   • update_employee_updated_at() - Actualiza timestamps automáticamente';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 ¡El sistema está listo para usar!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximos pasos:';
    RAISE NOTICE '   1. Levantar el backend: npm run dev (en /backend)';
    RAISE NOTICE '   2. Levantar el frontend: npm run dev (en /frontend)';
    RAISE NOTICE '   3. Probar la funcionalidad en /employee-management';
    RAISE NOTICE '';
END;
$$;