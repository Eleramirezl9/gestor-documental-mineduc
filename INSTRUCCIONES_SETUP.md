# 🚀 Instrucciones de Setup - Sistema de Documentos Requeridos

## 📋 Resumen de lo Implementado

Se ha creado un sistema completo de gestión de documentos requeridos para empleados con:

✅ **Backend**:
- Endpoint REST completo en `/api/employee-document-requirements`
- 10 endpoints para CRUD de documentos, plantillas y asignaciones
- Subida de archivos con validación
- Estadísticas en tiempo real

✅ **Frontend**:
- Servicio API limpio y modular (`employeeDocumentService.js`)
- Custom hook `useEmployeeDocuments` con toda la lógica
- Componente modal `DocumentAssignmentModal` para asignar documentos
- Funciones utilitarias para validación y formateo

✅ **Base de Datos**:
- 5 tablas nuevas con relaciones
- Row Level Security (RLS) configurado
- 18 tipos de documentos predefinidos
- Triggers para auditoría automática

---

## 🗄️ PASO 1: Ejecutar Script SQL en Supabase

### Opción A: Desde el Dashboard de Supabase

1. Ve a tu proyecto en https://supabase.com
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido del archivo: `database/employee_documents_requirements.sql`
5. Ejecuta el script completo (botón Run)

### Opción B: Desde psql (si tienes acceso directo)

```bash
psql "your-supabase-connection-string" -f database/employee_documents_requirements.sql
```

### ✅ Verificación

Después de ejecutar el script, verifica que se crearon las tablas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'document_types',
  'document_templates',
  'template_documents',
  'employee_document_requirements',
  'employee_documents'
);
```

Deberías ver 5 tablas.

---

## 🔧 PASO 2: Verificar Backend

El backend ya está configurado. Solo necesitas asegurarte de que el servidor esté corriendo:

```bash
cd backend
npm run dev
```

### Endpoints Disponibles:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/employee-document-requirements/document-types` | Obtener catálogo de documentos |
| POST | `/api/employee-document-requirements/document-types` | Crear tipo de documento |
| GET | `/api/employee-document-requirements/templates` | Obtener plantillas |
| POST | `/api/employee-document-requirements/templates` | Crear plantilla |
| POST | `/api/employee-document-requirements/assign` | Asignar documentos a empleado |
| GET | `/api/employee-document-requirements/employee/:id` | Obtener docs de empleado |
| PUT | `/api/employee-document-requirements/:id` | Actualizar documento |
| DELETE | `/api/employee-document-requirements/:id` | Eliminar documento |
| POST | `/api/employee-document-requirements/upload` | Subir archivo |
| GET | `/api/employee-document-requirements/statistics` | Estadísticas |

---

## 🎨 PASO 3: Integrar en Frontend

Ahora necesitas integrar el componente `DocumentAssignmentModal` en `EmployeeManagement.jsx`.

### A. Importar componentes y hooks

En `frontend/src/pages/EmployeeManagement.jsx`, agrega al inicio:

```javascript
import DocumentAssignmentModal from '../components/employees/DocumentAssignmentModal';
import { useEmployeeDocuments } from '../hooks/useEmployeeDocuments';
```

### B. Agregar estados

Dentro del componente `EmployeeManagement`, agrega:

```javascript
const [showAssignmentModal, setShowAssignmentModal] = useState(false);
const [selectedEmployeeForAssignment, setSelectedEmployeeForAssignment] = useState(null);
```

### C. Agregar el botón para abrir modal

En la tarjeta de perfil del empleado, donde dice "Asignar Documentos", reemplaza con:

```javascript
<Button
  onClick={() => {
    setSelectedEmployeeForAssignment(selectedEmployee);
    setShowAssignmentModal(true);
  }}
  className="w-full"
>
  <Plus className="h-4 w-4 mr-2" />
  Asignar Documentos Requeridos
</Button>
```

### D. Agregar el modal al final del componente

Antes del último `</div>` de cierre:

```javascript
{/* Modal de Asignación de Documentos */}
<DocumentAssignmentModal
  open={showAssignmentModal}
  onOpenChange={setShowAssignmentModal}
  employee={selectedEmployeeForAssignment}
  onAssigned={() => {
    // Recargar documentos del empleado
    if (selectedEmployee && selectedEmployeeForAssignment?.employee_id === selectedEmployee.employee_id) {
      loadEmployeeDocuments(selectedEmployee.employee_id);
    }
  }}
/>
```

---

## 🧪 PASO 4: Probar el Sistema

### 1. Iniciar el proyecto

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Navegar a Empleados

Abre http://localhost:5173/employees

### 3. Flujo de Prueba

1. **Ver empleado**: Haz clic en cualquier empleado
2. **Asignar documentos**:
   - Clic en "Asignar Documentos Requeridos"
   - Verás el modal con 2 pestañas
3. **Opción 1 - Individual**:
   - Busca y selecciona documentos
   - Cambia prioridad y fecha de vencimiento
   - Clic en "Asignar X documento(s)"
4. **Opción 2 - Plantilla**:
   - Selecciona una plantilla predefinida
   - Clic en "Asignar Plantilla"
5. **Verificar**: Los documentos deberían aparecer en la pestaña "Documentos Requeridos"

---

## 📦 Archivos Creados

```
backend/
└── routes/
    └── employeeDocumentRequirements.js  ← API REST completa

frontend/
├── src/
│   ├── services/
│   │   └── employeeDocumentService.js   ← Servicio API
│   ├── hooks/
│   │   └── useEmployeeDocuments.js      ← Hook personalizado
│   └── components/
│       └── employees/
│           └── DocumentAssignmentModal.jsx  ← Componente modal

database/
└── employee_documents_requirements.sql  ← Script SQL
```

---

## 🐛 Troubleshooting

### Error: "No se pudieron cargar los documentos"

**Solución**: Verifica que:
1. El script SQL se ejecutó correctamente
2. Las tablas existen en Supabase
3. El backend está corriendo en puerto 5000
4. Las variables de entorno están configuradas

### Error: "No se pueden subir archivos"

**Solución**: Asegúrate de:
1. Tener un bucket `documents` en Supabase Storage
2. El bucket tiene permisos públicos o políticas RLS correctas

### Error: "No hay plantillas disponibles"

**Solución**: El script SQL no crea plantillas por defecto. Puedes:
1. Crearlas desde el frontend (próxima implementación)
2. O insertar manualmente en la tabla `document_templates`

---

## 🎯 Próximos Pasos Sugeridos

Una vez que todo funcione, puedes:

1. **Refactorizar EmployeeManagement.jsx**:
   - Separar en componentes más pequeños
   - Extraer la lógica a hooks personalizados
   - Reducir de 4200 líneas a ~800 líneas

2. **Agregar más funcionalidades**:
   - Vista de documentos subidos por empleado
   - Aprobación/rechazo de documentos
   - Notificaciones automáticas de vencimiento
   - Reportes de documentos pendientes

3. **Tests**:
   - Tests unitarios para el servicio
   - Tests de integración para el hook
   - Tests E2E con Cypress

---

## 📞 Soporte

Si encuentras algún error o tienes dudas:

1. Revisa los logs de la consola del navegador
2. Revisa los logs del backend en terminal
3. Verifica que todas las tablas existan en Supabase
4. Asegúrate de que las variables de entorno están configuradas

---

## ✅ Checklist de Verificación

- [ ] Script SQL ejecutado en Supabase
- [ ] 5 tablas creadas correctamente
- [ ] 18 tipos de documentos insertados
- [ ] Backend corriendo en puerto 5000
- [ ] Frontend corriendo en puerto 5173
- [ ] Modal de asignación se abre correctamente
- [ ] Se pueden buscar y seleccionar documentos
- [ ] Se pueden asignar documentos a un empleado
- [ ] Los documentos asignados aparecen en la pestaña correspondiente

---

¡Listo! El sistema de documentos requeridos está completamente implementado y listo para usar. 🎉
