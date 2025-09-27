-- =====================================================
-- DATOS DE PRUEBA COMPLETOS PARA EMPLEADOS
-- Fecha: 2025-01-25
-- Descripción: Datos de prueba para el sistema de empleados
-- IMPORTANTE: Ejecutar DESPUÉS de la migración de empleados
-- =====================================================

-- Insertar empleados de prueba
INSERT INTO employees (
    employee_id, email, first_name, last_name, department, position,
    hire_date, phone, address, date_of_birth, national_id,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    is_active, email_notifications
) VALUES
-- Empleados del departamento de Recursos Humanos
('MIN25001', 'ana.garcia@mineduc.gob.gt', 'Ana', 'García', 'Recursos Humanos', 'Especialista en Personal',
 '2024-01-15', '+502 2411-9595', 'Zona 10, Ciudad de Guatemala', '1985-03-20', '1985032001201',
 'Carlos García', '+502 5555-1234', 'Esposo', true, true),

('MIN25002', 'luis.martinez@mineduc.gob.gt', 'Luis', 'Martínez', 'Recursos Humanos', 'Director de RRHH',
 '2020-05-10', '+502 2411-9596', 'Zona 1, Ciudad de Guatemala', '1978-11-15', '1978111501201',
 'María Martínez', '+502 5555-5678', 'Esposa', true, true),

-- Empleados del departamento de Tecnología
('MIN25003', 'carlos.lopez@mineduc.gob.gt', 'Carlos', 'López', 'Tecnología', 'Desarrollador Senior',
 '2024-02-01', '+502 2411-9597', 'Zona 15, Ciudad de Guatemala', '1990-07-08', '1990070801201',
 'Ana López', '+502 5555-9876', 'Esposa', true, true),

('MIN25004', 'sofia.rodriguez@mineduc.gob.gt', 'Sofía', 'Rodríguez', 'Tecnología', 'Analista de Sistemas',
 '2023-08-15', '+502 2411-9598', 'Zona 11, Ciudad de Guatemala', '1992-12-03', '1992120301201',
 'Pedro Rodríguez', '+502 5555-4321', 'Padre', true, true),

('MIN25005', 'miguel.torres@mineduc.gob.gt', 'Miguel', 'Torres', 'Tecnología', 'Director de TI',
 '2019-03-01', '+502 2411-9599', 'Zona 9, Ciudad de Guatemala', '1982-05-12', '1982051201201',
 'Carmen Torres', '+502 5555-7890', 'Esposa', true, true),

-- Empleados del departamento de Finanzas
('MIN25006', 'maria.rodriguez@mineduc.gob.gt', 'María', 'Rodríguez', 'Finanzas', 'Contadora',
 '2024-03-01', '+502 2411-9600', 'Zona 13, Ciudad de Guatemala', '1987-09-25', '1987092501201',
 'José Rodríguez', '+502 5555-8765', 'Hermano', true, true),

('MIN25007', 'ricardo.morales@mineduc.gob.gt', 'Ricardo', 'Morales', 'Finanzas', 'Director Financiero',
 '2019-01-20', '+502 2411-9601', 'Zona 14, Ciudad de Guatemala', '1975-04-12', '1975041201201',
 'Carmen Morales', '+502 5555-2468', 'Esposa', true, true),

-- Empleados del departamento Académico
('MIN25008', 'elena.vargas@mineduc.gob.gt', 'Elena', 'Vargas', 'Académico', 'Coordinadora Pedagógica',
 '2022-09-05', '+502 2411-9602', 'Zona 7, Ciudad de Guatemala', '1983-06-18', '1983061801201',
 'Miguel Vargas', '+502 5555-1357', 'Esposo', true, true),

('MIN25009', 'fernando.castillo@mineduc.gob.gt', 'Fernando', 'Castillo', 'Académico', 'Especialista Curricular',
 '2023-01-10', '+502 2411-9603', 'Zona 12, Ciudad de Guatemala', '1989-02-28', '1989022801201',
 'Laura Castillo', '+502 5555-9753', 'Esposa', true, true),

('MIN25010', 'claudia.hernandez@mineduc.gob.gt', 'Claudia', 'Hernández', 'Académico', 'Directora Académica',
 '2018-06-15', '+502 2411-9604', 'Zona 16, Ciudad de Guatemala', '1980-12-05', '1980120501201',
 'Roberto Hernández', '+502 5555-8642', 'Esposo', true, true),

-- Empleados del departamento Legal
('MIN25011', 'patricia.mendez@mineduc.gob.gt', 'Patricia', 'Méndez', 'Legal', 'Asesora Jurídica',
 '2021-11-15', '+502 2411-9605', 'Zona 4, Ciudad de Guatemala', '1984-10-05', '1984100501201',
 'Roberto Méndez', '+502 5555-3691', 'Esposo', true, true),

-- Empleados del departamento de Infraestructura
('MIN25012', 'alberto.jimenez@mineduc.gob.gt', 'Alberto', 'Jiménez', 'Infraestructura', 'Ingeniero Civil',
 '2022-03-20', '+502 2411-9606', 'Zona 6, Ciudad de Guatemala', '1986-08-14', '1986081401201',
 'Gloria Jiménez', '+502 5555-7531', 'Esposa', true, true),

-- Empleados del departamento de Comunicaciones
('MIN25013', 'diana.morales@mineduc.gob.gt', 'Diana', 'Morales', 'Comunicaciones', 'Especialista en Comunicación',
 '2023-04-10', '+502 2411-9607', 'Zona 8, Ciudad de Guatemala', '1988-07-22', '1988072201201',
 'Jorge Morales', '+502 5555-9642', 'Hermano', true, true),

('MIN25014', 'jose.ramirez@mineduc.gob.gt', 'José', 'Ramírez', 'Comunicaciones', 'Director de Comunicaciones',
 '2020-02-28', '+502 2411-9608', 'Zona 5, Ciudad de Guatemala', '1979-03-15', '1979031501201',
 'Ana Ramírez', '+502 5555-1472', 'Esposa', true, true),

-- Empleados del departamento de Calidad
('MIN25015', 'sandra.lopez@mineduc.gob.gt', 'Sandra', 'López', 'Calidad', 'Coordinadora de Calidad',
 '2023-07-01', '+502 2411-9609', 'Zona 17, Ciudad de Guatemala', '1985-11-30', '1985113001201',
 'Pedro López', '+502 5555-8529', 'Esposo', true, true)

ON CONFLICT (employee_id) DO NOTHING;

-- Insertar requerimientos de documentos para empleados
INSERT INTO employee_document_requirements (
    employee_id, document_type, description, required_date, status, priority
) VALUES
-- Requerimientos para Ana García (MIN25001)
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'DPI', 'Documento Personal de Identificación actualizado', '2024-12-31', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'Antecedentes Penales', 'Antecedentes penales vigentes', '2024-12-15', 'pending', 'urgent'),
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'Examen Médico', 'Examen médico anual', '2024-11-30', 'pending', 'medium'),

-- Requerimientos para Luis Martínez (MIN25002)
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-05-10', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'Título Universitario', 'Título universitario legalizado', '2024-12-31', 'approved', 'medium'),

-- Requerimientos para Carlos López (MIN25003)
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'DPI', 'Documento Personal de Identificación actualizado', '2026-03-15', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'Certificación Técnica', 'Certificación en tecnologías actuales', '2024-10-01', 'expired', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'Antecedentes Penales', 'Antecedentes penales vigentes', '2024-12-20', 'pending', 'high'),

-- Requerimientos para Sofía Rodríguez (MIN25004)
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-08-15', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'Título Universitario', 'Título en Ingeniería en Sistemas', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'Examen Médico', 'Examen médico anual', '2024-12-10', 'pending', 'medium'),

-- Requerimientos para Miguel Torres (MIN25005)
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-03-01', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'Certificación PMP', 'Certificación en Gestión de Proyectos', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'Evaluación 360', 'Evaluación de desempeño anual', '2024-11-15', 'pending', 'high'),

-- Requerimientos para María Rodríguez (MIN25006)
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'DPI', 'Documento Personal de Identificación actualizado', '2027-01-20', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'Título Universitario', 'Título en Contaduría Pública', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'Colegiación Profesional', 'Colegiación vigente CPA', '2024-12-25', 'pending', 'high'),

-- Requerimientos para Ricardo Morales (MIN25007)
((SELECT id FROM employees WHERE employee_id = 'MIN25007'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-04-12', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25007'), 'MBA', 'Maestría en Administración de Empresas', '2024-12-31', 'approved', 'medium'),

-- Requerimientos para Elena Vargas (MIN25008)
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-06-18', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'Licencia de Enseñanza', 'Licencia para enseñar vigente', '2024-12-30', 'pending', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'Certificación Pedagógica', 'Certificación en metodologías pedagógicas', '2024-11-20', 'pending', 'medium'),

-- Requerimientos para Fernando Castillo (MIN25009)
((SELECT id FROM employees WHERE employee_id = 'MIN25009'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-02-28', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25009'), 'Maestría en Educación', 'Título de maestría en educación', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25009'), 'Examen Médico', 'Examen médico anual', '2024-12-05', 'pending', 'medium'),

-- Requerimientos para Claudia Hernández (MIN25010)
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-12-05', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'Doctorado en Educación', 'Título doctoral en educación', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'Evaluación Directiva', 'Evaluación de desempeño directivo', '2024-11-10', 'pending', 'high'),

-- Requerimientos para Patricia Méndez (MIN25011)
((SELECT id FROM employees WHERE employee_id = 'MIN25011'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-10-05', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25011'), 'Colegiación Legal', 'Colegiación de abogados vigente', '2024-12-31', 'approved', 'high'),

-- Requerimientos para Alberto Jiménez (MIN25012)
((SELECT id FROM employees WHERE employee_id = 'MIN25012'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-08-14', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25012'), 'Título Ingeniería', 'Título de Ingeniería Civil', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25012'), 'Colegiación CIG', 'Colegiación de Ingenieros vigente', '2024-11-25', 'pending', 'high'),

-- Requerimientos para Diana Morales (MIN25013)
((SELECT id FROM employees WHERE employee_id = 'MIN25013'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-07-22', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25013'), 'Licenciatura en Comunicación', 'Título en Comunicación Social', '2024-12-31', 'approved', 'medium'),
((SELECT id FROM employees WHERE employee_id = 'MIN25013'), 'Portafolio Creativo', 'Portafolio de trabajos de comunicación', '2024-11-30', 'pending', 'medium'),

-- Requerimientos para José Ramírez (MIN25014)
((SELECT id FROM employees WHERE employee_id = 'MIN25014'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-03-15', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25014'), 'Maestría en Comunicación', 'Maestría en Comunicación Estratégica', '2024-12-31', 'approved', 'medium'),

-- Requerimientos para Sandra López (MIN25015)
((SELECT id FROM employees WHERE employee_id = 'MIN25015'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-11-30', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25015'), 'Certificación ISO', 'Certificación en sistemas de calidad ISO', '2024-12-31', 'approved', 'high'),
((SELECT id FROM employees WHERE employee_id = 'MIN25015'), 'Auditoría Interna', 'Certificación en auditoría interna', '2024-11-15', 'pending', 'medium')

ON CONFLICT DO NOTHING;

-- Insertar algunos registros de historial
INSERT INTO employee_history (
    employee_id, action, field_changed, old_value, new_value, reason, effective_date
) VALUES
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'promotion', 'position', 'Especialista RRHH', 'Director de RRHH', 'Promoción por excelente desempeño', '2023-01-01'),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'salary_adjustment', 'salary', '15000.00', '18000.00', 'Ajuste salarial anual', '2024-01-01'),
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'promotion', 'position', 'Analista Senior', 'Director de TI', 'Promoción a dirección', '2022-03-01'),
((SELECT id FROM employees WHERE employee_id = 'MIN25007'), 'promotion', 'position', 'Contador Senior', 'Director Financiero', 'Promoción a dirección', '2022-01-01'),
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'promotion', 'position', 'Coordinadora Senior', 'Directora Académica', 'Promoción a dirección', '2021-06-15'),
((SELECT id FROM employees WHERE employee_id = 'MIN25014'), 'department_change', 'department', 'Marketing', 'Comunicaciones', 'Reestructuración organizacional', '2023-01-01')

ON CONFLICT DO NOTHING;

-- Actualizar estadísticas de la base de datos
ANALYZE employees;
ANALYZE employee_document_requirements;
ANALYZE employee_history;

-- Mostrar resumen de datos insertados
DO $$
DECLARE
    employee_count INTEGER;
    requirement_count INTEGER;
    history_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM employees;
    SELECT COUNT(*) INTO requirement_count FROM employee_document_requirements;
    SELECT COUNT(*) INTO history_count FROM employee_history;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 ¡Datos de prueba insertados exitosamente!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '👥 Empleados creados: %', employee_count;
    RAISE NOTICE '📋 Requerimientos de documentos: %', requirement_count;
    RAISE NOTICE '📊 Registros de historial: %', history_count;
    RAISE NOTICE '';
    RAISE NOTICE '🏢 Departamentos con empleados:';
    RAISE NOTICE '   • Recursos Humanos: 2 empleados';
    RAISE NOTICE '   • Tecnología: 3 empleados';
    RAISE NOTICE '   • Finanzas: 2 empleados';
    RAISE NOTICE '   • Académico: 3 empleados';
    RAISE NOTICE '   • Legal: 1 empleado';
    RAISE NOTICE '   • Infraestructura: 1 empleado';
    RAISE NOTICE '   • Comunicaciones: 2 empleados';
    RAISE NOTICE '   • Calidad: 1 empleado';
    RAISE NOTICE '';
    RAISE NOTICE '📈 Estados de requerimientos:';
    RAISE NOTICE '   • Aprobados: Mayoría de DPIs y títulos';
    RAISE NOTICE '   • Pendientes: Exámenes médicos, certificaciones';
    RAISE NOTICE '   • Vencidos: Algunas certificaciones técnicas';
    RAISE NOTICE '   • Urgentes: Documentos próximos a vencer';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 ¡El sistema está listo para pruebas!';
END;
$$;