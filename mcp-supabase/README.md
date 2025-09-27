# MCP Supabase Server

Un servidor MCP (Model Context Protocol) completo para integración con Supabase que proporciona capacidades completas de CRUD, gestión de tablas, consultas SQL y operaciones de Storage.

## Características

### Operaciones CRUD
- **supabase_select**: Consultar datos con filtros, ordenación y paginación
- **supabase_insert**: Insertar nuevos registros
- **supabase_update**: Actualizar registros existentes
- **supabase_delete**: Eliminar registros

### Gestión de Esquemas
- **supabase_create_table**: Crear nuevas tablas
- **supabase_drop_table**: Eliminar tablas
- **supabase_list_tables**: Listar todas las tablas
- **supabase_describe_table**: Obtener información detallada de la estructura de una tabla

### Consultas SQL
- **supabase_sql**: Ejecutar consultas SQL directas

### Operaciones de Storage
- **supabase_storage_upload**: Subir archivos
- **supabase_storage_download**: Descargar archivos
- **supabase_storage_delete**: Eliminar archivos

## Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Copia `.env.example` a `.env` y configura:
   ```
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

3. **Función SQL opcional (recomendada):**
   Para habilitar la ejecución de SQL directo, crea esta función en tu base de datos Supabase:

   ```sql
   CREATE OR REPLACE FUNCTION exec_sql(sql_query text, sql_params json DEFAULT '[]'::json)
   RETURNS json
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
       result json;
   BEGIN
       EXECUTE sql_query INTO result USING sql_params;
       RETURN result;
   EXCEPTION
       WHEN OTHERS THEN
           RETURN json_build_object('error', SQLERRM);
   END;
   $$;
   ```

## Uso

### Iniciar el servidor:
```bash
npm start
```

### Para desarrollo con auto-reload:
```bash
npm run dev
```

## Configuración en Claude Code

Para usar este MCP server con Claude Code, agrega la siguiente configuración a tu archivo de configuración MCP:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["C:/ruta/completa/a/mcp-supabase/index.js"],
      "env": {
        "SUPABASE_URL": "https://vyhyyddvktqfjrsogwtf.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "tu_service_role_key"
      }
    }
  }
}
```

## Ejemplos de Uso

### Consultar datos:
```javascript
// Obtener todos los usuarios
await supabase_select({ table: "users", columns: "*" })

// Consulta con filtros
await supabase_select({
  table: "documents",
  columns: "id,title,created_at",
  filters: { status: "published" },
  orderBy: "created_at",
  ascending: false,
  limit: 10
})
```

### Insertar datos:
```javascript
await supabase_insert({
  table: "users",
  data: [
    { name: "Juan Pérez", email: "juan@example.com" },
    { name: "María García", email: "maria@example.com" }
  ],
  returning: "*"
})
```

### Crear tabla:
```javascript
await supabase_create_table({
  tableName: "projects",
  columns: [
    { name: "id", type: "uuid", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()" },
    { name: "name", type: "text", constraints: "NOT NULL" },
    { name: "description", type: "text" },
    { name: "created_at", type: "timestamp", constraints: "DEFAULT now()" }
  ]
})
```

## Seguridad

- Usa el **Service Role Key** que tiene permisos completos sobre tu base de datos
- Todas las operaciones utilizan la seguridad a nivel de fila (RLS) de Supabase si está configurada
- El servidor valida todos los inputs antes de ejecutar operaciones

## Requisitos del Sistema

- Node.js ≥ 18.0.0
- Acceso a una instancia de Supabase
- Service Role Key con permisos apropiados