-- =====================================================
-- RESET Y APLICACIÓN DE POLÍTICAS RLS
-- Sistema Gestor Documental MINEDUC
-- =====================================================

-- IMPORTANTE: Este script elimina todas las políticas existentes
-- y aplica las nuevas políticas de seguridad

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES
-- =====================================================

-- Eliminar políticas de user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create users" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users" ON user_profiles;

-- Eliminar políticas de document_categories
DROP POLICY IF EXISTS "Users can view active categories" ON document_categories;
DROP POLICY IF EXISTS "Admins and editors can manage categories" ON document_categories;

-- Eliminar políticas de documents
DROP POLICY IF EXISTS "Users can view public documents and own documents" ON documents;
DROP POLICY IF EXISTS "Users can create documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents or admins/editors can update any" ON documents;
DROP POLICY IF EXISTS "Only admins can delete documents" ON documents;

-- Eliminar políticas de document_versions
DROP POLICY IF EXISTS "Users can view document versions they can access" ON document_versions;
DROP POLICY IF EXISTS "Users can create versions of documents they can edit" ON document_versions;

-- Eliminar políticas de workflows
DROP POLICY IF EXISTS "Users can view related workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows" ON workflows;
DROP POLICY IF EXISTS "Assigned users and creators can update workflows" ON workflows;

-- Eliminar políticas de workflow_steps
DROP POLICY IF EXISTS "Users can view workflow steps they can access" ON workflow_steps;
DROP POLICY IF EXISTS "Only admins can create workflow steps" ON workflow_steps;
DROP POLICY IF EXISTS "Approvers can update their own steps" ON workflow_steps;

-- Eliminar políticas de notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Eliminar políticas de audit_logs
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can create audit logs" ON audit_logs;

-- Eliminar políticas de system_settings
DROP POLICY IF EXISTS "Only admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can manage system settings" ON system_settings;

-- Eliminar políticas de storage
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view public files and own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete files" ON storage.objects;

-- =====================================================
-- PASO 2: HABILITAR RLS EN TODAS LAS TABLAS
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
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 3: CREAR FUNCIONES DE UTILIDAD
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
-- PASO 4: CREAR NUEVAS POLÍTICAS
-- =====================================================

-- POLÍTICAS PARA user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create users" ON user_profiles
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can manage users" ON user_profiles
    FOR UPDATE USING (is_admin());

-- POLÍTICAS PARA document_categories
CREATE POLICY "Users can view active categories" ON document_categories
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins and editors can manage categories" ON document_categories
    FOR ALL USING (can_edit());

-- POLÍTICAS PARA documents
CREATE POLICY "Users can view public documents and own documents" ON documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            is_public = true 
            OR created_by = auth.uid()
            OR can_edit()
        )
    );

CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own documents or admins/editors can update any" ON documents
    FOR UPDATE USING (
        created_by = auth.uid() OR can_edit()
    );

CREATE POLICY "Only admins can delete documents" ON documents
    FOR DELETE USING (is_admin());

-- POLÍTICAS PARA document_versions
CREATE POLICY "Users can view document versions they can access" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (
                d.is_public = true 
                OR d.created_by = auth.uid()
                OR can_edit()
            )
        )
    );

CREATE POLICY "Users can create versions of documents they can edit" ON document_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (d.created_by = auth.uid() OR can_edit())
        )
    );

-- POLÍTICAS PARA workflows
CREATE POLICY "Users can view related workflows" ON workflows
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            requester_id = auth.uid()
            OR current_approver_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workflow_steps ws 
                WHERE ws.workflow_id = id AND ws.approver_id = auth.uid()
            )
            OR can_edit()
        )
    );

CREATE POLICY "Users can create workflows" ON workflows
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id AND
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id 
            AND (
                d.created_by = auth.uid()
                OR d.is_public = true
                OR can_edit()
            )
        )
    );

CREATE POLICY "Assigned users and creators can update workflows" ON workflows
    FOR UPDATE USING (
        requester_id = auth.uid() 
        OR current_approver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflow_steps ws 
            WHERE ws.workflow_id = id AND ws.approver_id = auth.uid()
        )
        OR can_edit()
    );

-- POLÍTICAS PARA workflow_steps
CREATE POLICY "Users can view workflow steps they can access" ON workflow_steps
    FOR SELECT USING (
        approver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflows w 
            WHERE w.id = workflow_id 
            AND (
                w.requester_id = auth.uid()
                OR w.current_approver_id = auth.uid()
                OR can_edit()
            )
        )
    );

CREATE POLICY "Admins can create workflow steps" ON workflow_steps
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Approvers can update their own steps" ON workflow_steps
    FOR UPDATE USING (approver_id = auth.uid() OR can_edit());

-- POLÍTICAS PARA notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

-- POLÍTICAS PARA audit_logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "Service role can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- POLÍTICAS PARA system_settings
CREATE POLICY "Only admins can view system settings" ON system_settings
    FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can manage system settings" ON system_settings
    FOR ALL USING (is_admin());

-- POLÍTICAS PARA STORAGE
CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

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

CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Only admins can delete files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND is_admin()
    );

-- =====================================================
-- PASO 5: CONFIGURAR GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- PASO 6: CREAR TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers (DROP IF EXISTS para evitar errores)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_categories_updated_at ON document_categories;
CREATE TRIGGER update_document_categories_updated_at 
    BEFORE UPDATE ON document_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at 
    BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONFIRMACIÓN
-- =====================================================

SELECT 'RLS Policies aplicadas correctamente' as status;