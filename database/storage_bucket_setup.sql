-- =====================================================
-- CONFIGURACIÓN DEL BUCKET DE STORAGE PARA DOCUMENTOS
-- =====================================================
-- Este archivo configura el bucket de almacenamiento en Supabase Storage
-- para guardar los archivos de documentos subidos por los usuarios

-- NOTA: Este script debe ejecutarse en Supabase SQL Editor con permisos de servicio

-- 1. Crear el bucket 'documents' si no existe
-- (Esto normalmente se hace desde la interfaz de Supabase Storage, pero aquí está el SQL)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Público para que los usuarios puedan acceder a sus documentos
  52428800,  -- 50MB en bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Configurar políticas de seguridad para el bucket

-- Política: Los usuarios pueden subir archivos a sus propias carpetas
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Política: Los usuarios pueden ver sus propios archivos
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Política: Los usuarios pueden actualizar sus propios archivos
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Política: Los usuarios pueden eliminar sus propios archivos
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Política: Los admins pueden ver todos los archivos
CREATE POLICY "Admins can view all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política: Los admins pueden eliminar cualquier archivo
CREATE POLICY "Admins can delete any file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Habilitar RLS en storage.objects (si no está habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIONES AUXILIARES PARA STORAGE
-- =====================================================

-- Función para obtener el tamaño total usado por un usuario
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(size), 0)
  INTO total_size
  FROM storage.objects
  WHERE bucket_id = 'documents'
    AND (storage.foldername(name))[1] = user_id::text;

  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar el uso de storage del usuario
CREATE OR REPLACE FUNCTION update_user_storage(user_id UUID, size_change BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET used_storage = GREATEST(0, used_storage + size_change)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar archivos huérfanos (sin registro en documents)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS TABLE(deleted_files TEXT[]) AS $$
DECLARE
  orphaned_files TEXT[];
BEGIN
  SELECT ARRAY_AGG(name)
  INTO orphaned_files
  FROM storage.objects o
  WHERE o.bucket_id = 'documents'
    AND NOT EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = o.name
    )
    AND o.created_at < NOW() - INTERVAL '7 days';  -- Solo archivos más antiguos de 7 días

  IF orphaned_files IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'documents'
      AND name = ANY(orphaned_files);
  END IF;

  RETURN QUERY SELECT orphaned_files;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICACIÓN Y MANTENIMIENTO
-- =====================================================

-- Crear tabla para registrar el mantenimiento del storage
CREATE TABLE IF NOT EXISTS storage_maintenance_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation VARCHAR(50) NOT NULL,
  files_affected INTEGER,
  space_freed BIGINT,
  details JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

-- 1. Ejecuta este script completo en Supabase SQL Editor

-- 2. Verifica que el bucket se creó correctamente:
--    SELECT * FROM storage.buckets WHERE id = 'documents';

-- 3. Verifica las políticas:
--    SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- 4. Para probar la subida de archivos desde la aplicación:
--    - El backend debe usar SUPABASE_SERVICE_ROLE_KEY para operaciones de storage
--    - Los archivos se guardarán en: documents/general/{userId}/{uniqueFileName}

-- 5. Para limpiar archivos huérfanos periódicamente:
--    SELECT * FROM cleanup_orphaned_files();

-- Fin del script de configuración
