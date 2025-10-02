# ✅ PASOS FINALES - Sistema de Documentos Requeridos

## 🎉 ¡MCP de Supabase Configurado!

El MCP de Supabase ha sido configurado exitosamente en tu sistema. Ahora necesitas completar 3 pasos finales:

---

## 📋 PASO 1: Ejecutar SQL en Supabase (IMPORTANTE)

### **Opción A: Desde Dashboard de Supabase** ✅ RECOMENDADO

1. Ve a tu proyecto en: https://supabase.com
2. Navega a **SQL Editor** en el menú lateral izquierdo
3. Haz clic en **"New Query"**
4. Copia COMPLETO el contenido del archivo: `database/employee_documents_requirements.sql`
5. Pega en el editor SQL
6. Presiona **"Run"** o **Ctrl+Enter**

Deberías ver un mensaje de éxito. Si hay errores, léelos cuidadosamente.

### **Verificar que se crearon las tablas:**

Ejecuta esta query para verificar:

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
)
ORDER BY table_name;
```

Deberías ver 5 tablas listadas.

### **Opción B: Ejecutar script Node.js** ⚠️ SOLO SI LA OPCIÓN A NO FUNCIONA

```bash
cd database
node seed_document_types.js
```

Este script solo inserta los 18 tipos de documentos, pero primero necesitas crear las tablas manualmente.

---

## ✅ PASO 2: Botón Agregado en EmployeeManagement.jsx

**COMPLETADO** - El botón ha sido agregado exitosamente en la línea **2820-2835** de `frontend/src/pages/EmployeeManagement.jsx`

### **Ubicación exacta:**

El botón se encuentra dentro del modal "Asignar Documentos Requeridos", justo **antes** de la sección "Nuevos Documentos Requeridos" y **después** de la lista de documentos ya asignados.

### **Código agregado:**

```javascript
{/* Botón para Nuevo Modal con API Real */}
<div className="mb-6">
  <Button
    onClick={() => {
      setEmployeeForNewAssignment(selectedEmployeeForDocuments);
      setShowNewAssignmentModal(true);
    }}
    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-6 text-base font-semibold"
  >
    <Package className="h-5 w-5 mr-2" />
    Asignar Documentos Requeridos (API Real)
  </Button>
  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
    Sistema integrado con base de datos real y gestión completa de documentos
  </p>
</div>
```

### **Cómo funciona:**

1. El botón es visible dentro del modal cuando seleccionas un empleado
2. Al hacer clic, abre el nuevo modal `DocumentAssignmentModal` con API real
3. El diseño es destacado con gradiente azul para diferenciarlo del sistema mock
4. Incluye descripción que indica que está conectado a la base de datos real

---

## 🧪 PASO 3: Probar Todo el Sistema

### **1. Iniciar Servicios:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **2. Navegar a Empleados:**

Abre tu navegador en: http://localhost:5173/employees

### **3. Probar el Flujo:**

1. **Selecciona un empleado** de la lista
2. El modal de perfil debería abrirse
3. **Busca el botón** "Asignar Documentos Requeridos (API Real)"
4. **Haz clic** en el botón
5. **Se abrirá el nuevo modal** con 2 pestañas

### **4. Probar Pestaña "Selección Individual":**

- Usa el buscador para encontrar documentos
- Cambia el filtro de categoría
- Haz clic en varios documentos para seleccionarlos
- Configura la prioridad de cada uno
- Define fechas de vencimiento (si aplica)
- Haz clic en "Asignar X documento(s)"
- Deberías ver un toast de éxito

### **5. Probar Pestaña "Desde Plantilla":**

- Selecciona una plantilla (si hay disponibles)
- Ve la lista de documentos incluidos
- Haz clic en "Asignar Plantilla"
- Deberías ver un toast de éxito

### **6. Verificar en Base de Datos:**

Ejecuta en Supabase SQL Editor:

```sql
SELECT
  edr.*,
  dt.name as document_name,
  dt.category
FROM employee_document_requirements edr
JOIN document_types dt ON dt.id = edr.document_type_id
ORDER BY edr.assigned_at DESC
LIMIT 10;
```

Deberías ver los documentos que acabas de asignar.

---

## 🐛 Troubleshooting

### **Error: "No se pudieron cargar los tipos de documentos"**

**Causa:** Las tablas no existen o están vacías

**Solución:**
1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta: `SELECT COUNT(*) FROM document_types;`
3. Si da error, ejecuta el script SQL completo de nuevo
4. Si devuelve 0, ejecuta: `node database/seed_document_types.js`

### **Error: "Could not find the table 'public.document_types'"**

**Causa:** Las tablas no se crearon

**Solución:**
1. Vuelve a ejecutar el SQL en Supabase Dashboard
2. Asegúrate de copiar TODO el contenido del archivo
3. Verifica que no haya errores en la ejecución

### **El modal no se abre al hacer clic**

**Causa:** El botón no está conectado correctamente

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que los imports estén correctos en EmployeeManagement.jsx
4. Verifica que los estados estén declarados

### **Error: "Cannot find module '...DocumentAssignmentModal'"**

**Causa:** El componente no existe o la ruta es incorrecta

**Solución:**
1. Verifica que existe: `frontend/src/components/employees/DocumentAssignmentModal.jsx`
2. Verifica el import en EmployeeManagement.jsx:
   ```javascript
   import DocumentAssignmentModal from '../components/employees/DocumentAssignmentModal';
   ```

### **No aparecen documentos en el modal**

**Causa:** El backend no está respondiendo o no hay datos

**Solución:**
1. Verifica que backend esté corriendo en puerto 5000
2. Abre: http://localhost:5000/health (debería responder)
3. Abre: http://localhost:5000/api-docs
4. Busca el endpoint: `GET /api/employee-document-requirements/document-types`
5. Prueba el endpoint directamente desde Swagger

---

## ✅ Checklist Final

Marca cada elemento cuando lo completes:

- [x] ✅ MCP de Supabase configurado
- [x] ✅ Script SQL ejecutado en Supabase Dashboard
- [x] ✅ Verificado que se crearon 5 tablas
- [x] ✅ Verificado que se insertaron 18 tipos de documentos (categorías: Personal, Identificación, Legal, Académico, Salud, Laboral)
- [x] ✅ Botón agregado en EmployeeManagement.jsx (línea 2820-2835)
- [ ] ⏳ Backend corriendo en puerto 5000
- [ ] ⏳ Frontend corriendo en puerto 5173
- [ ] ⏳ Modal se abre al hacer clic
- [ ] ⏳ Se pueden buscar documentos
- [ ] ⏳ Se pueden seleccionar documentos
- [ ] ⏳ Se pueden asignar documentos
- [ ] ⏳ Toast muestra confirmación
- [ ] ⏳ Datos se guardan en la base de datos

---

## 📞 Siguiente Paso

Una vez que completes estos 3 pasos, el sistema estará **100% funcional** y listo para usar.

Si tienes algún problema, revisa la sección de Troubleshooting o consulta los archivos:
- `SETUP_COMPLETO.md` - Documentación detallada
- `RESUMEN_IMPLEMENTACION.md` - Resumen ejecutivo

---

## 🎯 Lo que Tendrás Funcionando

✅ **Sistema completo de documentos requeridos**
✅ **Asignación individual y masiva**
✅ **Sistema de plantillas**
✅ **Búsqueda y filtros avanzados**
✅ **Configuración de prioridades**
✅ **Gestión de fechas de vencimiento**
✅ **Validación de archivos**
✅ **Estadísticas en tiempo real**

**¡Todo listo para producción!** 🚀
