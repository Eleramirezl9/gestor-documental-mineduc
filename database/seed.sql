-- =====================================================
-- DATOS DE PRUEBA PARA SISTEMA GESTOR DOCUMENTAL MINEDUC
-- =====================================================

-- NOTA: Este archivo debe ejecutarse DESPUÉS de schema.sql
-- y DESPUÉS de crear usuarios en Supabase Auth

-- =====================================================
-- USUARIOS DE PRUEBA (Perfiles)
-- =====================================================

-- IMPORTANTE: Los IDs de usuario deben coincidir con los usuarios creados en Supabase Auth
-- Estos son ejemplos que deben ser reemplazados con IDs reales

-- Usuario Administrador
INSERT INTO user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    department, 
    phone, 
    permissions
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Reemplazar con ID real
    'admin@mineduc.gob.gt',
    'Carlos',
    'Administrador',
    'admin',
    'Tecnología',
    '+502 2222-3333',
    '["manage_users", "manage_documents", "manage_system", "view_audit", "export_data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Usuario Editor
INSERT INTO user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    department, 
    phone, 
    permissions
) VALUES (
    '00000000-0000-0000-0000-000000000002', -- Reemplazar con ID real
    'editor@mineduc.gob.gt',
    'María',
    'Editora',
    'editor',
    'Documentación',
    '+502 2222-4444',
    '["create_documents", "edit_documents", "approve_documents", "view_reports"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Usuario Visualizador
INSERT INTO user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    department, 
    phone, 
    permissions
) VALUES (
    '00000000-0000-0000-0000-000000000003', -- Reemplazar con ID real
    'viewer@mineduc.gob.gt',
    'Juan',
    'Consultor',
    'viewer',
    'Consultoría',
    '+502 2222-5555',
    '["view_documents", "download_documents"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DOCUMENTOS DE PRUEBA
-- =====================================================

-- Documento 1: Reglamento Académico
INSERT INTO documents (
    id,
    title,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    category_id,
    tags,
    extracted_text,
    status,
    is_public,
    effective_date,
    created_by
) VALUES (
    uuid_generate_v4(),
    'Reglamento Académico 2024',
    'Reglamento académico actualizado para el año lectivo 2024, incluye nuevas normativas para evaluación y promoción estudiantil.',
    'reglamento_academico_2024.pdf',
    '/documents/reglamento_academico_2024.pdf',
    2048576, -- 2MB
    'pdf',
    'application/pdf',
    (SELECT id FROM document_categories WHERE name = 'Académico'),
    '["reglamento", "académico", "2024", "evaluación", "promoción"]'::jsonb,
    'REGLAMENTO ACADÉMICO 2024\n\nCAPÍTULO I - DISPOSICIONES GENERALES\n\nArtículo 1. El presente reglamento establece las normas...',
    'approved',
    true,
    '2024-01-01',
    '00000000-0000-0000-0000-000000000001'
);

-- Documento 2: Manual de Procedimientos
INSERT INTO documents (
    id,
    title,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    category_id,
    tags,
    extracted_text,
    status,
    is_public,
    created_by
) VALUES (
    uuid_generate_v4(),
    'Manual de Procedimientos Administrativos',
    'Manual que describe los procedimientos administrativos estándar del ministerio.',
    'manual_procedimientos_admin.pdf',
    '/documents/manual_procedimientos_admin.pdf',
    3145728, -- 3MB
    'pdf',
    'application/pdf',
    (SELECT id FROM document_categories WHERE name = 'Administrativo'),
    '["manual", "procedimientos", "administrativo", "procesos"]'::jsonb,
    'MANUAL DE PROCEDIMIENTOS ADMINISTRATIVOS\n\nINTRODUCCIÓN\n\nEste manual tiene como objetivo...',
    'pending',
    false,
    '00000000-0000-0000-0000-000000000002'
);

-- Documento 3: Presupuesto Anual
INSERT INTO documents (
    id,
    title,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    category_id,
    tags,
    extracted_text,
    status,
    is_public,
    effective_date,
    expiration_date,
    created_by
) VALUES (
    uuid_generate_v4(),
    'Presupuesto Anual 2024',
    'Presupuesto aprobado para el ejercicio fiscal 2024.',
    'presupuesto_2024.xlsx',
    '/documents/presupuesto_2024.xlsx',
    1572864, -- 1.5MB
    'xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    (SELECT id FROM document_categories WHERE name = 'Financiero'),
    '["presupuesto", "2024", "financiero", "fiscal"]'::jsonb,
    'PRESUPUESTO ANUAL 2024\n\nRESUMEN EJECUTIVO\n\nEl presupuesto para el año 2024...',
    'approved',
    true,
    '2024-01-01',
    '2024-12-31',
    '00000000-0000-0000-0000-000000000001'
);

-- =====================================================
-- FLUJOS DE TRABAJO DE PRUEBA
-- =====================================================

-- Workflow para el manual de procedimientos
INSERT INTO workflows (
    id,
    document_id,
    workflow_type,
    status,
    requester_id,
    current_approver_id,
    priority,
    due_date,
    comments
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM documents WHERE title = 'Manual de Procedimientos Administrativos'),
    'approval',
    'pending',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'medium',
    NOW() + INTERVAL '7 days',
    'Solicitud de aprobación para el manual de procedimientos administrativos actualizado.'
);

-- =====================================================
-- PASOS DE WORKFLOW
-- =====================================================

-- Paso de aprobación para el workflow anterior
INSERT INTO workflow_steps (
    workflow_id,
    step_order,
    approver_id,
    status,
    comments
) VALUES (
    (SELECT id FROM workflows WHERE status = 'pending' LIMIT 1),
    1,
    '00000000-0000-0000-0000-000000000001',
    'pending',
    'Pendiente de revisión por el administrador del sistema.'
);

-- =====================================================
-- NOTIFICACIONES DE PRUEBA
-- =====================================================

-- Notificación para el administrador sobre documento pendiente
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_entity_type,
    related_entity_id,
    action_url
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Documento pendiente de aprobación',
    'El documento "Manual de Procedimientos Administrativos" está pendiente de su aprobación.',
    'warning',
    'document',
    (SELECT id FROM documents WHERE title = 'Manual de Procedimientos Administrativos'),
    '/workflows'
);

-- Notificación de bienvenida para el editor
INSERT INTO notifications (
    user_id,
    title,
    message,
    type
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Bienvenido al Sistema de Gestión Documental',
    'Su cuenta ha sido activada exitosamente. Ya puede comenzar a crear y gestionar documentos.',
    'success'
);

-- Notificación informativa para el visualizador
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_entity_type,
    related_entity_id,
    action_url
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Nuevo documento disponible',
    'Se ha publicado el "Reglamento Académico 2024" y está disponible para consulta.',
    'info',
    'document',
    (SELECT id FROM documents WHERE title = 'Reglamento Académico 2024'),
    '/documents'
);

-- =====================================================
-- REGISTROS DE AUDITORÍA DE PRUEBA
-- =====================================================

-- Registro de creación de documento
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'DOCUMENT_CREATED',
    'document',
    (SELECT id FROM documents WHERE title = 'Reglamento Académico 2024'),
    '{"title": "Reglamento Académico 2024", "category": "Académico"}'::jsonb,
    '192.168.1.100'
);

-- Registro de aprobación de documento
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'DOCUMENT_APPROVED',
    'document',
    (SELECT id FROM documents WHERE title = 'Reglamento Académico 2024'),
    '{"title": "Reglamento Académico 2024", "approved_by": "Carlos Administrador"}'::jsonb,
    '192.168.1.100'
);

-- Registro de inicio de sesión
INSERT INTO audit_logs (
    user_id,
    action,
    details,
    ip_address,
    user_agent
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'LOGIN_SUCCESS',
    '{"email": "editor@mineduc.gob.gt"}'::jsonb,
    '192.168.1.101',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

-- =====================================================
-- VERSIONES DE DOCUMENTOS
-- =====================================================

-- Versión inicial del reglamento académico
INSERT INTO document_versions (
    document_id,
    version_number,
    file_name,
    file_path,
    file_size,
    changes_description,
    created_by
) VALUES (
    (SELECT id FROM documents WHERE title = 'Reglamento Académico 2024'),
    1,
    'reglamento_academico_2024_v1.pdf',
    '/documents/versions/reglamento_academico_2024_v1.pdf',
    2048576,
    'Versión inicial del reglamento académico 2024',
    '00000000-0000-0000-0000-000000000001'
);

-- =====================================================
-- CONFIGURACIONES ADICIONALES DEL SISTEMA
-- =====================================================

-- Configuración de notificaciones por email
INSERT INTO system_settings (key, value, description, is_public) VALUES
('email_notifications_enabled', 'true', 'Habilitar notificaciones por correo electrónico', false),
('workflow_timeout_days', '7', 'Días antes de que expire un flujo de trabajo', false),
('auto_archive_days', '365', 'Días después de los cuales los documentos se archivan automáticamente', false),
('backup_frequency_hours', '24', 'Frecuencia de respaldo en horas', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- COMENTARIOS Y NOTAS
-- =====================================================

-- IMPORTANTE: 
-- 1. Los UUIDs de usuarios (00000000-0000-0000-0000-000000000001, etc.) 
--    son ejemplos y deben ser reemplazados con los IDs reales de Supabase Auth
-- 2. Los paths de archivos (/documents/...) son ejemplos y deben coincidir 
--    con la estructura real de Supabase Storage
-- 3. Este script debe ejecutarse después de crear los usuarios en Supabase Auth
-- 4. Algunos datos pueden necesitar ajustes según la configuración específica del proyecto

-- Para obtener los IDs reales de usuarios de Supabase Auth, usar:
-- SELECT id, email FROM auth.users;

-- Fin de datos de prueba

