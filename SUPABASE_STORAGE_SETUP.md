# 📦 Configuración del Bucket de Storage en Supabase

Este documento te guía paso a paso para configurar el bucket de almacenamiento de documentos en Supabase.

## ✅ Funciones SQL ya creadas

Las siguientes funciones **ya han sido creadas** en tu base de datos:

- ✅ `update_user_storage(user_id, size_change)` - Actualiza el uso de storage del usuario
- ✅ `increment_user_documents(user_id)` - Incrementa contador de documentos
- ✅ `decrement_user_documents(user_id)` - Decrementa contador de documentos

## 🗂️ Paso 1: Crear el Bucket

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **Storage**
3. Haz clic en **New bucket**
4. Configura el bucket con estos valores:

   ```
   Name: documents
   Public bucket: ✅ SÍ (marcado)
   File size limit: 50 MB
   Allowed MIME types: Dejar vacío (permitir todos)
   ```

5. Haz clic en **Create bucket**

## 🔐 Paso 2: Configurar Políticas RLS

Una vez creado el bucket, necesitas configurar las políticas de seguridad:

### 2.1 Política: Subir archivos

1. En Storage, selecciona el bucket `documents`
2. Ve a la pestaña **Policies**
3. Haz clic en **New Policy**
4. Selecciona **For full customization**
5. Configura:

   ```
   Policy name: Users can upload to their own folder
   Allowed operation: INSERT
   Target roles: authenticated

   USING expression (deja vacío)

   WITH CHECK expression:
   (bucket_id = 'documents'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```

6. Haz clic en **Review** y luego **Save policy**

### 2.2 Política: Ver archivos propios

1. Haz clic en **New Policy** nuevamente
2. Configura:

   ```
   Policy name: Users can view their own files
   Allowed operation: SELECT
   Target roles: authenticated

   USING expression:
   (bucket_id = 'documents'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)

   WITH CHECK expression (deja vacío)
   ```

3. Haz clic en **Review** y luego **Save policy**

### 2.3 Política: Actualizar archivos propios

1. Haz clic en **New Policy** nuevamente
2. Configura:

   ```
   Policy name: Users can update their own files
   Allowed operation: UPDATE
   Target roles: authenticated

   USING expression:
   (bucket_id = 'documents'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)

   WITH CHECK expression:
   (bucket_id = 'documents'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```

3. Haz clic en **Review** y luego **Save policy**

### 2.4 Política: Eliminar archivos propios

1. Haz clic en **New Policy** nuevamente
2. Configura:

   ```
   Policy name: Users can delete their own files
   Allowed operation: DELETE
   Target roles: authenticated

   USING expression:
   (bucket_id = 'documents'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)

   WITH CHECK expression (deja vacío)
   ```

3. Haz clic en **Review** y luego **Save policy**

### 2.5 Política: Admins pueden ver todo

1. Haz clic en **New Policy** nuevamente
2. Configura:

   ```
   Policy name: Admins can view all files
   Allowed operation: SELECT
   Target roles: authenticated

   USING expression:
   (bucket_id = 'documents'::text) AND
   EXISTS (
     SELECT 1 FROM public.users
     WHERE (id = auth.uid()) AND (role = 'admin'::text)
   )

   WITH CHECK expression (deja vacío)
   ```

3. Haz clic en **Review** y luego **Save policy**

### 2.6 Política: Admins pueden eliminar todo

1. Haz clic en **New Policy** por última vez
2. Configura:

   ```
   Policy name: Admins can delete any file
   Allowed operation: DELETE
   Target roles: authenticated

   USING expression:
   (bucket_id = 'documents'::text) AND
   EXISTS (
     SELECT 1 FROM public.users
     WHERE (id = auth.uid()) AND (role = 'admin'::text)
   )

   WITH CHECK expression (deja vacío)
   ```

3. Haz clic en **Review** y luego **Save policy**

## 📁 Paso 3: Estructura de Carpetas

El sistema organizará automáticamente los archivos de esta manera:

```
documents/
├── general/
│   ├── {user-id-1}/
│   │   ├── uuid-1.pdf
│   │   ├── uuid-2.jpg
│   │   └── uuid-3.docx
│   ├── {user-id-2}/
│   │   ├── uuid-4.pdf
│   │   └── uuid-5.png
│   └── ...
├── contratos/
│   ├── {user-id-1}/
│   │   └── uuid-6.pdf
│   └── ...
├── certificados/
│   └── ...
└── ...
```

Cada usuario tiene su propia carpeta dentro de cada categoría, garantizando:
- ✅ Organización por tipo de documento
- ✅ Separación por usuario
- ✅ Seguridad (solo acceden a sus archivos)
- ✅ Fácil búsqueda y administración

## ✅ Paso 4: Verificación

Verifica que todo está configurado correctamente:

### 4.1 Verificar el Bucket

Ejecuta en SQL Editor:

```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

Deberías ver:
```
id: documents
name: documents
public: true
file_size_limit: 52428800
created_at: [fecha]
updated_at: [fecha]
```

### 4.2 Verificar Políticas

En la pestaña **Policies** del bucket, deberías ver **6 políticas**:
- ✅ Users can upload to their own folder (INSERT)
- ✅ Users can view their own files (SELECT)
- ✅ Users can update their own files (UPDATE)
- ✅ Users can delete their own files (DELETE)
- ✅ Admins can view all files (SELECT)
- ✅ Admins can delete any file (DELETE)

### 4.3 Verificar Funciones

Ejecuta en SQL Editor:

```sql
SELECT proname, proargnames
FROM pg_proc
WHERE proname IN ('update_user_storage', 'increment_user_documents', 'decrement_user_documents');
```

Deberías ver las 3 funciones listadas.

## 🧪 Paso 5: Prueba

1. **Inicia el backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Inicia el frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Prueba la subida:**
   - Ve a Documentos en la aplicación
   - Haz clic en "Subir Documento"
   - Arrastra un archivo o selecciona uno
   - Completa el formulario
   - Haz clic en "Subir Documento"

4. **Verifica en Supabase:**
   - Ve a Storage → documents
   - Deberías ver: `general/{tu-user-id}/{archivo-con-uuid}.extension`
   - Ve a Table Editor → documents
   - Deberías ver el registro del documento con toda la información

## 🐛 Troubleshooting

### Error: "Failed to upload file"

**Causa:** El bucket no existe o las políticas no están configuradas.

**Solución:**
1. Verifica que el bucket `documents` existe en Storage
2. Verifica que tiene las 6 políticas configuradas
3. Verifica que el bucket es público

### Error: "Permission denied"

**Causa:** Las políticas RLS no permiten la operación.

**Solución:**
1. Revisa las expresiones de las políticas (copia exactamente las del Paso 2)
2. Asegúrate de que el usuario está autenticado (token JWT válido)
3. Verifica que `auth.uid()` retorna el ID del usuario actual

### Error: "Quota exceeded"

**Causa:** El usuario ha alcanzado su límite de almacenamiento.

**Solución:**
1. Aumenta la quota del usuario:
   ```sql
   UPDATE users
   SET quota_storage = 10737418240  -- 10GB
   WHERE id = 'user-id';
   ```

2. O resetea el uso actual:
   ```sql
   UPDATE users
   SET used_storage = 0,
       used_documents = 0
   WHERE id = 'user-id';
   ```

### Los archivos no se organizan por carpetas

**Causa:** El parámetro `folder` no se está enviando correctamente.

**Solución:**
1. Verifica que el frontend envía el parámetro `folder` en el FormData
2. Por defecto usa 'general', pero puedes cambiarlo a 'contratos', 'certificados', etc.

## 📊 Monitoreo

### Ver uso de storage por usuario

```sql
SELECT
  u.email,
  u.used_storage / 1024 / 1024 AS used_mb,
  u.quota_storage / 1024 / 1024 AS quota_mb,
  u.used_documents,
  u.quota_documents
FROM users u
ORDER BY u.used_storage DESC;
```

### Ver archivos por usuario

```sql
SELECT
  u.email,
  COUNT(d.id) AS total_documents,
  SUM(d.file_size) / 1024 / 1024 AS total_size_mb
FROM users u
LEFT JOIN documents d ON d.created_by = u.id
GROUP BY u.id, u.email
ORDER BY total_size_mb DESC;
```

### Limpiar archivos huérfanos (sin registro en DB)

Esto lo puedes hacer manualmente desde Storage o crear un job automático.

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema de subida de documentos estará **100% funcional** con:

- ✅ Almacenamiento seguro en Supabase Storage
- ✅ Organización por carpetas y usuarios
- ✅ Políticas RLS para seguridad
- ✅ Procesamiento OCR y clasificación AI
- ✅ Control de quotas por usuario
- ✅ Detección de duplicados
- ✅ Auditoría completa

**¿Necesitas ayuda?** Revisa [DOCUMENT_UPLOAD_SETUP.md](DOCUMENT_UPLOAD_SETUP.md) para más detalles técnicos.
