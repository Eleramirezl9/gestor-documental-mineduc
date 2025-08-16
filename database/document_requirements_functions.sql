-- =====================================================
-- FUNCIONES ADICIONALES PARA EL SISTEMA DE GESTIÓN DE DOCUMENTOS
-- =====================================================

-- Función para incrementar contador de recordatorios
CREATE OR REPLACE FUNCTION increment_reminder_count(requirement_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT reminder_sent_count INTO current_count
    FROM user_document_requirements
    WHERE id = requirement_id;
    
    RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de documentos por usuario
CREATE OR REPLACE FUNCTION get_user_document_summary(p_user_id UUID)
RETURNS TABLE (
    total_required INTEGER,
    pending INTEGER,
    approved INTEGER,
    rejected INTEGER,
    expired INTEGER,
    compliance_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_required,
        COUNT(CASE WHEN udr.status = 'pending' THEN 1 END)::INTEGER as pending,
        COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::INTEGER as approved,
        COUNT(CASE WHEN udr.status = 'rejected' THEN 1 END)::INTEGER as rejected,
        COUNT(CASE WHEN udr.status = 'expired' THEN 1 END)::INTEGER as expired,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as compliance_percentage
    FROM user_document_requirements udr
    WHERE udr.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resúmenes por departamento
CREATE OR REPLACE FUNCTION get_department_summaries()
RETURNS TABLE (
    department VARCHAR(100),
    total_users INTEGER,
    total_requirements INTEGER,
    approved_documents INTEGER,
    pending_documents INTEGER,
    expired_documents INTEGER,
    compliance_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.department,
        COUNT(DISTINCT up.id)::INTEGER as total_users,
        COUNT(udr.id)::INTEGER as total_requirements,
        COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::INTEGER as approved_documents,
        COUNT(CASE WHEN udr.status = 'pending' THEN 1 END)::INTEGER as pending_documents,
        COUNT(CASE WHEN udr.status = 'expired' THEN 1 END)::INTEGER as expired_documents,
        CASE 
            WHEN COUNT(udr.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::NUMERIC / COUNT(udr.id)::NUMERIC) * 100, 2)
            ELSE 0
        END as compliance_percentage
    FROM user_profiles up
    LEFT JOIN user_document_requirements udr ON up.id = udr.user_id
    WHERE up.is_active = true
    AND up.department IS NOT NULL
    GROUP BY up.department
    ORDER BY up.department;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar notificaciones de documentos antiguas
CREATE OR REPLACE FUNCTION cleanup_old_document_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar notificaciones de documentos más antiguas de 90 días
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND data->>'action' IN (
        'document_expiring', 'document_expired', 'document_pending', 
        'document_renewal_due', 'document_required', 'document_uploaded'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para generar estadísticas de cumplimiento
CREATE OR REPLACE FUNCTION get_compliance_stats(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_department VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    period_label VARCHAR(50),
    total_requirements INTEGER,
    completed_on_time INTEGER,
    completed_late INTEGER,
    still_pending INTEGER,
    average_completion_days NUMERIC,
    compliance_rate NUMERIC
) AS $$
DECLARE
    start_date DATE;
    end_date DATE;
BEGIN
    -- Establecer fechas por defecto si no se proporcionan
    start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_start_date IS NULL THEN 'Últimos 30 días'
            ELSE start_date::VARCHAR || ' - ' || end_date::VARCHAR
        END as period_label,
        
        COUNT(*)::INTEGER as total_requirements,
        
        COUNT(CASE 
            WHEN udr.status = 'approved' 
            AND udr.approved_date <= udr.required_date 
            THEN 1 
        END)::INTEGER as completed_on_time,
        
        COUNT(CASE 
            WHEN udr.status = 'approved' 
            AND udr.approved_date > udr.required_date 
            THEN 1 
        END)::INTEGER as completed_late,
        
        COUNT(CASE 
            WHEN udr.status IN ('pending', 'rejected')
            THEN 1 
        END)::INTEGER as still_pending,
        
        ROUND(AVG(CASE 
            WHEN udr.status = 'approved' AND udr.approved_date IS NOT NULL
            THEN EXTRACT(days FROM udr.approved_date - udr.created_at)
            ELSE NULL
        END), 2) as average_completion_days,
        
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as compliance_rate
        
    FROM user_document_requirements udr
    JOIN user_profiles up ON up.id = udr.user_id
    WHERE udr.created_at::DATE BETWEEN start_date AND end_date
    AND (p_department IS NULL OR up.department = p_department)
    AND up.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Función para identificar usuarios con documentos críticos vencidos
CREATE OR REPLACE FUNCTION get_critical_users()
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR(200),
    user_email VARCHAR(255),
    department VARCHAR(100),
    expired_count INTEGER,
    overdue_count INTEGER,
    last_activity TIMESTAMPTZ,
    risk_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id as user_id,
        (up.first_name || ' ' || up.last_name) as user_name,
        up.email as user_email,
        up.department,
        COUNT(CASE WHEN udr.status = 'expired' THEN 1 END)::INTEGER as expired_count,
        COUNT(CASE 
            WHEN udr.status = 'pending' 
            AND udr.required_date < CURRENT_DATE 
            THEN 1 
        END)::INTEGER as overdue_count,
        up.last_login as last_activity,
        CASE 
            WHEN COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) >= 3 THEN 'critical'
            WHEN COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) >= 1 
                OR COUNT(CASE WHEN udr.status = 'pending' AND udr.required_date < CURRENT_DATE THEN 1 END) >= 2 
                THEN 'high'
            WHEN COUNT(CASE WHEN udr.status = 'pending' AND udr.required_date < CURRENT_DATE THEN 1 END) >= 1 
                THEN 'medium'
            ELSE 'low'
        END as risk_level
    FROM user_profiles up
    LEFT JOIN user_document_requirements udr ON up.id = udr.user_id
    WHERE up.is_active = true
    GROUP BY up.id, up.first_name, up.last_name, up.email, up.department, up.last_login
    HAVING COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) > 0
        OR COUNT(CASE WHEN udr.status = 'pending' AND udr.required_date < CURRENT_DATE THEN 1 END) > 0
    ORDER BY 
        CASE 
            WHEN COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) >= 3 THEN 1
            WHEN COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) >= 1 THEN 2
            WHEN COUNT(CASE WHEN udr.status = 'pending' AND udr.required_date < CURRENT_DATE THEN 1 END) >= 2 THEN 3
            ELSE 4
        END,
        COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) DESC,
        COUNT(CASE WHEN udr.status = 'pending' AND udr.required_date < CURRENT_DATE THEN 1 END) DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger para enviar notificación cuando se asigna un nuevo documento
CREATE OR REPLACE FUNCTION notify_new_document_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo enviar notificación si es una nueva asignación
    IF TG_OP = 'INSERT' THEN
        -- Aquí se podría integrar con el sistema de notificaciones
        -- Por ahora solo registramos en logs
        RAISE NOTICE 'Nuevo documento asignado: Usuario %, Tipo %', NEW.user_id, NEW.document_type_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
CREATE TRIGGER trigger_notify_new_document_assignment
    AFTER INSERT ON user_document_requirements
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_document_assignment();

-- Vista para el dashboard de administradores
CREATE VIEW admin_dashboard_summary AS
SELECT 
    'global' as scope,
    COUNT(DISTINCT up.id) as total_users,
    COUNT(DISTINCT up.department) as total_departments,
    COUNT(dt.id) as total_document_types,
    COUNT(udr.id) as total_requirements,
    COUNT(CASE WHEN udr.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN udr.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN udr.status = 'expired' THEN 1 END) as expired_count,
    COUNT(CASE WHEN udr.status = 'rejected' THEN 1 END) as rejected_count,
    ROUND(
        CASE 
            WHEN COUNT(udr.id) > 0 THEN 
                (COUNT(CASE WHEN udr.status = 'approved' THEN 1 END)::NUMERIC / COUNT(udr.id)::NUMERIC) * 100
            ELSE 0
        END, 2
    ) as overall_compliance_rate,
    COUNT(CASE 
        WHEN udr.expiration_date IS NOT NULL 
        AND udr.expiration_date <= CURRENT_DATE + INTERVAL '7 days'
        AND udr.expiration_date > CURRENT_DATE
        THEN 1 
    END) as expiring_soon_count,
    COUNT(CASE 
        WHEN udr.required_date < CURRENT_DATE 
        AND udr.status = 'pending'
        THEN 1 
    END) as overdue_count
FROM user_profiles up
CROSS JOIN document_types dt
LEFT JOIN user_document_requirements udr ON up.id = udr.user_id
WHERE up.is_active = true
AND dt.is_active = true;

-- Índices adicionales para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_doc_req_status_date ON user_document_requirements(status, required_date);
CREATE INDEX IF NOT EXISTS idx_user_doc_req_expiration_status ON user_document_requirements(expiration_date, status);
CREATE INDEX IF NOT EXISTS idx_user_doc_req_user_status ON user_document_requirements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_document_reminders_sent_at ON document_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_document_reminders_type_user ON document_reminders(reminder_type, user_id);

-- Comentarios en las tablas y funciones para documentación
COMMENT ON TABLE document_types IS 'Tipos de documentos requeridos en la organización con configuración de vencimientos y recordatorios';
COMMENT ON TABLE user_document_requirements IS 'Documentos específicos requeridos para cada usuario con seguimiento de estado y fechas';
COMMENT ON TABLE document_reminders IS 'Historial de recordatorios enviados a usuarios sobre sus documentos';
COMMENT ON TABLE department_document_policies IS 'Políticas específicas de documentos por departamento que anulan configuraciones globales';

COMMENT ON FUNCTION get_user_document_summary(UUID) IS 'Obtiene resumen estadístico de documentos para un usuario específico';
COMMENT ON FUNCTION get_department_summaries() IS 'Obtiene estadísticas de cumplimiento de documentos por departamento';
COMMENT ON FUNCTION get_compliance_stats(DATE, DATE, VARCHAR) IS 'Genera estadísticas de cumplimiento para un período y departamento específicos';
COMMENT ON FUNCTION get_critical_users() IS 'Identifica usuarios con documentos vencidos o atrasados que requieren atención urgente';