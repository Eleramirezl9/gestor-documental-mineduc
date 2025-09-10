# 📜 Scripts de Gestión - MINEDUC

Este directorio contiene scripts para gestionar y verificar el Sistema de Gestión Documental MINEDUC.

## 📋 Scripts Disponibles

### 🔍 Verificación y Testing

#### `simple-verify.mjs` ⭐ **RECOMENDADO**
```bash
node scripts/simple-verify.mjs
```
- **Sin dependencias externas** - Usa fetch nativo
- Verificación rápida del estado del sistema
- Perfecto para verificación diaria

#### `verify-deployment-fixed.js`
```bash
node scripts/verify-deployment-fixed.js
```
- Verificación completa con axios
- Incluye tests de CORS y endpoints
- Reporte detallado del despliegue

#### `test-supabase-fixed.cjs`
```bash
node scripts/test-supabase-fixed.cjs
```
- Test exhaustivo de la conexión a Supabase
- Verifica tablas, storage, auth y RLS
- Diagnosticos detallados de problemas

### 🛠️ Gestión de Supabase

#### `supabase-manager.mjs`
```bash
# Ver estado
node scripts/supabase-manager.mjs status

# Crear usuarios de prueba
node scripts/supabase-manager.mjs create-users

# Configurar storage
node scripts/supabase-manager.mjs setup-storage

# Probar conexión
node scripts/supabase-manager.mjs test
```

### 🚨 Scripts Legacy (Ignorados por ESLint)

Los siguientes scripts están en `.eslintignore` para evitar errores:
- `verify-deployment.js` ❌ (usar `verify-deployment-fixed.cjs`)
- `test-supabase-connection.js` ❌ (usar `test-supabase-fixed.cjs`)
- `test-supabase-fixed.js` ❌ (usar `test-supabase-fixed.cjs`)
- `supabase-manager.js` ❌ (usar `supabase-manager.mjs`)

## 🎯 Guía de Uso por Escenario

### 🚀 Primera vez configurando el sistema
1. Verificar variables de entorno: `node scripts/test-supabase-fixed.cjs`
2. Verificar despliegue: `node scripts/verify-deployment-fixed.cjs`
3. Crear usuarios de prueba: `node scripts/supabase-manager.mjs create-users`

### 📊 Verificación diaria/rutinaria
```bash
node scripts/simple-verify.mjs
```

### 🔧 Troubleshooting problemas
1. Test completo de Supabase: `node scripts/test-supabase-fixed.cjs`
2. Verificar estado: `node scripts/supabase-manager.mjs status`
3. Test completo de despliegue: `node scripts/verify-deployment-fixed.cjs`

### 👥 Gestión de usuarios
```bash
# Ver estado
node scripts/supabase-manager.mjs status

# Crear usuarios de prueba
node scripts/supabase-manager.mjs create-users
```

## 🔧 Configuración de ESLint

Para evitar errores de ESLint en los scripts:

1. **Scripts CommonJS** (`.js`): Usan `require()` y `module.exports`
2. **Scripts ES Modules** (`.mjs`): Usan `import` y `export`
3. **Configuración ESLint**: Archivo `.eslintrc.json` configurado para ambos tipos

## 📂 Estructura de Archivos

```
scripts/
├── .eslintrc.json           # Configuración ESLint para scripts
├── README.md               # Esta guía
├── simple-verify.mjs       # ⭐ Verificación simple (sin deps)
├── verify-deployment-fixed.js    # Verificación completa de despliegue
├── test-supabase-fixed.js        # Test completo de Supabase
├── supabase-manager.mjs          # Gestor de Supabase
└── [legacy scripts...]           # Scripts con problemas ESLint
```

## 🚨 Troubleshooting

### Error: "require is not defined"
- **Problema**: Mezclando CommonJS en contexto ES module
- **Solución**: Usar los scripts con sufijo `-fixed.js` o `.mjs`

### Error: "Variables de entorno faltantes"
- **Problema**: Variables de Supabase no configuradas
- **Solución**: Verificar `.env` en backend con:
  ```
  SUPABASE_URL=
  SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

### Error: "Tabla no encontrada"
- **Problema**: Esquema de BD no ejecutado
- **Solución**: Ejecutar `database/schema.sql` en Supabase SQL Editor

## 🎯 URLs del Sistema

- **Frontend**: https://gestor-documental-mineduc.vercel.app
- **Backend**: https://gestor-documental-mineduc-backend.onrender.com
- **API Docs**: https://gestor-documental-mineduc-backend.onrender.com/api-docs

## 👥 Usuarios de Prueba

- **Admin**: admin@mineduc.gob.gt / admin123456
- **Editor**: editor@mineduc.gob.gt / editor123456
- **Viewer**: viewer@mineduc.gob.gt / viewer123456

---

💡 **Tip**: Para verificación rápida diaria, usa `node scripts/simple-verify.mjs`