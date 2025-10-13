# 🚀 EMPEZAR AQUÍ - Sistema de Subida de Documentos

## ✅ Lo que YA está hecho:

1. ✅ **Backend completo** - Servicios de procesamiento, storage y endpoints
2. ✅ **Frontend completo** - Componente de subida con drag & drop
3. ✅ **Funciones SQL** - Creadas en tu base de datos Supabase
4. ✅ **Estructura de carpetas** - Sistema organizado por categoría y usuario

## 🎯 Lo que DEBES hacer (5 minutos):

### Paso 1: Verificar Backend (Sin Vulnerabilidades ✅)

Las dependencias ya están instaladas y **sin vulnerabilidades de seguridad**:

```bash
cd backend
npm audit
# ✅ found 0 vulnerabilities
```

**Corrección aplicada:** Se reemplazó `xlsx` (vulnerable) por `exceljs` (segura). Ver [SECURITY_FIX.md](SECURITY_FIX.md).

### Paso 2: Verificar Variables de Entorno

Asegúrate de tener en `backend/.env`:

```env
SUPABASE_URL=https://vyhyyddvktqfjrsogwtf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
OPENAI_API_KEY=tu_openai_api_key
```

### Paso 3: Crear Bucket en Supabase (MANUAL)

**¡IMPORTANTE!** Las políticas de Storage NO se pueden crear con SQL, debes hacerlo manualmente:

1. Ve a [Supabase Dashboard](https://app.supabase.com/project/vyhyyddvktqfjrsogwtf/storage/buckets)
2. Haz clic en **"New bucket"**
3. Configura:
   - **Name**: `documents`
   - **Public**: ✅ SÍ (marcado)
   - **File size limit**: 50 MB
4. Haz clic en **"Create bucket"**

### Paso 4: Configurar Políticas RLS (MANUAL)

Sigue **EXACTAMENTE** las instrucciones en: **[SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md)**

Necesitas crear **6 políticas** (copia y pega cada expresión exactamente como aparece):

1. Users can upload to their own folder (INSERT)
2. Users can view their own files (SELECT)
3. Users can update their own files (UPDATE)
4. Users can delete their own files (DELETE)
5. Admins can view all files (SELECT)
6. Admins can delete any file (DELETE)

**⏱️ Tiempo estimado: 3-4 minutos**

### Paso 5: Probar

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Luego:
1. Ve a http://localhost:5173
2. Login con tu usuario
3. Ve a "Documentos"
4. Clic en "Subir Documento"
5. ¡Arrastra un archivo y prueba!

## 📁 Estructura de Carpetas (Automática)

El sistema organizará tus archivos así:

```
documents/
├── general/
│   ├── {user-id-1}/
│   │   ├── abc123.pdf
│   │   └── def456.jpg
│   └── {user-id-2}/
│       └── ghi789.docx
├── contratos/
│   └── {user-id-1}/
│       └── xyz999.pdf
└── certificados/
    └── ...
```

**Ventajas:**
- ✅ Cada usuario solo ve sus archivos
- ✅ Organizado por categoría
- ✅ Fácil de administrar
- ✅ Seguro con RLS

## 🎨 Características Implementadas

### Procesamiento Automático
- 🔍 **OCR** - Extrae texto de imágenes y PDFs
- 🤖 **Clasificación AI** - Categoriza automáticamente con OpenAI
- 🖼️ **Optimización** - Comprime imágenes automáticamente
- 🔐 **Detección de duplicados** - Evita archivos repetidos

### Seguridad
- 🔒 Políticas RLS en Storage
- 📊 Control de quotas por usuario (5GB / 1000 docs)
- ✅ Validación de tipos y tamaños
- 📝 Auditoría completa

### UX
- 🖱️ Drag & drop
- 📊 Barra de progreso
- 🎯 Notificaciones en tiempo real
- ⚡ Carga rápida

## 📚 Documentación Completa

- **[SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md)** - Guía paso a paso para configurar el bucket (¡LÉELO!)
- **[DOCUMENT_UPLOAD_SETUP.md](DOCUMENT_UPLOAD_SETUP.md)** - Documentación técnica completa
- **[SECURITY_FIX.md](SECURITY_FIX.md)** - ✨ **NUEVO:** Corrección de vulnerabilidad xlsx → exceljs
- **[database/storage_bucket_setup.sql](database/storage_bucket_setup.sql)** - Script SQL de referencia

## 🐛 Problemas Comunes

### "Failed to upload file"
→ El bucket no existe. Ve al **Paso 3** arriba.

### "Permission denied"
→ Las políticas RLS no están configuradas. Ve al **Paso 4** arriba.

### "Quota exceeded"
→ Aumenta la quota del usuario en la tabla `users`:
```sql
UPDATE users SET quota_storage = 10737418240 WHERE id = 'user-id';
```

### El OCR o AI no funciona
→ Verifica `OPENAI_API_KEY` en el `.env`. El documento se subirá de todas formas sin procesamiento AI.

## ✅ Checklist de Verificación

Antes de probar, verifica que:

- [x] ~~Instalaste `sharp` y `pdf-parse` en el backend~~ ✅ Ya instaladas
- [x] ~~Sin vulnerabilidades de seguridad~~ ✅ `npm audit` limpio
- [ ] Tienes `SUPABASE_SERVICE_ROLE_KEY` en `.env`
- [ ] Tienes `OPENAI_API_KEY` en `.env` (opcional pero recomendado)
- [ ] Creaste el bucket `documents` en Supabase
- [ ] Configuraste las 6 políticas RLS del bucket
- [ ] El bucket es **público**

## 🎉 ¡Todo Listo!

Una vez completados los pasos 1-4, tu sistema estará **100% funcional**.

**¿Dudas?** Lee [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md) con atención. Tiene capturas y explicaciones detalladas de cada paso.

---

**Nota Importante:** Las funciones SQL (`update_user_storage`, `increment_user_documents`, `decrement_user_documents`) **ya fueron creadas** en tu base de datos usando el MCP de Supabase. ✅
