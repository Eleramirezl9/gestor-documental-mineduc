# Guía de Autenticación JWT - Sistema MINEDUC

## 🔐 Configuración de Autenticación

### Backend - Configuración CORS y JWT

El backend ya está configurado con:
- ✅ CORS configurado para desarrollo y producción
- ✅ Middleware JWT con Supabase Auth
- ✅ Swagger UI con autenticación
- ✅ Rate limiting por rutas
- ✅ Logs de seguridad

### Endpoints Principales

#### 1. Autenticación
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@mineduc.gob.gt",
  "password": "password"
}
```

**Respuesta:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@mineduc.gob.gt",
    "role": "admin"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

#### 2. Usar Token en Requests
```javascript
// Headers requeridos
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### 3. Ejemplos de Rutas Protegidas
```
GET /api/documents         # Requiere: cualquier usuario autenticado
POST /api/documents        # Requiere: editor o admin
DELETE /api/documents/:id  # Requiere: admin
GET /api/users             # Requiere: admin
```

## 🌐 Configuración Frontend

### Usando axios con interceptors (ya configurado)

```javascript
import { api, documentsAPI } from '@/lib/api'

// Obtener documentos (token se agrega automáticamente)
const documents = await documentsAPI.getAll({ page: 1, limit: 10 })

// Crear documento
const newDoc = await documentsAPI.create({
  title: "Nuevo Documento",
  description: "Descripción del documento"
})
```

### Manejo de Errores de Autenticación

El frontend ya maneja automáticamente:
- ✅ Tokens expirados (redirección a login)
- ✅ Errores 401/403 
- ✅ Renovación automática de tokens
- ✅ Logout automático en errores críticos

### Ejemplo Manual con fetch

```javascript
// Obtener token de Supabase
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Hacer request
const response = await fetch('http://localhost:5000/api/documents', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

if (response.status === 401) {
  // Token expirado, renovar o hacer logout
  await supabase.auth.signOut()
  window.location.href = '/login'
}

const data = await response.json()
```

## 🔧 Swagger UI - Pruebas de API

### Acceder a Swagger
```
Desarrollo: http://localhost:5000/api-docs
Producción: https://gestor-documental-mineduc-backend.onrender.com/api-docs
```

### Usar Autenticación en Swagger:

1. **Login primero:**
   - Ve a `POST /api/auth/login`
   - Usa credenciales de prueba:
     - Admin: `admin@mineduc.gob.gt`
     - Editor: `editor@mineduc.gob.gt`
     - Viewer: `viewer@mineduc.gob.gt`

2. **Autorizar en Swagger:**
   - Copia el `access_token` de la respuesta
   - Haz clic en el botón **"Authorize"** 🔓
   - Pega el token (sin "Bearer ")
   - Haz clic en "Authorize"

3. **Probar rutas protegidas:**
   - Ahora todas las rutas con 🔒 funcionarán
   - El token se envía automáticamente

## 🚀 Flujo de Desarrollo

### Terminal 1 - Backend
```bash
cd backend
npm run dev  # Servidor en http://localhost:5000
```

### Terminal 2 - Frontend  
```bash
cd frontend
npm run dev  # Aplicación en http://localhost:5173
```

### Verificar CORS
El backend acepta requests desde:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Create React App)
- `http://localhost:4173` (Vite preview)
- URLs de producción configuradas

## 🔒 Códigos de Error de Autenticación

```javascript
// Errores específicos del middleware JWT
{
  "error": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}

{
  "error": "El token ha expirado",
  "code": "TOKEN_EXPIRED"
}

{
  "error": "Token inválido",
  "code": "TOKEN_INVALID"
}

{
  "error": "Cuenta de usuario inactiva",
  "code": "USER_INACTIVE"
}

{
  "error": "Acceso denegado: permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["admin"],
  "current": "viewer"
}
```

## 📊 Monitoreo y Logs

### Logs de Autenticación (Producción)
```
Acceso autorizado: admin@mineduc.gob.gt (admin) - GET /api/documents
```

### Logs de Errores
```javascript
Error en verificación de token: {
  error: "jwt expired",
  timestamp: "2025-01-14T10:30:00.000Z",
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  path: "/api/documents"
}
```

## 🛡️ Configuración de Seguridad

### Variables de Entorno Requeridas

**Backend (.env):**
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT (opcional, Supabase maneja JWT)
JWT_SECRET=tu_secreto_muy_seguro_aqui

# CORS
FRONTEND_URL=https://gestor-documental-mineduc.vercel.app
FRONTEND_PRODUCTION_URL=https://mineduc-docs.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:5000
```

## ✅ Checklist de Implementación

- ✅ CORS configurado para desarrollo y producción
- ✅ JWT middleware con manejo de errores específicos
- ✅ Swagger UI con autenticación funcional
- ✅ Frontend con interceptors automáticos
- ✅ Manejo de tokens expirados
- ✅ Rate limiting por rutas
- ✅ Logs de seguridad detallados
- ✅ Protección de rutas por roles
- ✅ Validación de usuarios activos

## 🆘 Troubleshooting

### Error: "CORS policy"
- Verificar que el frontend URL esté en `corsOptions`
- Comprobar que `NODE_ENV` esté correctamente configurado

### Error: "Token inválido"
- Verificar que el token se envíe con formato `Bearer <token>`
- Comprobar que el token no haya expirado
- Verificar conexión a Supabase

### Error: "Cannot access protected route"
- Confirmar que el usuario tenga el rol requerido
- Verificar que el middleware esté aplicado correctamente

### Swagger no funciona con JWT
- Hacer login primero en `/api/auth/login`
- Copiar solo el token (sin "Bearer ")
- Usar el botón "Authorize" en Swagger UI