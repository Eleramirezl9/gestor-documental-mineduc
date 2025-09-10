# 📁 Configuración de Storage en Supabase

## 🎯 Objetivo
Configurar el storage de Supabase de manera segura para manejar archivos del sistema documental.

## 📋 Pasos para Configurar

### 1. Crear Bucket
1. Ve a tu **Dashboard de Supabase**
2. Navega a **Storage** en el menú lateral
3. Haz clic en **"Create bucket"**
4. Configuración del bucket:
   ```
   Name: documents
   Public bucket: ✅ Marcado (recomendado para facilidad)
   File size limit: 50MB
   Allowed MIME types: Dejar en blanco (permite todos)
   ```

### 2. Configurar Políticas de Seguridad

Si marcaste el bucket como **público**:
- ✅ Todos pueden ver archivos
- ✅ Seguridad manejada desde el backend
- ✅ URLs directas funcionan

Si prefieres bucket **privado**, configura estas políticas:

#### Política de Subida (INSERT)
```sql
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Política de Visualización (SELECT)
```sql
CREATE POLICY "Users can view own files and public files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Permite ver archivos de documentos públicos
    EXISTS (
      SELECT 1 FROM documents d 
      WHERE d.file_path LIKE '%' || name || '%' 
      AND d.is_public = true
    )
  )
);
```

#### Política de Actualización (UPDATE)
```sql
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Política de Eliminación (DELETE)
```sql
CREATE POLICY "Only admins can delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
);
```

### 3. Estructura de Carpetas Recomendada

```
documents/
├── {user_id}/              # Archivos privados por usuario
│   ├── documents/          # Documentos generales
│   ├── profiles/           # Fotos de perfil
│   └── temp/              # Archivos temporales
├── public/                # Archivos públicos
│   ├── logos/             # Logos institucionales
│   ├── templates/         # Plantillas de documentos
│   └── announcements/     # Anuncios públicos
└── system/                # Archivos del sistema (solo admins)
    ├── backups/           # Respaldos
    └── exports/           # Exportaciones
```

### 4. Configuración en el Backend

En tu archivo de configuración de Supabase (`backend/config/supabase.js`):

```javascript
// Función helper para subir archivos
const uploadFile = async (file, path, isPublic = false) => {
  const { data, error } = await supabaseAdmin.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
  
  if (error) throw error;
  
  // Generar URL firmada si es privado
  if (!isPublic) {
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(path, 3600); // 1 hora
    
    return signedUrlData.signedUrl;
  }
  
  // URL pública si el bucket es público
  const { data: urlData } = supabaseAdmin.storage
    .from('documents')
    .getPublicUrl(path);
  
  return urlData.publicUrl;
};
```

## ✅ Verificación

### Prueba de Subida
```javascript
// En tu backend, test simple:
const testUpload = async () => {
  const testFile = new Blob(['test content'], { type: 'text/plain' });
  const path = 'test/sample.txt';
  
  try {
    const url = await uploadFile(testFile, path);
    console.log('✅ Upload test successful:', url);
  } catch (error) {
    console.error('❌ Upload test failed:', error);
  }
};
```

### Verificar desde el Dashboard
1. Ve a **Storage > documents** en Supabase
2. Intenta subir un archivo manualmente
3. Verifica que se pueden descargar las URLs generadas

## 🔒 Recomendaciones de Seguridad

### ✅ DO (Hacer)
- Usa **URLs firmadas** para archivos sensibles
- Valida **tipos de archivo** en el backend antes de subir
- Implementa **límites de tamaño** por tipo de usuario
- **Escanea archivos** por malware si es posible
- **Registra** todas las operaciones de archivo en audit_logs

### ❌ DON'T (No hacer)
- No confíes solo en validación del frontend
- No uses URLs públicas para documentos confidenciales
- No permitas subidas sin autenticación
- No olvides limpiar archivos temporales

## 🚨 Troubleshooting

### Error: "bucket not found"
**Solución**: Verifica que el bucket 'documents' esté creado

### Error: "policy violation"
**Solución**: 
1. Verifica que RLS esté habilitado: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`
2. Aplica las políticas correctas desde la interfaz web

### Error: "file too large"
**Solución**: Ajusta el límite en configuración del bucket

### URLs no funcionan
**Solución**: 
- Bucket público: Usar `getPublicUrl()`
- Bucket privado: Usar `createSignedUrl()`

## 📞 Testing URLs

### URL Pública (bucket público)
```
https://[proyecto].supabase.co/storage/v1/object/public/documents/path/file.ext
```

### URL Firmada (bucket privado)
```
https://[proyecto].supabase.co/storage/v1/object/sign/documents/path/file.ext?token=...
```

---

Con esta configuración tendrás un sistema de archivos seguro y funcional para tu aplicación MINEDUC! 🇬🇹