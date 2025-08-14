# Documentación Swagger - Sistema de Gestión Documental MINEDUC

## 📋 Resumen

Se ha integrado Swagger UI en el backend para proporcionar documentación interactiva de la API REST. La documentación está disponible en desarrollo y producción.

## 🔗 Acceso a la Documentación

### Desarrollo
- **URL**: http://localhost:5000/api-docs
- **Servidor**: Automáticamente configurado para localhost:5000

### Producción
- **URL**: https://tu-dominio.com/api-docs
- **Servidor**: Configurado desde variable de entorno `API_BASE_URL`

## 🛠️ Configuración Implementada

### Dependencias Instaladas
```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1"
}
```

### Características Implementadas

1. **Configuración OpenAPI 3.0**
   - Información completa de la API
   - Servidores dinámicos (desarrollo/producción)
   - Esquemas de seguridad con JWT Bearer Token

2. **Seguridad JWT**
   - Configuración de `bearerAuth` para rutas protegidas
   - Autorización persistente en la interfaz

3. **Interfaz Personalizada**
   - Título personalizado: "MINEDUC API Documentation"
   - Filtros habilitados para búsqueda
   - Explorador de API activado
   - Tiempos de respuesta visibles

## 📚 Documentación por Módulos

### ✅ Autenticación (`/api/auth`)
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/change-password` - Cambiar contraseña

### 📄 Documentos (`/api/documents`) 
- `GET /api/documents` - Lista paginada de documentos con filtros
- `POST /api/documents` - Crear nuevo documento
- `GET /api/documents/stats/overview` - Estadísticas de documentos
- `GET /api/documents/{id}` - Obtener documento por ID
- `PUT /api/documents/{id}` - Actualizar documento
- `DELETE /api/documents/{id}` - Eliminar documento
- `POST /api/documents/{id}/upload` - Subir archivo (con OCR y IA)
- `GET /api/documents/{id}/download` - Descargar documento

### 👥 Usuarios (`/api/users`)
- `GET /api/users` - Lista de usuarios (solo admin)
- `GET /api/users/stats/overview` - Estadísticas de usuarios
- `GET /api/users/{id}` - Obtener usuario por ID
- `PUT /api/users/{id}` - Actualizar usuario
- `DELETE /api/users/{id}` - Desactivar usuario

### 🔄 Workflows (`/api/workflows`)
- `GET /api/workflows` - Lista de workflows con filtros
- `POST /api/workflows` - Crear nuevo workflow
- `GET /api/workflows/stats/overview` - Estadísticas de workflows
- `GET /api/workflows/{id}` - Obtener workflow por ID
- `POST /api/workflows/{id}/approve` - Aprobar paso del workflow
- `POST /api/workflows/{id}/reject` - Rechazar workflow
- `POST /api/workflows/{id}/cancel` - Cancelar workflow

### 🔔 Notificaciones (`/api/notifications`)
- `GET /api/notifications` - Lista de notificaciones del usuario
- `GET /api/notifications/unread-count` - Conteo de no leídas
- `PUT /api/notifications/{id}/read` - Marcar como leída
- `PUT /api/notifications/read-all` - Marcar todas como leídas
- `DELETE /api/notifications/{id}` - Eliminar notificación
- `DELETE /api/notifications/read-all` - Eliminar leídas
- `POST /api/notifications` - Crear notificación (solo admin)
- `POST /api/notifications/broadcast` - Notificación masiva (solo admin)
- `GET /api/notifications/stats/overview` - Estadísticas (solo admin)

### 📊 Reportes (`/api/reports`)
- `GET /api/reports/documents` - Reporte de documentos
- `GET /api/reports/user-activity` - Reporte de actividad (solo admin)
- `GET /api/reports/workflows` - Reporte de workflows
- `GET /api/reports/export/documents` - Exportar documentos a Excel
- `GET /api/reports/export/audit` - Exportar auditoría a Excel (solo admin)

### 🔍 Auditoría (`/api/audit`)
- `GET /api/audit` - Lista de logs de auditoría (solo admin)
- `GET /api/audit/stats` - Estadísticas de auditoría (solo admin)
- `GET /api/audit/{id}` - Log específico por ID (solo admin)
- `GET /api/audit/export/csv` - Exportar logs a CSV (solo admin)
- `GET /api/audit/actions/list` - Lista de acciones disponibles (solo admin)
- `GET /api/audit/entities/list` - Lista de tipos de entidad (solo admin)
- `GET /api/audit/activity/recent` - Actividad reciente (solo admin)

### 🔄 Health Check
- `GET /health` - Verificar estado del servidor

## 🎯 Esquemas Principales

### User
```yaml
User:
  type: object
  properties:
    id: { type: string, format: uuid }
    email: { type: string, format: email }
    role: { type: string, enum: [admin, editor, viewer] }
    profile: { type: object }
```

### Error
```yaml
Error:
  type: object
  properties:
    error: { type: string }
    message: { type: string }
```

### Document
```yaml
Document:
  type: object
  properties:
    id: { type: string, format: uuid }
    title: { type: string }
    file_name: { type: string }
    status: { type: string, enum: [draft, pending, approved, rejected, archived] }
    # ... más propiedades
```

## 🚀 Comandos para Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Acceder a documentación
# Navegador: http://localhost:5000/api-docs
```

## 📝 Estándares de Documentación

### Para nuevas rutas, seguir este formato:

```javascript
/**
 * @swagger
 * /api/ruta:
 *   method:
 *     summary: Descripción breve
 *     description: Descripción detallada
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []  # Solo para rutas protegidas
 *     parameters:
 *       - in: query|path|header
 *         name: nombreParametro
 *         required: true|false
 *         schema:
 *           type: string|number|boolean
 *     requestBody:  # Solo para POST/PUT/PATCH
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

## 🔧 Próximos Pasos

1. **Completar documentación** de todas las rutas restantes:
   - `/api/users` - Gestión de usuarios
   - `/api/workflows` - Flujos de trabajo
   - `/api/notifications` - Notificaciones
   - `/api/reports` - Reportes
   - `/api/audit` - Auditoría

2. **Agregar ejemplos** de request/response para cada endpoint

3. **Configurar variables de entorno** en producción para URLs correctas

4. **Implementar colecciones Postman** basadas en la documentación Swagger

## 📞 Contacto de Desarrollo

- **Equipo**: MINEDUC Development Team
- **Email**: dev@mineduc.gob.gt
- **Licencia**: MIT

---

**Nota**: Esta documentación está diseñada para facilitar el desarrollo, testing y mantenimiento de la API del Sistema de Gestión Documental del MINEDUC.