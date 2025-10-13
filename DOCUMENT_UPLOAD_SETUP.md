# Configuración de Subida de Documentos

Este documento describe la configuración e implementación del sistema de subida de documentos con procesamiento OCR y clasificación AI.

## 🎯 Características Implementadas

### Backend

1. **Servicio de Procesamiento (`backend/services/documentProcessingService.js`)**
   - ✅ Extracción de texto con OCR (Tesseract.js) para imágenes
   - ✅ Extracción de texto de PDFs (pdf-parse)
   - ✅ Clasificación automática con OpenAI GPT-4o-mini
   - ✅ Optimización de imágenes (Sharp)
   - ✅ Generación de hash para detección de duplicados
   - ✅ Validación de tipos de archivo
   - ✅ Soporte para múltiples formatos:
     - Imágenes: JPG, PNG, GIF, WEBP, BMP, TIFF
     - Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
     - Otros: TXT, CSV, ZIP, RAR, 7Z

2. **Servicio de Almacenamiento (`backend/services/storageService.js`)**
   - ✅ Subida a Supabase Storage
   - ✅ Gestión de rutas: `folder/userId/uniqueFileName`
   - ✅ Verificación de quotas de usuario
   - ✅ Actualización automática de uso de storage
   - ✅ URLs firmadas para descarga segura
   - ✅ Operaciones de eliminación y movimiento

3. **Endpoints (`backend/routes/documents.js`)**
   - ✅ `POST /api/documents/upload` - Subida de documentos
   - ✅ `GET /api/documents` - Listado con paginación y filtros
   - ✅ `GET /api/documents/:id` - Detalles de documento
   - ✅ `GET /api/documents/:id/download` - URL de descarga
   - ✅ `DELETE /api/documents/:id` - Eliminación
   - ✅ `PUT /api/documents/:id` - Actualización

### Frontend

1. **Componente de Subida (`frontend/src/components/documents/UploadDocumentDialog.jsx`)**
   - ✅ Interfaz drag & drop
   - ✅ Validación de tamaño (50MB máx)
   - ✅ Validación de tipos de archivo
   - ✅ Vista previa de archivo seleccionado
   - ✅ Barra de progreso de subida
   - ✅ Formulario con campos:
     - Título (requerido)
     - Descripción
     - Etiquetas
     - Prioridad (baja, normal, alta, urgente)
     - Visibilidad pública
   - ✅ Manejo de errores
   - ✅ Notificaciones (Sonner)

2. **Integración en Página de Documentos**
   - ✅ Botón "Subir Documento"
   - ✅ Recarga automática después de subida exitosa
   - ✅ Listado de documentos con filtros

## 📋 Configuración Requerida

### 1. Variables de Entorno

**Backend (`.env`)**
```env
# Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# OpenAI para clasificación
OPENAI_API_KEY=tu_openai_api_key

# JWT
JWT_SECRET=tu_jwt_secret
```

**Frontend (`.env`)**
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_API_BASE_URL=http://localhost:5000
```

### 2. Dependencias Backend

Instalar las nuevas dependencias:

```bash
cd backend
npm install sharp pdf-parse
```

**Dependencias ya instaladas:**
- `tesseract.js` - OCR
- `openai` - Clasificación AI
- `multer` - Manejo de archivos
- `@supabase/supabase-js` - Cliente de Supabase

### 3. Configuración de Supabase Storage

**Opción A: Desde la Interfaz de Supabase**

1. Ve a Storage en tu proyecto de Supabase
2. Crea un nuevo bucket llamado `documents`
3. Configura como público
4. Límite de tamaño: 50MB
5. Tipos MIME permitidos: (ver lista en `storage_bucket_setup.sql`)

**Opción B: Ejecutar Script SQL**

Ejecuta el archivo `database/storage_bucket_setup.sql` en Supabase SQL Editor:

```sql
-- Incluye:
-- 1. Creación del bucket
-- 2. Políticas RLS para seguridad
-- 3. Funciones auxiliares
-- 4. Limpieza de archivos huérfanos
```

### 4. Actualizar Tabla de Usuarios

Asegúrate de que la tabla `users` tiene las columnas para quotas:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_storage BIGINT DEFAULT 5368709120; -- 5GB
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_storage BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_documents INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_documents INTEGER DEFAULT 1000;
```

## 🚀 Flujo de Subida

### 1. Usuario Selecciona Archivo

```javascript
// Frontend: UploadDocumentDialog.jsx
const handleFileSelect = (file) => {
  // Validar tamaño (50MB)
  // Validar tipo de archivo
  // Mostrar vista previa
  setSelectedFile(file);
};
```

### 2. Usuario Completa Formulario y Envía

```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('title', 'Mi Documento');
formData.append('description', 'Descripción...');
// ... otros campos

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### 3. Backend Procesa el Archivo

```javascript
// 1. Verificar quota del usuario
const quotaCheck = await checkUserQuota(userId, fileSize);

// 2. Procesar documento (OCR, AI, optimización)
const {
  fileHash,
  extractedText,
  aiClassification,
  processedBuffer,
  compressionRatio
} = await processDocument(file);

// 3. Verificar duplicados
const existingDoc = await checkDuplicate(fileHash);

// 4. Subir a Supabase Storage
const { path, publicUrl } = await uploadFile(
  processedBuffer,
  fileName,
  mimeType,
  userId,
  'general'
);

// 5. Guardar en base de datos
const document = await createDocument({
  title,
  file_path: path,
  extracted_text: extractedText,
  ai_classification: aiClassification,
  // ... más campos
});

// 6. Actualizar uso de storage
await updateUserStorageUsage(userId, processedSize);
```

### 4. Clasificación AI Automática

El sistema utiliza OpenAI para clasificar automáticamente:

```javascript
{
  "category": "Contratos y Acuerdos",
  "priority": "high",
  "keywords": ["contrato", "acuerdo", "legal"],
  "language": "es",
  "hasExpiration": true,
  "classificationLevel": "internal",
  "confidence": 0.95,
  "summary": "Contrato de servicio para..."
}
```

### 5. Respuesta al Cliente

```json
{
  "message": "Documento subido exitosamente",
  "document": {
    "id": "uuid",
    "title": "Mi Documento",
    "file_path": "general/userId/uuid.pdf",
    "file_size": 1234567,
    "extracted_text": "Texto extraído...",
    "ai_classification": { ... },
    "status": "pending"
  },
  "processing": {
    "compressionRatio": "15.23",
    "extractedTextLength": 5432,
    "aiClassification": { ... }
  }
}
```

## 🔐 Seguridad

### Políticas RLS en Storage

```sql
-- Los usuarios solo pueden subir a su carpeta
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Los usuarios solo pueden ver sus archivos
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);
```

### Validaciones Backend

1. Autenticación JWT requerida
2. Verificación de quota de usuario
3. Validación de tipo MIME
4. Límite de tamaño (50MB)
5. Detección de duplicados por hash
6. Sanitización de nombres de archivo

## 📊 Quotas de Usuario

```javascript
// Valores por defecto
const DEFAULT_QUOTAS = {
  storage: 5 * 1024 * 1024 * 1024, // 5GB
  documents: 1000
};

// Verificar antes de subir
const quotaCheck = await checkUserQuota(userId, fileSize);
if (!quotaCheck.hasSpace) {
  return res.status(413).json({
    error: 'Cuota de almacenamiento excedida',
    quota: {
      used: quotaCheck.used,
      limit: quotaCheck.limit,
      available: quotaCheck.available
    }
  });
}
```

## 🧪 Pruebas

### Probar desde Frontend

1. Iniciar backend: `cd backend && npm run dev`
2. Iniciar frontend: `cd frontend && npm run dev`
3. Navegar a Documentos
4. Clic en "Subir Documento"
5. Arrastrar un archivo o seleccionar
6. Completar formulario
7. Enviar

### Probar con cURL

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "title=Test Document" \
  -F "description=This is a test" \
  -F "priority=normal" \
  -F "isPublic=false"
```

### Verificar en Supabase

1. **Storage**: Verifica que el archivo aparece en el bucket `documents`
2. **Database**: Verifica el registro en la tabla `documents`
3. **Logs**: Revisa `operation_logs` para ver la operación

## 🐛 Troubleshooting

### Error: "Tipo de archivo no permitido"
**Solución**: Verifica que el archivo esté en la lista de tipos permitidos en `documentProcessingService.js`

### Error: "Cuota de almacenamiento excedida"
**Solución**: Aumenta la quota del usuario en la tabla `users` columna `quota_storage`

### Error: "Failed to upload file"
**Solución**:
1. Verifica que el bucket `documents` existe en Supabase Storage
2. Verifica las políticas RLS del bucket
3. Verifica `SUPABASE_SERVICE_ROLE_KEY` en `.env`

### Error de OCR/AI
**Solución**: Estos errores no bloquean la subida. El documento se sube sin procesamiento OCR/AI. Verifica:
1. `OPENAI_API_KEY` configurada correctamente
2. Créditos disponibles en OpenAI

### Archivo no aparece en frontend
**Solución**:
1. Verifica que el endpoint `/api/documents` funciona
2. Recarga la página
3. Verifica las políticas RLS en la tabla `documents`

## 📝 Próximos Pasos

- [ ] Añadir soporte para más formatos (videos, audio)
- [ ] Implementar previsualizador de documentos
- [ ] Añadir edición de metadatos
- [ ] Implementar versionado de documentos
- [ ] Añadir compartir documentos con otros usuarios
- [ ] Implementar firma digital de documentos
- [ ] Añadir compresión de PDFs grandes
- [ ] Implementar búsqueda full-text en contenido OCR

## 📞 Soporte

Si encuentras problemas, revisa:
1. Logs del backend en consola
2. Network tab en DevTools del navegador
3. Logs en Supabase Dashboard
4. Variables de entorno configuradas correctamente
