-- =====================================================
-- DATOS DE PRUEBA PARA GESTIÓN DE EMPLEADOS - SISTEMA MINEDUC
-- =====================================================

-- Insertar empleados de prueba
INSERT INTO employees (
    employee_id, email, first_name, last_name, department, position,
    hire_date, phone, address, date_of_birth, national_id,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    is_active, email_notifications, created_by
) VALUES
-- Empleados del departamento de Recursos Humanos
('MIN25001', 'ana.garcia@mineduc.gob.gt', 'Ana', 'García', 'Recursos Humanos', 'Especialista en Personal',
 '2024-01-15', '+502 2411-9595', 'Zona 10, Ciudad de Guatemala', '1985-03-20', '1985032001201',
 'Carlos García', '+502 5555-1234', 'Esposo', true, true, NULL),

('MIN25002', 'luis.martinez@mineduc.gob.gt', 'Luis', 'Martínez', 'Recursos Humanos', 'Director de RRHH',
 '2020-05-10', '+502 2411-9596', 'Zona 1, Ciudad de Guatemala', '1978-11-15', '1978111501201',
 'María Martínez', '+502 5555-5678', 'Esposa', true, true, NULL),

-- Empleados del departamento de Tecnología
('MIN25003', 'carlos.lopez@mineduc.gob.gt', 'Carlos', 'López', 'Tecnología', 'Desarrollador Senior',
 '2024-02-01', '+502 2411-9597', 'Zona 15, Ciudad de Guatemala', '1990-07-08', '1990070801201',
 'Ana López', '+502 5555-9876', 'Esposa', true, true, NULL),

('MIN25004', 'sofia.rodriguez@mineduc.gob.gt', 'Sofía', 'Rodríguez', 'Tecnología', 'Analista de Sistemas',
 '2023-08-15', '+502 2411-9598', 'Zona 11, Ciudad de Guatemala', '1992-12-03', '1992120301201',
 'Pedro Rodríguez', '+502 5555-4321', 'Padre', true, true, NULL),

-- Empleados del departamento de Finanzas
('MIN25005', 'maria.rodriguez@mineduc.gob.gt', 'María', 'Rodríguez', 'Finanzas', 'Contadora',
 '2024-03-01', '+502 2411-9599', 'Zona 13, Ciudad de Guatemala', '1987-09-25', '1987092501201',
 'José Rodríguez', '+502 5555-8765', 'Hermano', true, true, NULL),

('MIN25006', 'ricardo.morales@mineduc.gob.gt', 'Ricardo', 'Morales', 'Finanzas', 'Director Financiero',
 '2019-01-20', '+502 2411-9600', 'Zona 14, Ciudad de Guatemala', '1975-04-12', '1975041201201',
 'Carmen Morales', '+502 5555-2468', 'Esposa', true, true, NULL),

-- Empleados del departamento Académico
('MIN25007', 'elena.vargas@mineduc.gob.gt', 'Elena', 'Vargas', 'Académico', 'Coordinadora Pedagógica',
 '2022-09-05', '+502 2411-9601', 'Zona 7, Ciudad de Guatemala', '1983-06-18', '1983061801201',
 'Miguel Vargas', '+502 5555-1357', 'Esposo', true, true, NULL),

('MIN25008', 'fernando.castillo@mineduc.gob.gt', 'Fernando', 'Castillo', 'Académico', 'Especialista Curricular',
 '2023-01-10', '+502 2411-9602', 'Zona 12, Ciudad de Guatemala', '1989-02-28', '1989022801201',
 'Laura Castillo', '+502 5555-9753', 'Esposa', true, true, NULL),

-- Empleados del departamento Legal
('MIN25009', 'patricia.hernandez@mineduc.gob.gt', 'Patricia', 'Hernández', 'Legal', 'Asesora Jurídica',
 '2021-11-15', '+502 2411-9603', 'Zona 4, Ciudad de Guatemala', '1980-10-05', '1980100501201',
 'Roberto Hernández', '+502 5555-8642', 'Esposo', true, true, NULL),

-- Empleados del departamento de Infraestructura
('MIN25010', 'alberto.jimenez@mineduc.gob.gt', 'Alberto', 'Jiménez', 'Infraestructura', 'Ingeniero Civil',
 '2022-03-20', '+502 2411-9604', 'Zona 6, Ciudad de Guatemala', '1984-08-14', '1984081401201',
 'Gloria Jiménez', '+502 5555-7531', 'Esposa', true, true, NULL);

-- Insertar requerimientos de documentos para empleados
INSERT INTO employee_document_requirements (
    employee_id, document_type, description, required_date, status, priority, created_by
) VALUES
-- Requerimientos para Ana García (MIN25001)
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'DPI', 'Documento Personal de Identificación actualizado', '2024-12-31', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'Antecedentes Penales', 'Antecedentes penales vigentes', '2024-12-15', 'pending', 'urgent', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25001'), 'Examen Médico', 'Examen médico anual', '2024-11-30', 'pending', 'medium', NULL),

-- Requerimientos para Luis Martínez (MIN25002)
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-05-10', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'Título Universitario', 'Título universitario legalizado', '2024-12-31', 'approved', 'medium', NULL),

-- Requerimientos para Carlos López (MIN25003)
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'DPI', 'Documento Personal de Identificación actualizado', '2026-03-15', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'Certificación Técnica', 'Certificación en tecnologías actuales', '2024-10-01', 'expired', 'medium', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'Antecedentes Penales', 'Antecedentes penales vigentes', '2024-12-20', 'pending', 'high', NULL),

-- Requerimientos para Sofía Rodríguez (MIN25004)
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-08-15', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'Título Universitario', 'Título en Ingeniería en Sistemas', '2024-12-31', 'approved', 'medium', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25004'), 'Examen Médico', 'Examen médico anual', '2024-12-10', 'pending', 'medium', NULL),

-- Requerimientos para María Rodríguez (MIN25005)
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'DPI', 'Documento Personal de Identificación actualizado', '2027-01-20', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'Título Universitario', 'Título en Contaduría Pública', '2024-12-31', 'approved', 'medium', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25005'), 'Colegiación Profesional', 'Colegiación vigente CPA', '2024-12-25', 'pending', 'high', NULL),

-- Requerimientos para Ricardo Morales (MIN25006)
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-04-12', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'MBA', 'Maestría en Administración de Empresas', '2024-12-31', 'approved', 'medium', NULL),

-- Requerimientos para Elena Vargas (MIN25007)
((SELECT id FROM employees WHERE employee_id = 'MIN25007'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-06-18', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25007'), 'Licencia de Enseñanza', 'Licencia para enseñar vigente', '2024-12-30', 'pending', 'high', NULL),

-- Requerimientos para Fernando Castillo (MIN25008)
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-02-28', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'Maestría en Educación', 'Título de maestría en educación', '2024-12-31', 'approved', 'medium', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25008'), 'Examen Médico', 'Examen médico anual', '2024-12-05', 'pending', 'medium', NULL),

-- Requerimientos para Patricia Hernández (MIN25009)
((SELECT id FROM employees WHERE employee_id = 'MIN25009'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-10-05', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25009'), 'Colegiación Legal', 'Colegiación de abogados vigente', '2024-12-31', 'approved', 'high', NULL),

-- Requerimientos para Alberto Jiménez (MIN25010)
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'DPI', 'Documento Personal de Identificación actualizado', '2025-08-14', 'approved', 'high', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'Título Ingeniería', 'Título de Ingeniería Civil', '2024-12-31', 'approved', 'medium', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25010'), 'Colegiación CIG', 'Colegiación de Ingenieros vigente', '2024-11-25', 'pending', 'high', NULL);

-- Insertar algunos registros de historial
INSERT INTO employee_history (
    employee_id, action, field_changed, old_value, new_value, reason, effective_date, created_by
) VALUES
((SELECT id FROM employees WHERE employee_id = 'MIN25002'), 'promotion', 'position', 'Especialista RRHH', 'Director de RRHH', 'Promoción por excelente desempeño', '2023-01-01', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25003'), 'salary_adjustment', 'salary', '15000.00', '18000.00', 'Ajuste salarial anual', '2024-01-01', NULL),
((SELECT id FROM employees WHERE employee_id = 'MIN25006'), 'promotion', 'position', 'Contador Senior', 'Director Financiero', 'Promoción a dirección', '2022-01-01', NULL);

-- Actualizar estadísticas de la base de datos
ANALYZE employees;
ANALYZE employee_document_requirements;
ANALYZE employee_history;