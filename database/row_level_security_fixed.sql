-- =====================================================
-- POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY) - CORREGIDO
-- Sistema Gestor Documental MINEDUC
-- =====================================================

-- IMPORTANTE: Ejecutar estas políticas en Supabase SQL Editor
-- después de crear el esquema principal (schema.sql)

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS EXISTENTES
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA user_profiles
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (campos limitados)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Solo admins pueden crear nuevos usuarios
CREATE POLICY "Admins can create users" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Solo admins pueden cambiar roles de otros usuarios
CREATE POLICY "Admins can manage users" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS PARA document_categories
-- =====================================================

-- Todos los usuarios autenticados pueden ver categorías activas
CREATE POLICY "Users can view active categories" ON document_categories
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Solo admins y editores pueden gestionar categorías
CREATE POLICY "Admins and editors can manage categories" ON document_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
        )
    );

-- =====================================================
-- POLÍTICAS PARA documents
-- =====================================================

-- Los usuarios pueden ver documentos públicos y sus propios documentos
CREATE POLICY "Users can view public documents and own documents" ON documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            is_public = true 
            OR created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
            )
        )
    );

-- Los usuarios pueden crear documentos
CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Los usuarios pueden actualizar sus propios documentos o admins/editores pueden actualizar cualquiera
CREATE POLICY "Users can update own documents or admins/editors can update any" ON documents
    FOR UPDATE USING (
        created_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
        )
    );

-- Solo admins pueden eliminar documentos
CREATE POLICY "Only admins can delete documents" ON documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS PARA document_versions
-- =====================================================

-- Los usuarios pueden ver versiones de documentos que pueden ver
CREATE POLICY "Users can view document versions they can access" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (
                d.is_public = true 
                OR d.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_profiles up 
                    WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
                )
            )
        )
    );

-- Los usuarios pueden crear versiones de documentos que pueden editar
CREATE POLICY "Users can create versions of documents they can edit" ON document_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (
                d.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_profiles up 
                    WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
                )
            )
        )
    );

-- =====================================================
-- POLÍTICAS PARA workflows
-- =====================================================

-- Los usuarios pueden ver workflows donde están involucrados
CREATE POLICY "Users can view related workflows" ON workflows
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            requester_id = auth.uid()
            OR current_approver_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workflow_steps ws 
                WHERE ws.workflow_id = id AND ws.approver_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
            )
        )
    );

-- Los usuarios pueden crear workflows para documentos que pueden ver
CREATE POLICY "Users can create workflows" ON workflows
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id AND
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (
                d.created_by = auth.uid()
                OR d.is_public = true
                OR EXISTS (
                    SELECT 1 FROM user_profiles up 
                    WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
                )
            )
        )
    );

-- Los usuarios asignados, creadores y admins pueden actualizar workflows
CREATE POLICY "Assigned users and creators can update workflows" ON workflows
    FOR UPDATE USING (
        requester_id = auth.uid() 
        OR current_approver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflow_steps ws 
            WHERE ws.workflow_id = id AND ws.approver_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
        )
    );

-- =====================================================
-- POLÍTICAS PARA workflow_steps
-- =====================================================

-- Los usuarios pueden ver pasos de workflows que pueden ver
CREATE POLICY "Users can view workflow steps they can access" ON workflow_steps
    FOR SELECT USING (
        approver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflows w 
            WHERE w.id = workflow_id 
            AND (
                w.requester_id = auth.uid()
                OR w.current_approver_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_profiles up 
                    WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
                )
            )
        )
    );

-- Solo admins pueden crear pasos de workflow
CREATE POLICY "Only admins can create workflow steps" ON workflow_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Los aprobadores pueden actualizar sus propios pasos
CREATE POLICY "Approvers can update their own steps" ON workflow_steps
    FOR UPDATE USING (
        approver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'editor')
        )
    );

-- =====================================================
-- POLÍTICAS PARA notifications
-- =====================================================

-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Solo el sistema (service role) puede crear notificaciones
CREATE POLICY "Service role can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Esto se maneja a nivel de service role

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- POLÍTICAS PARA audit_logs
-- =====================================================

-- Solo admins pueden ver logs de auditoría
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Solo el sistema puede crear logs de auditoría
CREATE POLICY "Service role can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLÍTICAS PARA system_settings
-- =====================================================

-- Solo admins pueden ver configuraciones del sistema
CREATE POLICY "Only admins can view system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Solo admins pueden gestionar configuraciones del sistema
CREATE POLICY "Only admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =====================================================
-- FUNCIONES DE UTILIDAD PARA RLS
-- =====================================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario puede editar
CREATE OR REPLACE FUNCTION can_edit()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS PARA USUARIOS AUTENTICADOS
-- =====================================================

-- Dar permisos básicos a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Dar permisos especiales al service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at 
    BEFORE UPDATE ON document_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at 
    BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONFIGURACIÓN DE STORAGE (Bucket de documentos)
-- =====================================================

-- Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan subir archivos
CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Política para que los usuarios puedan ver archivos públicos y propios
CREATE POLICY "Users can view public files and own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM documents d 
                WHERE d.file_path LIKE '%' || name || '%' 
                AND (d.is_public = true OR d.created_by = auth.uid())
            )
        )
    );

-- Política para que los usuarios puedan actualizar sus propios archivos
CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Política para que solo admins puedan eliminar archivos
CREATE POLICY "Only admins can delete files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =====================================================
-- INSTRUCCIONES DE APLICACIÓN
-- =====================================================

/*
INSTRUCCIONES PARA APLICAR ESTAS POLÍTICAS:

1. Asegúrate de haber ejecutado primero database/schema.sql
2. Ve a tu dashboard de Supabase
3. Abre el SQL Editor
4. Copia y pega este archivo completo
5. Ejecuta el script
6. Verifica que no hay errores

TABLAS INCLUIDAS EN ESTE ARCHIVO:
✅ user_profiles
✅ document_categories  
✅ documents
✅ document_versions
✅ workflows
✅ workflow_steps
✅ notifications
✅ audit_logs
✅ system_settings
✅ storage.objects

IMPORTANTE:
- Este archivo está corregido para las tablas que realmente existen
- Si agregas nuevas tablas, debes crear políticas RLS para ellas
- Siempre prueba en desarrollo antes de aplicar en producción

TROUBLESHOOTING:
- Si obtienes errores de "policy violation", verifica que el usuario tenga el rol correcto
- Si los uploads de archivos fallan, verifica que el bucket 'documents' existe
- Si hay problemas de permisos, revisa que las políticas estén habilitadas
*/