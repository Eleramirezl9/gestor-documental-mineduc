# 🧪 Guía de Testing - Sistema de Documentos de Empleados

## Descripción General

Esta guía describe cómo probar el sistema completo de gestión de documentos de empleados que ha sido refactorizado con arquitectura limpia y conectado 100% a la API real de Supabase.

## ✅ Cambios Implementados

### 1. Refactorización Completada
- **EmployeeManagement.jsx**: Reducido de 4,239 a 3,643 líneas (596 líneas / 14% reducción)
- **Nuevo componente**: `EmployeeDocumentModal.jsx` (500 líneas) - Modal profesional y reutilizable
- **Custom Hook**: `useEmployeeDocumentAssignment.js` (310 líneas) - Lógica de negocio centralizada
- **Service Layer**: `employeeDocumentService.js` (380 líneas) - Capa de API
- **Backend API**: `employeeDocumentRequirements.js` (550 líneas) - 10 endpoints RESTful

### 2. Arquitectura Limpia
```
┌─────────────────────────────────────────────────────┐
│                   COMPONENTES (UI)                  │
│  EmployeeManagement.jsx + EmployeeDocumentModal    │
└────────────────────┬────────────────────────────────┘
                     │ usa
┌────────────────────▼────────────────────────────────┐
│                 CUSTOM HOOKS (Lógica)               │
│          useEmployeeDocumentAssignment.js           │
└────────────────────┬────────────────────────────────┘
                     │ llama a
┌────────────────────▼────────────────────────────────┐
│              SERVICE LAYER (API Calls)              │
│           employeeDocumentService.js                │
└────────────────────┬────────────────────────────────┘
                     │ HTTP requests
┌────────────────────▼────────────────────────────────┐
│              BACKEND API (Express.js)               │
│        employeeDocumentRequirements.js              │
└────────────────────┬────────────────────────────────┘
                     │ usa supabaseAdmin
┌────────────────────▼────────────────────────────────┐
│            SUPABASE DATABASE (PostgreSQL)           │
│   employee_document_requirements + document_types   │
└─────────────────────────────────────────────────────┘
```

### 3. Integración Real con Base de Datos

**Tablas Principales:**
- ✅ `document_types` - 18 tipos de documentos precargados
- ✅ `employee_document_requirements` - Documentos asignados a empleados
- ✅ `employees` - Información de empleados
- ✅ `document_templates` - Plantillas reutilizables

**Estructura de `employee_document_requirements`:**
```sql
- employee_id (UUID) → references employees.id
- document_type (VARCHAR) → Nombre del documento
- description (VARCHAR) → Notas/descripción
- required_date (DATE) → Fecha límite
- priority (ENUM: high/medium/low)
- status (ENUM: pending/approved/rejected)
- file_name, file_url → Para documentos subidos
- created_at, updated_at → Auditoría
```

### 4. Correcciones de Bugs Implementadas

#### Bug #1: Import Name Mismatch ✅ RESUELTO
```javascript
// ANTES (incorrecto):
import { getTemplates, getEmployeeDocuments, ... }

// DESPUÉS (correcto):
import { getDocumentTemplates, getEmployeeRequiredDocuments, ... }
```

#### Bug #2: Variable Not Defined ✅ RESUELTO
```javascript
// ANTES: Intentaba usar setAssignedDocuments que no existe
// DESPUÉS: Data managed by hook automatically
```

#### Bug #3: Database Structure Mismatch ✅ RESUELTO
```javascript
// PROBLEMA: Hook buscaba doc.document_type_id (no existe)
// SOLUCIÓN: Buscar por nombre y mapear a ID

const docType = allAvailableDocuments.find(
  dt => dt.name === doc.document_type
);
return {
  documentId: docType?.id || '',           // ✅
  documentName: doc.document_type,         // ✅
  dueDate: doc.required_date,              // ✅ (no due_date)
  notes: doc.description || '',            // ✅ (no notes)
  // ...
};
```

#### Bug #4: RLS Policy Violation ✅ RESUELTO
```javascript
// ANTES: Usaba supabase (anon key) → RLS bloqueaba
// DESPUÉS: Usa supabaseAdmin (service_role) → Bypass RLS
```

#### Bug #5: Employee ID Conversion ✅ RESUELTO
```javascript
// Frontend envía: "MIN25007" (employee_id - código)
// Backend convierte a UUID antes de query:
const { data: employee } = await supabaseAdmin
  .from('employees')
  .select('id')
  .eq('employee_id', employee_id)  // Buscar por código
  .single();

// Luego usa employee.id (UUID) para las queries
```

## 📋 Archivos de Test Disponibles

### 1. `test_api_endpoints.js` - Tests Básicos sin Autenticación
Tests simples para verificar conectividad básica.

**Ejecutar:**
```bash
node test_api_endpoints.js
```

**Qué prueba:**
- ✅ Health check del servidor
- ✅ GET /api/employee-document-requirements/document-types
- ✅ GET /api/employee-document-requirements/templates
- ✅ GET /api/employee-document-requirements/employee/:id
- ✅ GET /api/employee-document-requirements/statistics

### 2. `test_employee_documents_flow.js` - Tests Completos con Autenticación ⭐
Suite completa de tests que valida todo el flujo CRUD.

**Ejecutar:**
```bash
node test_employee_documents_flow.js
```

**Qué prueba:**

#### TEST 1: Autenticación ✅
```
POST /api/auth/login
Credenciales: admin@mineduc.gob.gt / Admin123!
Obtiene: JWT token para requests subsecuentes
```

#### TEST 2: Tipos de Documentos ✅
```
GET /api/employee-document-requirements/document-types
Valida: 18 tipos de documentos disponibles
Ejemplos: DPI, Carné de IGSS, Título académico, etc.
```

#### TEST 3: Lista de Empleados ✅
```
GET /api/employees?limit=5
Obtiene: Primer empleado para testing
Guarda: employee_id para tests siguientes
```

#### TEST 4: Documentos Asignados (Estado Inicial) ✅
```
GET /api/employee-document-requirements/employee/:id
Muestra: Documentos ya asignados al empleado (si existen)
```

#### TEST 5: Asignar Documentos ✅
```
POST /api/employee-document-requirements/assign
Body: {
  employee_id: "MIN25007",
  documents: [
    {
      document_type_id: "uuid-del-tipo",
      priority: "high",
      due_date: "2025-10-09",
      notes: "Test document 1"
    }
    // ... más documentos
  ]
}

Backend convierte:
- employee_id (MIN25007) → UUID
- document_type_id (UUID) → document_type (nombre)
- priority, due_date, notes → required_date, description

Resultado: 3 documentos asignados correctamente
```

#### TEST 6: Verificar Asignación ✅
```
GET /api/employee-document-requirements/employee/:id
Valida: Los 3 documentos ahora aparecen en la lista
Muestra: document_type, status, priority, required_date
```

#### TEST 7: Actualizar Documento ✅
```
PUT /api/employee-document-requirements/:id
Body: {
  status: "approved",
  priority: "high",
  notes: "Documento actualizado en test"
}

Resultado: Documento actualizado correctamente
```

#### TEST 8: Plantillas ✅
```
GET /api/employee-document-requirements/templates
Muestra: Plantillas disponibles (puede estar vacío inicialmente)
```

#### TEST 9: Estadísticas ✅
```
GET /api/employee-document-requirements/statistics
Muestra:
- Total tipos de documentos
- Total asignaciones
- Pendientes, Aprobados, Rechazados
```

#### TEST 10: Eliminar Documento (Opcional)
```
DELETE /api/employee-document-requirements/:id
Nota: Comentado por defecto para no eliminar datos de prueba
```

## 🚀 Cómo Ejecutar los Tests

### Prerequisitos

1. **Backend corriendo:**
```bash
cd backend
npm run dev
# Debe estar en puerto 5000
```

2. **Frontend corriendo:**
```bash
cd frontend
npm run dev
# Debe estar en puerto 5173
```

3. **Base de datos configurada:**
- Supabase con schema aplicado
- 18 tipos de documentos insertados
- Al menos un empleado en la tabla `employees`
- Usuario admin@mineduc.gob.gt creado

### Ejecutar Tests

**Opción 1: Tests Básicos (sin autenticación)**
```bash
node test_api_endpoints.js
```

**Opción 2: Tests Completos (recomendado) ⭐**
```bash
node test_employee_documents_flow.js
```

### Salida Esperada

```
═══════════════════════════════════════════════════════════════
🧪 TEST COMPLETO: Sistema de Documentos de Empleados
═══════════════════════════════════════════════════════════════

🧪 TEST 1: Autenticación de usuario
✅ Login exitoso - Token obtenido
   Usuario: admin@mineduc.gob.gt
   Rol: admin

🧪 TEST 2: Obtener tipos de documentos disponibles
✅ 18 tipos de documentos encontrados
   Ejemplos: DPI, Carné de IGSS, Título académico, ...

🧪 TEST 3: Obtener lista de empleados
✅ 5 empleados encontrados
   Test con empleado: Juan Pérez (MIN25007)

🧪 TEST 4: Obtener documentos del empleado (estado inicial)
✅ 0 documentos asignados actualmente

🧪 TEST 5: Asignar documentos al empleado
   Asignando 3 documentos:
     1. DPI (Prioridad: high)
     2. Carné de IGSS (Prioridad: medium)
     3. Título académico (Prioridad: low)
✅ 3 documentos asignados correctamente
   IDs asignados: uuid1, uuid2, uuid3

🧪 TEST 6: Verificar documentos asignados
✅ 3 documentos asignados al empleado
   Lista completa de documentos:
     1. DPI
        Estado: pending, Prioridad: high
        Fecha requerida: 2025-10-09
     2. Carné de IGSS
        Estado: pending, Prioridad: medium
        Fecha requerida: 2025-10-16
     3. Título académico
        Estado: pending, Prioridad: low
        Fecha requerida: 2025-10-23

🧪 TEST 7: Actualizar documento asignado
   Actualizando documento ID: uuid1
   Cambios: status=approved, priority=high
✅ Documento actualizado correctamente
   Nuevo estado: approved

🧪 TEST 8: Obtener plantillas de documentos
✅ 0 plantillas encontradas
ℹ️  No hay plantillas creadas (normal en primera ejecución)

🧪 TEST 9: Obtener estadísticas del sistema
✅ Estadísticas obtenidas
   Total tipos de documentos: 18
   Total asignaciones: 3
   Pendientes: 2
   Aprobados: 1
   Rechazados: 0

═══════════════════════════════════════════════════════════════
📊 RESUMEN DE TESTS
═══════════════════════════════════════════════════════════════

✅ Tests exitosos: 9
❌ Tests fallidos: 0
📈 Porcentaje de éxito: 100%

✅ 🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!

El sistema está funcionando correctamente.
Puedes acceder a la aplicación en: http://localhost:5173/employees
```

## 🌐 Pruebas en el Navegador

### 1. Abrir la Página de Empleados
```
http://localhost:5173/employees
```

### 2. Abrir Modal de Documentos
- Click en el botón "Documentos" de cualquier empleado
- El modal debe abrir con diseño correcto: `max-w-5xl max-h-[90vh]`

### 3. Tab "Seleccionar Documentos Individuales"

**Funcionalidad esperada:**
- ✅ Botón "Agregar Documento" funciona
- ✅ Dropdown muestra 18 tipos de documentos
- ✅ Se puede seleccionar prioridad (Baja/Media/Alta/Urgente)
- ✅ Se puede seleccionar fecha límite
- ✅ Se pueden agregar notas
- ✅ Se pueden agregar múltiples documentos
- ✅ Se pueden eliminar items antes de guardar
- ✅ Botón "Guardar Asignación" funciona

**Validar en consola del navegador:**
```javascript
// Al abrir modal, debe aparecer:
"📝 Empleado seleccionado:", { employee_id: "MIN25007", ... }

// Al guardar, debe aparecer:
"✅ Documentos guardados:", [...]
"1 documento(s) asignado(s) correctamente" // Toast verde
```

### 4. Tab "Usar Plantilla"

**Funcionalidad esperada:**
- ✅ Muestra plantillas disponibles (si existen)
- ✅ Click en plantilla asigna múltiples documentos
- ⚠️ Si no hay plantillas, muestra mensaje informativo

### 5. Sección "Documentos ya Asignados"

**Funcionalidad esperada:**
- ✅ Muestra lista de documentos asignados
- ✅ Cada documento muestra:
  - Nombre del documento (NO "Documento no encontrado")
  - Prioridad con badge de color
  - Estado con badge de color
  - Fecha límite
  - Notas/descripción
- ✅ Se pueden actualizar documentos
- ✅ Se pueden eliminar documentos

**Antes (BUG):**
```
Documento no encontrado
Prioridad: medium
Estado: pending
```

**Después (CORRECTO):**
```
DPI
Prioridad: Alta  [badge naranja]
Estado: Pendiente  [badge amarillo]
Fecha límite: 2025-10-09
Descripción: Documento de identidad personal
```

## 🐛 Troubleshooting

### Error: "Documento no encontrado"

**Causa:** Hook no encuentra el documento type en la lista
**Solución:** Ya implementada en líneas 85-104 de useEmployeeDocumentAssignment.js

### Error: RLS Policy Violation

**Causa:** Backend usa cliente normal en lugar de admin
**Solución:** Ya implementada - backend usa `supabaseAdmin`

### Error: Backend 500 al obtener documentos

**Causa:** Conversión de employee_id (código) a UUID
**Solución:** Ya implementada en líneas del backend

### Error: Templates no aparecen

**Verificar:**
1. Tabla `document_templates` existe
2. Hay registros en la tabla
3. Endpoint GET /templates funciona

### Error: Modal no tiene diseño correcto

**Verificar en EmployeeDocumentModal.jsx:**
```javascript
<DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
```

## 📊 Endpoints API Documentados

### GET /api/employee-document-requirements/document-types
Obtiene todos los tipos de documentos disponibles.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "DPI",
      "description": "Documento Personal de Identificación",
      "is_required": true,
      "created_at": "2025-10-02T..."
    }
  ]
}
```

### GET /api/employee-document-requirements/employee/:employee_id
Obtiene documentos asignados a un empleado.

**Parámetros:**
- `employee_id`: Código de empleado (ej: "MIN25007")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid-empleado",
      "document_type": "DPI",
      "description": "Documento de identidad",
      "required_date": "2025-10-09",
      "priority": "high",
      "status": "pending",
      "file_name": null,
      "file_url": null,
      "created_at": "2025-10-02T..."
    }
  ]
}
```

### POST /api/employee-document-requirements/assign
Asigna documentos a un empleado.

**Body:**
```json
{
  "employee_id": "MIN25007",
  "documents": [
    {
      "document_type_id": "uuid-tipo",
      "priority": "high",
      "due_date": "2025-10-09",
      "notes": "Urgente"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "3 documento(s) asignado(s) correctamente"
}
```

### PUT /api/employee-document-requirements/:id
Actualiza un documento asignado.

**Body:**
```json
{
  "status": "approved",
  "priority": "high",
  "notes": "Documento verificado"
}
```

### DELETE /api/employee-document-requirements/:id
Elimina un documento asignado.

**Response:**
```json
{
  "success": true,
  "message": "Documento eliminado correctamente"
}
```

### GET /api/employee-document-requirements/templates
Obtiene plantillas disponibles.

### GET /api/employee-document-requirements/statistics
Obtiene estadísticas del sistema.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTypes": 18,
    "totalAssignments": 45,
    "pending": 20,
    "approved": 15,
    "rejected": 10
  }
}
```

## ✨ Próximas Mejoras Sugeridas

1. **Botón para crear nuevos tipos de documentos**
   - Modal adicional en la UI
   - Endpoint POST /document-types

2. **Mejoras en plantillas**
   - CRUD completo de plantillas
   - Previsualización antes de aplicar

3. **Carga de archivos**
   - Upload a Supabase Storage
   - Preview de documentos PDF/imágenes

4. **Notificaciones**
   - Alertas por documentos próximos a vencer
   - Emails automáticos

5. **Tests E2E con Playwright/Cypress**
   - Tests de UI completos
   - Tests de integración end-to-end

## 📚 Referencias

- [Documentación Backend](backend/docs/JWT_AUTHENTICATION_GUIDE.md)
- [Schema SQL](database/employee_documents_requirements.sql)
- [Configuración Supabase](CLAUDE.md)

---

**Última actualización:** 2025-10-02
**Autor:** Claude Code
**Estado:** ✅ Completamente funcional con API real
