# Base de Datos - Sistema de Gestión Documental MINEDUC

## Descripción

Este directorio contiene los scripts SQL necesarios para configurar la base de datos PostgreSQL en Supabase para el Sistema de Gestión Documental del MINEDUC.

## Archivos

- `schema.sql` - Esquema completo de la base de datos con todas las tablas, índices, funciones y políticas RLS
- `seed.sql` - Datos de prueba para desarrollo y testing
- `README.md` - Este archivo de documentación

## Configuración en Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una nueva cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota la URL del proyecto y las claves API

### 2. Ejecutar el Esquema

1. Ve al editor SQL en tu dashboard de Supabase
2. Copia y pega el contenido de `schema.sql`
3. Ejecuta el script completo
4. Verifica que todas las tablas se hayan creado correctamente

### 3. Configurar Autenticación

1. En Supabase, ve a Authentication > Settings
2. Configura los providers de autenticación necesarios
3. Ajusta las configuraciones de seguridad según tus necesidades

### 4. Configurar Storage

1. Ve a Storage en tu dashboard de Supabase
2. Crea un bucket llamado `documents`
3. Configura las políticas de acceso para el bucket:

```sql
-- Política para permitir subida de archivos a usuarios autenticados
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir descarga de archivos
CREATE POLICY "Users can download documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir actualización de archivos por el propietario
CREATE POLICY "Users can update their documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5. Cargar Datos de Prueba (Opcional)

1. **IMPORTANTE**: Antes de ejecutar `seed.sql`, debes crear usuarios de prueba en Supabase Auth
2. Crea los siguientes usuarios en Authentication > Users:
   - admin@mineduc.gob.gt
   - editor@mineduc.gob.gt
   - viewer@mineduc.gob.gt
3. Anota los UUIDs generados para cada usuario
4. Edita `seed.sql` y reemplaza los UUIDs de ejemplo con los reales
5. Ejecuta el script `seed.sql` en el editor SQL

## Estructura de la Base de Datos

### Tablas Principales

- **user_profiles** - Perfiles extendidos de usuarios
- **documents** - Documentos del sistema
- **document_categories** - Categorías de documentos
- **document_versions** - Historial de versiones
- **workflows** - Flujos de aprobación
- **workflow_steps** - Pasos de los flujos
- **notifications** - Sistema de notificaciones
- **audit_logs** - Registro de auditoría
- **system_settings** - Configuraciones del sistema

### Características Importantes

- **Row Level Security (RLS)** habilitado en tablas sensibles
- **Índices optimizados** para búsquedas de texto completo
- **Triggers automáticos** para actualizar timestamps
- **Funciones personalizadas** para estadísticas
- **Vistas** para consultas complejas

## Variables de Entorno

Asegúrate de configurar las siguientes variables en tu backend:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
```

## Políticas de Seguridad

El sistema implementa Row Level Security (RLS) con las siguientes políticas:

- Los usuarios solo pueden ver sus propios perfiles
- Los administradores pueden ver todos los perfiles
- Los usuarios pueden ver documentos que crearon o documentos públicos aprobados
- Las notificaciones son privadas para cada usuario
- Los logs de auditoría tienen acceso restringido

## Mantenimiento

### Respaldos

Supabase realiza respaldos automáticos, pero se recomienda:

1. Configurar respaldos adicionales para datos críticos
2. Exportar regularmente la estructura de la base de datos
3. Mantener copias de los scripts SQL actualizados

### Monitoreo

Monitorea regularmente:

- Uso de almacenamiento
- Rendimiento de consultas
- Logs de errores
- Actividad de usuarios

### Actualizaciones

Para actualizar el esquema:

1. Crea scripts de migración incrementales
2. Prueba en un entorno de desarrollo primero
3. Realiza respaldos antes de aplicar cambios
4. Documenta todos los cambios realizados

## Solución de Problemas

### Errores Comunes

1. **Error de permisos RLS**: Verifica que las políticas estén configuradas correctamente
2. **Usuarios no pueden autenticarse**: Revisa la configuración de Authentication
3. **Archivos no se suben**: Verifica las políticas del bucket de Storage
4. **Consultas lentas**: Revisa que los índices estén creados correctamente

### Logs y Debugging

- Usa el dashboard de Supabase para ver logs en tiempo real
- Revisa la tabla `audit_logs` para rastrear actividad
- Usa `EXPLAIN ANALYZE` para optimizar consultas lentas

## Contacto

Para soporte técnico o preguntas sobre la base de datos, contacta al equipo de desarrollo.

