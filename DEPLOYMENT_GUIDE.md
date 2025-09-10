# 🚀 Guía Completa de Despliegue - Gestor Documental MINEDUC

## 📋 Índice
1. [Arquitectura Recomendada](#arquitectura-recomendada)
2. [Configuración de Base de Datos](#configuración-de-base-de-datos)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Despliegue en Render (Backend)](#despliegue-en-render-backend)
5. [Despliegue en Vercel (Frontend)](#despliegue-en-vercel-frontend)
6. [Verificación del Despliegue](#verificación-del-despliegue)
7. [Seguridad y Mejores Prácticas](#seguridad-y-mejores-prácticas)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura Recomendada

### Flujo de Datos Seguro
```
Frontend (Vercel) 
    ↓ [HTTPS + CORS]
Backend API (Render)
    ↓ [SERVICE_ROLE_KEY]
Supabase PostgreSQL + Storage
```

### Principios de Seguridad
- ✅ **Frontend**: Solo usa `ANON_KEY` para autenticación
- ✅ **Backend**: Usa `SERVICE_ROLE_KEY` para operaciones DB
- ✅ **RLS**: Políticas de seguridad a nivel de fila activadas
- ✅ **CORS**: Configurado específicamente para dominios autorizados
- ✅ **JWT**: Validación completa en middleware

---

## 🗄️ Configuración de Base de Datos

### Paso 1: Crear Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto
3. Guarda las credenciales: `URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`

### Paso 2: Ejecutar Esquema Principal
```sql
-- 1. En Supabase SQL Editor, ejecuta:
-- database/schema.sql
```

### Paso 3: Ejecutar Políticas de Seguridad
```sql
-- 2. Ejecuta el archivo de políticas RLS:
-- database/row_level_security.sql
```

### Paso 4: Datos de Prueba (Opcional)
```sql
-- 3. Para datos de prueba:
-- database/seed.sql
```

### Paso 5: Configurar Storage
1. Ve a Storage en Supabase
2. Crea bucket llamado `documents`
3. Configura como público para archivos no sensibles

---

## 🔐 Configuración de Variables de Entorno

### Backend (.env en Render)
```bash
# === OBLIGATORIAS ===
NODE_ENV=production
PORT=5000

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Autenticación
JWT_SECRET=tu-secreto-super-seguro-aqui

# Frontend URL (sin barra final)
FRONTEND_URL=https://gestor-documental-mineduc.vercel.app

# === OPCIONALES ===
# Email (para notificaciones)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password-de-gmail

# OpenAI (para clasificación automática)
OPENAI_API_KEY=sk-tu-clave-openai

# Configuración de archivos
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,gif
BCRYPT_ROUNDS=12

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env en Vercel)
```bash
# Supabase (misma URL y ANON_KEY del backend)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Backend URL (sin barra final)
VITE_API_BASE_URL=https://gestor-documental-mineduc-backend.onrender.com

# Metadata de la app
VITE_APP_NAME=MINEDUC - Sistema de Gestión Documental
VITE_APP_VERSION=1.0.0
```

---

## 🎯 Despliegue en Render (Backend)

### Paso 1: Preparar Repositorio
1. Tu archivo `render.yaml` ya está configurado
2. Asegúrate que esté en la raíz del backend

### Paso 2: Crear Servicio en Render
1. Ve a [render.com](https://render.com)
2. Conecta tu repositorio GitHub
3. Selecciona **Web Service**
4. Configura:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Auto-Deploy**: Yes

### Paso 3: Configurar Variables
En Render Dashboard > Environment:
```
NODE_ENV=production
SUPABASE_URL=tu-url-de-supabase
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
JWT_SECRET=tu-jwt-secret
FRONTEND_URL=https://gestor-documental-mineduc.vercel.app
# ... otras variables según necesites
```

### Paso 4: Verificar Despliegue
- URL: `https://tu-app-backend.onrender.com/health`
- Debe responder con status `healthy`

---

## ⚡ Despliegue en Vercel (Frontend)

### Paso 1: Preparar Proyecto
1. Tu `vercel.json` ya está configurado
2. Asegúrate que `package.json` tenga el script `build`

### Paso 2: Crear Proyecto en Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio
3. Configura:
   - **Framework**: Vite
   - **Root Directory**: `/` (o `/frontend` si tienes subcarpeta)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Paso 3: Configurar Variables
En Vercel Dashboard > Settings > Environment Variables:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_API_BASE_URL=https://tu-backend.onrender.com
```

### Paso 4: Verificar Despliegue
- URL: `https://tu-app.vercel.app`
- Debe cargar la aplicación correctamente

---

## ✅ Verificación del Despliegue

### Script Automático
```bash
# Ejecutar script de verificación
node scripts/verify-deployment.js
```

### Verificación Manual

#### 1. Backend Health Check
```bash
curl https://tu-backend.onrender.com/health
```
**Respuesta esperada:**
```json
{
  "overall": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "storage": { "status": "healthy" },
    "environment": { "status": "healthy" }
  }
}
```

#### 2. Frontend Accesible
- Navega a tu URL de Vercel
- Verifica que carga sin errores en consola

#### 3. API Documentation
- Ve a: `https://tu-backend.onrender.com/api-docs`
- Debe mostrar la documentación Swagger

#### 4. Test de Autenticación
1. Intenta hacer login en la app
2. Verifica en Network tab que las llamadas API funcionen
3. Comprueba que los tokens JWT se envían correctamente

---

## 🔒 Seguridad y Mejores Prácticas

### ✅ Variables de Entorno Seguras
- ❌ **NUNCA** expongas `SERVICE_ROLE_KEY` en el frontend
- ✅ Solo usa `ANON_KEY` en el frontend
- ✅ Usa variables de entorno específicas para cada plataforma

### ✅ RLS (Row Level Security)
- ✅ Todas las tablas tienen RLS habilitado
- ✅ Políticas específicas por rol (admin, editor, viewer)
- ✅ Los usuarios solo ven datos que les corresponden

### ✅ CORS Configurado
- ✅ Solo dominios específicos permitidos
- ✅ Credenciales habilitadas para autenticación
- ✅ Headers de seguridad configurados

### ✅ Rate Limiting
- ✅ Límites diferentes para auth vs operaciones generales
- ✅ Protección contra ataques de fuerza bruta
- ✅ Headers informativos para clientes

### ✅ Manejo de Archivos
- ✅ Validación de tipos de archivo
- ✅ Límites de tamaño configurables
- ✅ URLs firmadas para acceso seguro

---

## 🚨 Troubleshooting

### Error: "Ruta no encontrada"
**Problema**: El backend responde 404 en ruta raíz
**Solución**: Es normal. Usa `/health` o `/api-docs`

### Error: "CORS policy"
**Problema**: Frontend no puede conectar al backend
**Solución**: 
1. Verifica `FRONTEND_URL` en backend
2. Verifica `VITE_API_BASE_URL` en frontend
3. URLs sin barra final

### Error: "Variables de entorno faltantes"
**Problema**: El health check reporta variables faltantes
**Solución**:
1. Verifica configuración en Render/Vercel
2. Redeploy después de cambiar variables
3. Usa el script de verificación

### Error: "Token inválido"
**Problema**: Autenticación falla
**Solución**:
1. Verifica que `JWT_SECRET` esté configurado
2. Verifica que Supabase esté configurado correctamente
3. Comprueba que RLS policies estén aplicadas

### Error: "Base de datos no accesible"
**Problema**: No se puede conectar a Supabase
**Solución**:
1. Verifica URLs y keys de Supabase
2. Ejecuta esquema SQL completo
3. Verifica que las tablas existan

### Error de Build en Vercel
**Problema**: `npm run build` falla
**Solución**:
1. Verifica que no hay errores de sintaxis
2. Ejecuta `npm run build` localmente primero
3. Revisa logs de build en Vercel

### Performance Issues
**Problema**: La app va lenta
**Solución**:
1. Verifica que estés usando el plan correcto en Render
2. Optimiza queries con índices en Supabase
3. Implementa caché donde sea apropiado

---

## 📞 Soporte

### URLs de Monitoreo
- **Backend Health**: `https://tu-backend.onrender.com/health`
- **API Docs**: `https://tu-backend.onrender.com/api-docs` 
- **Frontend**: `https://tu-frontend.vercel.app`

### Logs
- **Render**: Dashboard > tu servicio > Logs
- **Vercel**: Dashboard > tu proyecto > Functions tab
- **Supabase**: Dashboard > Logs

### Comandos Útiles
```bash
# Verificar despliegue
node scripts/verify-deployment.js

# Test de conexión local
npm run dev

# Build local para testing
npm run build && npm run preview
```

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí y todo funciona, tienes una aplicación completamente desplegada con:

- ✅ **Arquitectura segura** y escalable
- ✅ **Base de datos** con políticas de seguridad
- ✅ **Frontend** en Vercel con React + Vite
- ✅ **Backend** en Render con Express + Supabase
- ✅ **Autenticación** JWT completa
- ✅ **File storage** configurado
- ✅ **Monitoreo** y health checks

Tu Sistema de Gestión Documental está listo para MINEDUC! 🇬🇹