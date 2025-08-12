# Guía de Despliegue - Sistema de Gestión Documental MINEDUC

Esta guía te llevará paso a paso para desplegar el sistema completo en producción usando servicios gratuitos.

## 📋 Prerrequisitos

- [ ] Cuenta en GitHub (para código)
- [ ] Cuenta en Supabase (base de datos)
- [ ] Cuenta en Render (backend)
- [ ] Cuenta en Vercel (frontend)
- [ ] Cuenta en OpenAI (opcional, para IA)
- [ ] Cuenta de Gmail (para notificaciones)

## 🗄️ Paso 1: Configurar Base de Datos en Supabase

### 1.1 Crear Proyecto

1. Ve a [Supabase](https://supabase.com) y crea una cuenta
2. Clic en "New Project"
3. Nombre: `gestor-documental-mineduc`
4. Región: `East US (North Virginia)` (recomendado)
5. Contraseña de base de datos: **Guarda esta contraseña**

### 1.2 Configurar Esquema

1. Ve a "SQL Editor" en el panel izquierdo
2. Copia y pega el contenido de `database/schema.sql`
3. Clic en "Run" para ejecutar
4. Verifica que se crearon todas las tablas en "Table Editor"

### 1.3 Configurar Storage

1. Ve a "Storage" en el panel izquierdo
2. Clic en "Create bucket"
3. Nombre: `documents`
4. Público: `false`
5. Clic en "Create bucket"

### 1.4 Configurar Autenticación

1. Ve a "Authentication" > "Settings"
2. En "Site URL" agrega: `https://tu-dominio-vercel.vercel.app`
3. En "Redirect URLs" agrega: `https://tu-dominio-vercel.vercel.app/auth/callback`

### 1.5 Obtener Credenciales

1. Ve a "Settings" > "API"
2. Anota estos valores:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🔧 Paso 2: Desplegar Backend en Render

### 2.1 Preparar Repositorio

1. Sube tu código a GitHub
2. Asegúrate de que `backend/` esté en la raíz del repositorio

### 2.2 Crear Servicio en Render

1. Ve a [Render](https://render.com) y crea una cuenta
2. Clic en "New" > "Web Service"
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Name**: `gestor-documental-mineduc-backend`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.3 Configurar Variables de Entorno

En la sección "Environment Variables", agrega:

```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=tu_secreto_jwt_muy_seguro_de_al_menos_32_caracteres
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_gmail
EMAIL_FROM=noreply@mineduc.gob.gt
OPENAI_API_KEY=sk-xxx (opcional)
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,gif
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.4 Configurar Gmail para Notificaciones

1. Ve a tu cuenta de Gmail
2. Activa la verificación en 2 pasos
3. Ve a "Contraseñas de aplicaciones"
4. Genera una contraseña para "Correo"
5. Usa esta contraseña en `EMAIL_PASS`

### 2.5 Desplegar

1. Clic en "Create Web Service"
2. Espera a que termine el despliegue (5-10 minutos)
3. Anota la URL: `https://tu-backend.onrender.com`

## 🌐 Paso 3: Desplegar Frontend en Vercel

### 3.1 Preparar Proyecto

1. Asegúrate de que `frontend/gestor-documental-frontend/` esté en tu repositorio
2. Verifica que `vercel.json` esté configurado

### 3.2 Crear Proyecto en Vercel

1. Ve a [Vercel](https://vercel.com) y crea una cuenta
2. Clic en "New Project"
3. Importa tu repositorio de GitHub
4. Configuración:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend/gestor-documental-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Configurar Variables de Entorno

En "Environment Variables", agrega:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=https://tu-backend.onrender.com
VITE_APP_NAME=MINEDUC - Sistema de Gestión Documental
VITE_APP_VERSION=1.0.0
```

### 3.4 Desplegar

1. Clic en "Deploy"
2. Espera a que termine el despliegue (3-5 minutos)
3. Anota la URL: `https://tu-frontend.vercel.app`

## 👤 Paso 4: Crear Usuarios Iniciales

### 4.1 Crear Usuarios en Supabase Auth

1. Ve a Supabase > "Authentication" > "Users"
2. Clic en "Add user"
3. Crea estos usuarios:

**Administrador:**
- Email: `admin@mineduc.gob.gt`
- Password: `Admin123!`
- Email Confirm: `true`

**Editor:**
- Email: `editor@mineduc.gob.gt`
- Password: `Editor123!`
- Email Confirm: `true`

**Viewer:**
- Email: `viewer@mineduc.gob.gt`
- Password: `Viewer123!`
- Email Confirm: `true`

### 4.2 Actualizar Datos de Prueba

1. Anota los UUIDs de los usuarios creados
2. Edita `database/seed.sql` con los UUIDs correctos
3. Ejecuta el script en Supabase SQL Editor

## 🔧 Paso 5: Configuraciones Finales

### 5.1 Actualizar URLs en Supabase

1. Ve a Supabase > "Authentication" > "Settings"
2. Actualiza "Site URL": `https://tu-frontend.vercel.app`
3. Actualiza "Redirect URLs": `https://tu-frontend.vercel.app/auth/callback`

### 5.2 Configurar CORS en Backend

El backend ya está configurado para aceptar requests desde cualquier origen, pero verifica que funcione correctamente.

### 5.3 Configurar Dominio Personalizado (Opcional)

**En Vercel:**
1. Ve a tu proyecto > "Settings" > "Domains"
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones

**En Render:**
1. Ve a tu servicio > "Settings" > "Custom Domains"
2. Agrega tu subdominio para la API
3. Configura los DNS según las instrucciones

## ✅ Paso 6: Verificar Despliegue

### 6.1 Probar Backend

Visita: `https://tu-backend.onrender.com/health`

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2024-12-08T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 6.2 Probar Frontend

1. Visita: `https://tu-frontend.vercel.app`
2. Deberías ver la página de login
3. Intenta iniciar sesión con `admin@mineduc.gob.gt`

### 6.3 Probar Funcionalidades

- [ ] Login/logout
- [ ] Subir documento
- [ ] Crear workflow
- [ ] Recibir notificaciones
- [ ] Generar reportes

## 🚨 Solución de Problemas

### Backend no inicia

1. Verifica las variables de entorno en Render
2. Revisa los logs en Render > "Logs"
3. Asegúrate de que Supabase esté accesible

### Frontend no carga

1. Verifica las variables de entorno en Vercel
2. Revisa los logs en Vercel > "Functions"
3. Verifica que la URL del backend sea correcta

### Error de CORS

1. Verifica que `VITE_API_BASE_URL` sea correcta
2. Asegúrate de que el backend esté configurado para CORS
3. Revisa que no haya problemas de SSL

### Base de datos no conecta

1. Verifica las credenciales de Supabase
2. Asegúrate de que el proyecto esté activo
3. Revisa las políticas RLS

## 📊 Monitoreo

### Render

- Ve a tu servicio > "Metrics" para ver uso de CPU/memoria
- Configura alertas en "Settings" > "Alerts"

### Vercel

- Ve a tu proyecto > "Analytics" para ver tráfico
- Configura alertas en "Settings" > "Notifications"

### Supabase

- Ve a "Reports" para ver uso de base de datos
- Configura alertas en "Settings" > "Billing"

## 🔄 Actualizaciones

### Backend

1. Haz push a tu repositorio
2. Render desplegará automáticamente
3. Verifica en "Deployments"

### Frontend

1. Haz push a tu repositorio
2. Vercel desplegará automáticamente
3. Verifica en "Deployments"

## 💰 Costos

**Tier Gratuito:**
- Supabase: 500MB DB, 1GB Storage, 2GB Transfer
- Render: 750 horas/mes, 512MB RAM
- Vercel: 100GB Bandwidth, 6000 Build Minutes

**Límites a considerar:**
- Render duerme después de 15 min de inactividad
- Supabase tiene límites de requests/hora
- Vercel tiene límites de funciones serverless

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs de cada servicio
2. Verifica las variables de entorno
3. Consulta la documentación oficial
4. Contacta al equipo de desarrollo

---

**¡Felicidades! Tu sistema está desplegado y listo para usar.**

