-- =====================================================
-- ACTUALIZAR URL DEL PORTAL DE EMPLEADOS A PRODUCCIÓN
-- =====================================================
-- Este script actualiza la función generate_employee_portal_token
-- para usar la URL de producción en lugar de localhost
-- =====================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS generate_employee_portal_token(UUID);

-- Crear función actualizada con URL de producción
CREATE OR REPLACE FUNCTION generate_employee_portal_token(p_employee_id UUID)
RETURNS TABLE (
  token TEXT,
  portal_url TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_portal_url TEXT;
BEGIN
  -- Generar token único
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Establecer expiración (7 días desde ahora)
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Construir URL del portal usando URL de producción
  v_portal_url := 'https://gestor-documental-mineduc.vercel.app/employee-portal/' || v_token;

  -- Insertar o actualizar token en la tabla employee_portal_tokens
  INSERT INTO employee_portal_tokens (
    employee_id,
    token,
    expires_at,
    created_at
  ) VALUES (
    p_employee_id,
    v_token,
    v_expires_at,
    NOW()
  )
  ON CONFLICT (employee_id)
  DO UPDATE SET
    token = v_token,
    expires_at = v_expires_at,
    created_at = NOW();

  -- Retornar datos del token
  RETURN QUERY SELECT v_token, v_portal_url, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION generate_employee_portal_token IS 'Genera un token de acceso al portal de empleados con URL de producción';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Puedes probar la función con:
-- SELECT * FROM generate_employee_portal_token('tu-employee-uuid-aqui');
