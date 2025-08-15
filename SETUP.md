# 🚀 Guía de Configuración

Esta guía te ayudará a configurar el Sistema de Gestión Documental MINEDUC en tu entorno de desarrollo.

## 📋 Prerrequisitos

- **Node.js** >= 18.0.0
- **npm** o **pnpm** 
- **Git**
- Cuenta de **Supabase** (gratuita)
- Cuenta de **OpenAI** (opcional, para IA)

## 🛠️ Configuración Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/gestor-documental-mineduc.git
cd gestor-documental-mineduc
```

### 2. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. En la sección **Settings > API**, copia:
   - Project URL
   - Anon public key
   - Service role key (solo para backend)

3. En **SQL Editor**, ejecuta los scripts:
   ```sql
   -- 1. Ejecutar database/schema.sql
   -- 2. Ejecutar database/seed.sql (opcional, datos de prueba)
   ```

### 3. Configurar Variables de Entorno

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` con tus valores reales:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role
JWT_SECRET=genera_un_secreto_seguro_aqui
```

#### Frontend (.env)
```bash
cd ..
cp .env.example .env
```

Edita `.env` con tus valores:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
VITE_API_BASE_URL=http://localhost:4000
```

### 4. Instalar Dependencias

```bash
# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd backend
npm install
```

### 5. Ejecutar el Proyecto

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend  
```bash
npm run dev
```

### 6. Acceder a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs

## 🔐 Usuarios de Prueba

Si ejecutaste el archivo `seed.sql`, tendrás estos usuarios disponibles:

- **Admin**: admin@mineduc.gob.gt
- **Editor**: editor@mineduc.gob.gt
- **Viewer**: viewer@mineduc.gob.gt

**Nota**: Debes crear estos usuarios en Supabase Auth y configurar las contraseñas.

## 🚨 Seguridad

### Variables de Entorno Críticas

**NUNCA subas estos archivos a git:**
- `.env`
- `backend/.env`
- Cualquier archivo con credenciales reales

### Generar JWT Secret Seguro

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📱 Configuración Opcional

### OpenAI (Clasificación IA)
```env
OPENAI_API_KEY=sk-tu_clave_openai
```

### Email (Notificaciones)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=contraseña_de_aplicacion
```

## 🔧 Troubleshooting

### Error: "Invalid API Key"
- Verifica que las claves de Supabase sean correctas
- Asegúrate de usar la URL correcta del proyecto

### Error: "Cannot connect to database"  
- Revisa que el proyecto de Supabase esté activo
- Verifica la configuración RLS en Supabase

### Error de CORS
- Verifica que `VITE_API_BASE_URL` apunte al backend correcto
- Revisa la configuración CORS en `backend/server.js`

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [API Documentation](http://localhost:4000/api-docs) (cuando el backend esté corriendo)
- [Guía de Deployment](./DEPLOYMENT.md)

## 🆘 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs en consola
2. Verifica las variables de entorno
3. Consulta la documentación de la API
4. Abre un issue en GitHub con detalles del error