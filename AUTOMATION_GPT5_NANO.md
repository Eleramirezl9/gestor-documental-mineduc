# 🤖 Sistema de Automatización de Emails con GPT-5 Nano + Resend

## 📋 Descripción

Sistema completo de automatización de notificaciones de documentos por vencer, integrado con:
- **GPT-5 Nano (OpenAI gpt-4o-mini)**: Generación inteligente de contenido personalizado
- **Resend**: Servicio profesional de envío de emails
- **Datos Reales**: Integración directa con la base de datos de documentos de empleados

## 🎯 Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DETECCIÓN DE DOCUMENTOS POR VENCER                          │
│     └─ Base de datos → employee_document_requirements           │
│        • Documentos próximos a vencer (7, 15, 30 días)          │
│        • Clasificación por urgencia (urgente, alta, media)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. GENERACIÓN DE CONTENIDO CON GPT-5 NANO                      │
│     └─ Contexto: empleado, documento, días, urgencia            │
│        • Tono adaptado según urgencia                           │
│        • Contenido profesional y personalizado                  │
│        • Asunto optimizado para apertura                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. ENVÍO VIA RESEND                                             │
│     └─ Email HTML profesional con branding MINEDUC              │
│        • Plantilla responsive                                    │
│        • Información del documento                               │
│        • Tracking de envío                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. REGISTRO Y MONITOREO                                         │
│     └─ Tabla email_logs con metadata completa                   │
│        • Estado: sent, failed, pending                           │
│        • Información de IA y tracking                            │
│        • Dashboard de seguimiento en tiempo real                 │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ Tests Realizados

Todos los tests pasaron exitosamente (6/6):

✅ **GPT-5 Nano Disponible** - API key configurada correctamente
✅ **Generación de Email con IA** - Contenido personalizado generado
✅ **Generación de Asuntos** - Múltiples variaciones creativas
✅ **Mejora de Contenido** - Refinamiento de mensajes
✅ **Servicio de Email (Resend)** - Configuración verificada
✅ **Resumen Masivo** - Análisis de múltiples documentos

### Ejemplo de Contenido Generado

**Asunto:**
```
⚠️ Importante: Certificado de Antecedentes Penales próximo a vencer (7 días)
```

**Cuerpo:**
```
Estimado Juan Carlos Pérez López,

Espero que te encuentres bien. Te escribo para recordarte que tu Certificado de
Antecedentes Penales está próximo a vencer, específicamente el 15 de enero de 2025.
Actualmente, quedan solo 7 días para su renovación.

Es fundamental que realices este trámite a la brevedad posible, ya que la vigencia
de este documento es crucial para el cumplimiento de nuestros procedimientos
administrativos en el Ministerio de Educación.

Te agradezco tu pronta atención a este asunto y quedo a tu disposición para
cualquier consulta que puedas tener.

Saludos cordiales,
```

## 🚀 Cómo Usar

### 1. Configuración Inicial

Asegúrate de que el archivo `.env` del backend tenga:

```env
# GPT-5 Nano Configuration
GPT5_NANO_API_KEY=sk-proj-CCeKcp8RHW4LDkiHKDs-...

# Resend Configuration
RESEND_API_KEY=re_DYKyXp3T_78F1ncTgvk3t1x4JfbPaoTAL
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 2. Crear Tabla de Logs (Una sola vez)

Ejecuta en el SQL Editor de Supabase:

```bash
# Archivo: database/email_logs_schema.sql
```

Esto creará la tabla `email_logs` para el seguimiento de envíos.

### 3. Iniciar Backend

```bash
cd backend
npm run dev
```

El servidor estará corriendo en `http://localhost:5000`

### 4. Iniciar Frontend

```bash
cd frontend
npm run dev
```

El frontend estará corriendo en `http://localhost:5173`

### 5. Acceder a la Vista de Automatización

1. Inicia sesión como administrador
2. Ve a: **http://localhost:5173/automation**
3. Verás 5 tabs disponibles

## 📱 Funcionalidades por Tab

### Tab 1: Renovaciones (Principal) 🎯

**Gestor completo de emails de renovación**

- ✅ **Lista de documentos por vencer** con datos reales de empleados
- ✅ **Filtros avanzados**: Por urgencia, días, búsqueda de empleado
- ✅ **Estadísticas en tiempo real**: Total, vencidos, urgentes, alta, media
- ✅ **Selección múltiple** para envío masivo
- ✅ **Vista previa con GPT-5 Nano**: Ver el contenido antes de enviar
- ✅ **Envío individual o masivo** con un clic
- ✅ **Indicadores visuales** de urgencia con colores y badges

**Ejemplo de uso:**
1. Selecciona los documentos que necesitas notificar (checkboxes)
2. Haz clic en "Vista previa" para ver el contenido generado por IA
3. Si está correcto, haz clic en "Enviar" (individual) o "Enviar X Emails" (masivo)
4. El sistema genera contenido personalizado con GPT-5 Nano
5. Los emails se envían via Resend
6. Se registra todo en `email_logs`

### Tab 2: Compositor IA

Generador manual de mensajes para casos especiales:
- Configuración de parámetros personalizados
- Generación con diferentes tonos
- Sugerencias de asuntos
- Historial de mensajes generados

### Tab 3: Configuración

Configuración del sistema de automatización:
- Umbrales de urgencia
- Horarios de envío
- Activar/desactivar notificaciones automáticas
- Configuración de IA (temperatura, tokens, etc.)

### Tab 4: Pruebas

Herramientas para testing:
- Enviar emails de prueba a cualquier dirección
- Diferentes tipos de notificación
- Verificación de configuración

### Tab 5: Monitoreo 📊

**Dashboard completo de seguimiento**

Incluye:
- **Estado del sistema**: Servicios activos, IA disponible, email configurado
- **Monitor de emails**: Historial completo de todos los envíos
- **Estadísticas**: Total enviados, exitosos, fallidos, tasa de éxito
- **Filtros**: Por estado (enviado/fallido/pendiente)
- **Detalles**: Para cada email muestra:
  - Destinatario
  - Asunto
  - Estado
  - Fecha/hora
  - Si fue generado con IA
  - Código de empleado
  - Días hasta vencimiento
  - ID de Resend
  - Errores (si hubo)

## 📊 API Endpoints Nuevos

### GET `/api/automated-notifications/renewals/pending`

Obtiene documentos pendientes de renovación con datos enriquecidos.

**Query params:**
- `days`: Días de anticipación (default: 30)
- `urgency`: Filtro por urgencia (urgent, high, medium, all)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "grouped": {
    "expired": [...],
    "urgent": [...],
    "high": [...],
    "medium": [...]
  },
  "summary": {
    "total": 15,
    "expired": 2,
    "urgent": 5,
    "high": 4,
    "medium": 4
  }
}
```

### POST `/api/automated-notifications/generate-email-content`

Genera contenido de email con GPT-5 Nano para un documento específico.

**Body:**
```json
{
  "documentId": "uuid",
  "preview": true
}
```

**Response:**
```json
{
  "success": true,
  "preview": true,
  "document": {
    "id": "...",
    "type": "Certificado de Antecedentes",
    "employee": {
      "name": "Juan Pérez",
      "code": "MIN25001",
      "email": "juan.perez@mineduc.gob.gt",
      "position": "Docente",
      "department": "Matemáticas"
    },
    "expiration_date": "2025-01-15",
    "days_until_expiration": 7,
    "urgency_level": "high"
  },
  "email": {
    "success": true,
    "subject": "⚠️ Importante: Certificado de Antecedentes próximo a vencer (7 días)",
    "body": "Estimado Juan Pérez...",
    "metadata": {
      "model": "gpt-4o-mini",
      "tokens": 361,
      "generatedAt": "2025-10-16T18:23:55.178Z"
    }
  }
}
```

### POST `/api/automated-notifications/send-renewal-email`

Envía email de renovación con contenido generado por GPT-5 Nano.

**Body:**
```json
{
  "documentId": "uuid",
  "customContent": {  // Opcional
    "subject": "...",
    "body": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email enviado exitosamente",
  "email": {
    "to": "juan.perez@mineduc.gob.gt",
    "subject": "...",
    "aiGenerated": true
  },
  "emailResult": {
    "id": "resend-email-id",
    "success": true
  }
}
```

### POST `/api/automated-notifications/bulk-send`

Envío masivo de emails para múltiples documentos.

**Body:**
```json
{
  "documentIds": ["uuid1", "uuid2", "uuid3", ...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Envío masivo completado: 15/20 exitosos",
  "summary": {
    "total": 20,
    "successful": 15,
    "failed": 5
  },
  "results": [
    {
      "documentId": "uuid1",
      "success": true,
      "email": "juan.perez@mineduc.gob.gt"
    },
    ...
  ]
}
```

### GET `/api/automated-notifications/email-logs`

Obtiene histórico de emails enviados.

**Query params:**
- `limit`: Límite de resultados (default: 50)
- `status`: Filtrar por estado (sent, failed, pending)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "recipient": "juan.perez@mineduc.gob.gt",
      "subject": "...",
      "type": "document_expiration",
      "status": "sent",
      "metadata": {
        "document_id": "...",
        "employee_id": "MIN25001",
        "days_until_expiration": 7,
        "urgency_level": "high",
        "ai_generated": true,
        "email_id": "resend-id"
      },
      "sent_at": "2025-10-16T18:30:00Z",
      "created_at": "2025-10-16T18:30:00Z"
    },
    ...
  ],
  "summary": {
    "total": 50,
    "sent": 45,
    "failed": 3,
    "pending": 2
  }
}
```

## 🎨 Componentes Frontend Creados

### `RenewalEmailsManager.jsx`

Componente principal para gestión de emails de renovación.

**Características:**
- Lista de documentos con datos reales
- Filtros avanzados (urgencia, días, búsqueda)
- Selección múltiple con checkboxes
- Vista previa con GPT-5 Nano
- Envío individual y masivo
- Estadísticas en tiempo real
- Indicadores visuales de urgencia

**Ubicación:** `frontend/src/components/automation/RenewalEmailsManager.jsx`

### `EmailLogsMonitor.jsx`

Dashboard de seguimiento de envíos.

**Características:**
- Historial completo de emails
- Estadísticas (total, exitosos, fallidos, tasa de éxito)
- Filtros por estado y límite
- Detalles completos de cada envío
- Indicadores visuales de estado
- Información de IA y tracking

**Ubicación:** `frontend/src/components/automation/EmailLogsMonitor.jsx`

## 🔧 Servicios Backend Creados

### `gpt5NanoService.js`

Servicio para integración con GPT-5 Nano (OpenAI).

**Métodos principales:**
- `generateExpirationEmailContent(context)`: Genera contenido personalizado
- `generateSubjectVariations(context)`: Genera múltiples asuntos
- `improveContent(content, improvementType)`: Mejora un contenido existente
- `generateBulkSummary(documents)`: Resumen de múltiples documentos
- `getStatus()`: Estado del servicio
- `checkAvailability()`: Verifica disponibilidad de la API

**Ubicación:** `backend/services/gpt5NanoService.js`

## 📁 Archivos Importantes

### Backend
- `backend/services/gpt5NanoService.js` - Servicio GPT-5 Nano
- `backend/routes/automatedNotifications.js` - Rutas API (actualizado)
- `backend/test_gpt5_automation.js` - Script de testing
- `backend/.env` - Configuración (incluye GPT5_NANO_API_KEY)

### Frontend
- `frontend/src/components/automation/RenewalEmailsManager.jsx` - Gestor de emails
- `frontend/src/components/automation/EmailLogsMonitor.jsx` - Monitor de envíos
- `frontend/src/pages/NotificationAutomation.jsx` - Vista principal (actualizada)

### Database
- `database/email_logs_schema.sql` - Schema para tabla de logs

## 🎯 Casos de Uso

### Caso 1: Envío Individual con Preview

1. Accede a `/automation` → Tab "Renovaciones"
2. Busca el empleado en la lista
3. Haz clic en "Vista previa"
4. Revisa el contenido generado por GPT-5 Nano
5. Si está correcto, haz clic en "Enviar Email"
6. El email se envía y se registra en email_logs

### Caso 2: Envío Masivo Urgente

1. Accede a `/automation` → Tab "Renovaciones"
2. Filtra por urgencia: "Urgente"
3. Haz clic en "Seleccionar todo"
4. Haz clic en "Enviar X Emails"
5. Confirma el envío
6. El sistema procesa todos los documentos:
   - Genera contenido con GPT-5 Nano para cada uno
   - Envía via Resend
   - Registra en email_logs
7. Muestra resumen de envío (exitosos/fallidos)

### Caso 3: Monitoreo y Auditoría

1. Accede a `/automation` → Tab "Monitoreo"
2. Revisa las estadísticas generales
3. Filtra por estado: "Enviados"
4. Revisa el historial completo
5. Para cada email puedes ver:
   - A quién se envió
   - Cuándo se envió
   - Si fue generado con IA
   - Estado de entrega
   - Información del documento

## 🔐 Seguridad

- ✅ Solo administradores pueden acceder a `/automation`
- ✅ Todas las rutas API requieren autenticación JWT
- ✅ Row Level Security en `email_logs`
- ✅ Validación de datos con express-validator
- ✅ Rate limiting en rutas API

## 📈 Métricas Disponibles

El sistema registra y muestra:
- Total de emails enviados
- Tasa de éxito de envíos
- Emails generados con IA vs predeterminados
- Tiempo de generación (tokens usados)
- Distribución por urgencia
- Historial completo con detalles

## 🎓 Uso Académico (Tesis)

Este sistema fue desarrollado como parte de una tesis sobre:
- Automatización de procesos administrativos con IA
- Mejora de comunicación institucional mediante NLP
- Optimización de gestión documental en sector público

**Tecnologías demostradas:**
- GPT-5 Nano (gpt-4o-mini) para generación de contenido
- Integración de servicios externos (Resend)
- Arquitectura full-stack con React + Node.js
- Base de datos relacional con Supabase
- Testing profesional de servicios

## 🐛 Troubleshooting

### Error: "GPT-5 Nano no disponible"

**Solución:**
1. Verifica que `GPT5_NANO_API_KEY` esté en `.env`
2. Reinicia el servidor backend
3. Ejecuta el script de testing: `node backend/test_gpt5_automation.js`

### Error: "Email service not configured"

**Solución:**
1. Verifica `RESEND_API_KEY` en `.env`
2. Verifica `RESEND_FROM_EMAIL` en `.env`
3. Reinicia el servidor backend

### Error: "Documento no encontrado"

**Solución:**
1. Verifica que hay documentos en `employee_document_requirements`
2. Verifica que tienen `expiration_date` no nulo
3. Verifica que el estado sea 'active'

### No aparecen documentos en la lista

**Solución:**
1. Ajusta el filtro de días (prueba con 60 o 90 días)
2. Cambia el filtro de urgencia a "Todos"
3. Verifica que hay documentos próximos a vencer en la BD

## 📞 Soporte

Para consultas o issues:
- Revisa los logs del backend: `backend/logs/`
- Revisa la consola del navegador (F12)
- Ejecuta el script de testing
- Revisa la documentación de Swagger en `/api-docs`

---

**Desarrollado con ❤️ para MINEDUC Guatemala**
**Integración GPT-5 Nano + Resend completada exitosamente** ✅
