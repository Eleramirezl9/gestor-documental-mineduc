# 🧪 Ejemplos de Pruebas para API MINEDUC

## 📋 Tabla de Contenidos
1. [Configuración Base](#configuración-base)
2. [Autenticación](#autenticación)
3. [Gestión de Documentos](#gestión-de-documentos)
4. [Gestión de Usuarios](#gestión-de-usuarios)
5. [Workflows](#workflows)
6. [Notificaciones](#notificaciones)
7. [Reportes](#reportes)
8. [Auditoría](#auditoría)

## 🔧 Configuración Base

### Variables de Entorno
```bash
API_BASE_URL=http://localhost:5000
TOKEN_ADMIN=""  # Se obtiene del login
TOKEN_EDITOR="" # Se obtiene del login
TOKEN_VIEWER="" # Se obtiene del login
```

### Headers Comunes
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

## 🔐 Autenticación

### 1. Login de Usuario
```bash
# cURL
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mineduc.gob.gt",
    "password": "admin123"
  }'

# Respuesta esperada
{
  "message": "Inicio de sesión exitoso",
  "user": {
    "id": "uuid",
    "email": "admin@mineduc.gob.gt",
    "profile": {
      "first_name": "Admin",
      "last_name": "MINEDUC",
      "role": "admin"
    }
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2025-01-15T10:00:00.000Z"
  }
}
```

### 2. Registrar Usuario
```bash
# cURL (Solo admin puede registrar)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "nuevo@mineduc.gob.gt",
    "password": "password123",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "editor",
    "department": "Tecnología"
  }'
```

### 3. Obtener Perfil
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Cambiar Contraseña
```bash
curl -X PUT http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }'
```

## 📄 Gestión de Documentos

### 1. Listar Documentos
```bash
# Con filtros y paginación
curl -X GET "http://localhost:5000/api/documents?page=1&limit=10&status=approved&search=contrato" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Crear Documento
```bash
curl -X POST http://localhost:5000/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Contrato de Servicios 2025",
    "description": "Contrato para servicios de consultoría",
    "categoryId": "uuid-categoria",
    "tags": ["contrato", "servicios", "2025"],
    "isPublic": false,
    "effectiveDate": "2025-01-01T00:00:00.000Z",
    "expirationDate": "2025-12-31T23:59:59.000Z"
  }'
```

### 3. Subir Archivo a Documento
```bash
# Multipart form data
curl -X POST http://localhost:5000/api/documents/UUID_DOCUMENTO/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

### 4. Obtener Documento por ID
```bash
curl -X GET http://localhost:5000/api/documents/UUID_DOCUMENTO \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Descargar Documento
```bash
curl -X GET http://localhost:5000/api/documents/UUID_DOCUMENTO/download \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Estadísticas de Documentos
```bash
curl -X GET http://localhost:5000/api/documents/stats/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 👥 Gestión de Usuarios

### 1. Listar Usuarios (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=20&role=editor" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Obtener Usuario por ID
```bash
curl -X GET http://localhost:5000/api/users/UUID_USUARIO \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Actualizar Usuario (Solo Admin)
```bash
curl -X PUT http://localhost:5000/api/users/UUID_USUARIO \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "firstName": "Juan Carlos",
    "role": "admin",
    "isActive": true,
    "department": "Administración"
  }'
```

### 4. Desactivar Usuario (Solo Admin)
```bash
curl -X DELETE http://localhost:5000/api/users/UUID_USUARIO \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔄 Workflows

### 1. Listar Workflows
```bash
curl -X GET "http://localhost:5000/api/workflows?status=pending&assignedToMe=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Crear Workflow
```bash
curl -X POST http://localhost:5000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "documentId": "UUID_DOCUMENTO",
    "workflowType": "approval",
    "priority": "high",
    "dueDate": "2025-01-20T17:00:00.000Z",
    "comments": "Necesita aprobación urgente",
    "approvers": ["UUID_USER1", "UUID_USER2", "UUID_USER3"]
  }'
```

### 3. Aprobar Paso de Workflow
```bash
curl -X POST http://localhost:5000/api/workflows/UUID_WORKFLOW/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comments": "Aprobado sin observaciones"
  }'
```

### 4. Rechazar Workflow
```bash
curl -X POST http://localhost:5000/api/workflows/UUID_WORKFLOW/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comments": "Rechazado por falta de documentación requerida"
  }'
```

### 5. Cancelar Workflow
```bash
curl -X POST http://localhost:5000/api/workflows/UUID_WORKFLOW/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "El documento ya no es necesario"
  }'
```

## 🔔 Notificaciones

### 1. Obtener Notificaciones
```bash
curl -X GET "http://localhost:5000/api/notifications?unreadOnly=true&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Conteo de No Leídas
```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Marcar Como Leída
```bash
curl -X PUT http://localhost:5000/api/notifications/UUID_NOTIFICATION/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Crear Notificación (Solo Admin)
```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "UUID_USUARIO",
    "title": "Documento Aprobado",
    "message": "Su documento ha sido aprobado y está disponible para descarga",
    "type": "success",
    "actionUrl": "/documents/UUID_DOCUMENTO"
  }'
```

### 5. Notificación Masiva (Solo Admin)
```bash
curl -X POST http://localhost:5000/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userIds": ["UUID_USER1", "UUID_USER2", "UUID_USER3"],
    "title": "Mantenimiento Programado",
    "message": "El sistema estará en mantenimiento el día 20/01/2025 de 2:00 a 4:00 AM",
    "type": "warning"
  }'
```

## 📊 Reportes

### 1. Reporte de Documentos
```bash
curl -X GET "http://localhost:5000/api/reports/documents?startDate=2025-01-01&endDate=2025-01-31&status=approved" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Reporte de Actividad de Usuarios (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/reports/user-activity?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Exportar Documentos a Excel
```bash
curl -X GET "http://localhost:5000/api/reports/export/documents?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output documentos_reporte.xlsx
```

### 4. Exportar Auditoría a Excel (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/reports/export/audit?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output auditoria_reporte.xlsx
```

## 🔍 Auditoría

### 1. Ver Logs de Auditoría (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/audit?page=1&limit=100&action=LOGIN_SUCCESS" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Estadísticas de Auditoría (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/audit/stats?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Actividad Reciente (Solo Admin)
```bash
curl -X GET http://localhost:5000/api/audit/activity/recent \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Exportar Logs a CSV (Solo Admin)
```bash
curl -X GET "http://localhost:5000/api/audit/export/csv?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output audit_logs.csv
```

## 🔄 Health Check

### Verificar Estado del Servidor
```bash
curl -X GET http://localhost:5000/health
```

## 🧪 Scripts de Prueba Automatizada

### Script Bash Completo
```bash
#!/bin/bash
API_BASE="http://localhost:5000"

# 1. Login y obtener token
echo "🔐 Haciendo login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mineduc.gob.gt",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.session.access_token')
echo "Token obtenido: ${TOKEN:0:20}..."

# 2. Crear documento
echo "📄 Creando documento..."
DOC_RESPONSE=$(curl -s -X POST $API_BASE/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Documento de Prueba",
    "description": "Documento creado para testing",
    "isPublic": false
  }')

DOC_ID=$(echo $DOC_RESPONSE | jq -r '.document.id')
echo "Documento creado con ID: $DOC_ID"

# 3. Ver estadísticas
echo "📊 Obteniendo estadísticas..."
curl -s -X GET $API_BASE/api/documents/stats/overview \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo "✅ Pruebas completadas!"
```

## 🛠️ Herramientas Recomendadas

### 1. **Postman Collection** (Importar en Postman)
- Descargar desde Swagger: `http://localhost:5000/api-docs/swagger.json`
- Importar en Postman como colección

### 2. **Thunder Client** (VS Code Extension)
- Crear workspace para MINEDUC API
- Importar desde OpenAPI spec

### 3. **Insomnia**
- Importar desde URL: `http://localhost:5000/api-docs/swagger.json`

### 4. **HTTPie** (Alternativa más amigable que cURL)
```bash
# Instalar HTTPie
pip install httpie

# Ejemplo de uso
http POST localhost:5000/api/auth/login email=admin@mineduc.gob.gt password=admin123
```

## 🚨 Casos de Prueba Importantes

### 1. **Flujo Completo de Documento**
1. Login → Crear documento → Subir archivo → Crear workflow → Aprobar → Descargar

### 2. **Gestión de Usuarios**
1. Login admin → Crear usuario → Actualizar → Ver actividad → Desactivar

### 3. **Sistema de Notificaciones**
1. Crear notificación → Ver notificaciones → Marcar leída → Eliminar

### 4. **Reportes y Auditoría**
1. Generar actividad → Ver reportes → Exportar → Revisar auditoría

¡Con estos ejemplos tendrás una base sólida para probar toda la funcionalidad de tu API! 🎯