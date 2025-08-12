# Sistema de Gestión Documental MINEDUC

Sistema completo de gestión documental para el Ministerio de Educación de Guatemala, desarrollado con tecnologías modernas y arquitectura escalable.

## 🚀 Características Principales

- **Gestión Completa de Documentos**: Subida, categorización, versionado y búsqueda avanzada
- **Flujos de Aprobación**: Workflows configurables para revisión y aprobación de documentos
- **Autenticación Segura**: Sistema de autenticación robusto con roles y permisos
- **IA Integrada**: Clasificación automática de documentos usando OpenAI
- **OCR Avanzado**: Extracción de texto de imágenes y PDFs
- **Auditoría Completa**: Registro detallado de todas las acciones del sistema
- **Notificaciones**: Sistema de notificaciones en tiempo real y por email
- **Reportes**: Generación de reportes ejecutivos y exportación de datos
- **Responsive Design**: Interfaz adaptable para desktop y móvil

## 🏗️ Arquitectura

### Frontend
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes
- **React Router** para navegación
- **React Hook Form** para formularios
- **Recharts** para gráficos
- **Framer Motion** para animaciones

### Backend
- **Node.js** con Express
- **Supabase** para base de datos PostgreSQL
- **JWT** para autenticación
- **Multer** para subida de archivos
- **Tesseract.js** para OCR
- **OpenAI API** para clasificación IA
- **Nodemailer** para emails

### Base de Datos
- **PostgreSQL** en Supabase
- **Row Level Security (RLS)**
- **Funciones y triggers** personalizados
- **Índices optimizados** para búsqueda

## 📦 Estructura del Proyecto

```
gestor-documental-mineduc/
├── backend/                 # API Backend (Node.js/Express)
│   ├── config/             # Configuraciones
│   ├── middleware/         # Middlewares personalizados
│   ├── routes/             # Rutas de la API
│   ├── services/           # Servicios de negocio
│   ├── uploads/            # Archivos temporales
│   ├── server.js           # Punto de entrada
│   └── package.json
├── frontend/               # Frontend (React)
│   └── gestor-documental-frontend/
│       ├── src/
│       │   ├── components/ # Componentes React
│       │   ├── pages/      # Páginas principales
│       │   ├── hooks/      # Hooks personalizados
│       │   ├── lib/        # Utilidades y configuraciones
│       │   └── assets/     # Recursos estáticos
│       ├── public/         # Archivos públicos
│       └── package.json
├── database/               # Scripts de base de datos
│   ├── schema.sql          # Esquema completo
│   ├── seed.sql            # Datos de prueba
│   └── README.md           # Documentación de BD
└── README.md               # Este archivo
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta en Supabase
- Cuenta en OpenAI (opcional, para IA)
- Cuenta de email para notificaciones

### 1. Configurar Base de Datos

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script `database/schema.sql` en el editor SQL
3. Configura el bucket de Storage llamado `documents`
4. Anota la URL del proyecto y las claves API

### 2. Configurar Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con tus configuraciones:

```env
# Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion

# OpenAI (opcional)
OPENAI_API_KEY=tu_clave_openai
```

### 3. Configurar Frontend

```bash
cd frontend/gestor-documental-frontend
npm install
cp .env.example .env
```

Edita `.env` con tus configuraciones:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Ejecutar en Desarrollo

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend/gestor-documental-frontend
npm run dev
```

El frontend estará disponible en `http://localhost:3000` y el backend en `http://localhost:5000`.

## 🚀 Despliegue

### Backend en Render

1. Conecta tu repositorio a [Render](https://render.com)
2. Crea un nuevo Web Service
3. Configura las variables de entorno según `.env.example`
4. El servicio se desplegará automáticamente

### Frontend en Vercel

1. Conecta tu repositorio a [Vercel](https://vercel.com)
2. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (URL de tu backend en Render)
3. El sitio se desplegará automáticamente

## 👥 Usuarios de Prueba

Después de ejecutar `database/seed.sql`, tendrás estos usuarios:

- **Admin**: admin@mineduc.gob.gt
- **Editor**: editor@mineduc.gob.gt  
- **Viewer**: viewer@mineduc.gob.gt

**Nota**: Debes crear estos usuarios en Supabase Auth y actualizar los UUIDs en `seed.sql`.

## 📚 Documentación de API

### Endpoints Principales

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/documents` - Listar documentos
- `POST /api/documents` - Crear documento
- `POST /api/documents/:id/upload` - Subir archivo
- `GET /api/workflows` - Listar workflows
- `POST /api/workflows` - Crear workflow
- `GET /api/notifications` - Listar notificaciones
- `GET /api/reports/documents` - Reporte de documentos
- `GET /api/audit` - Logs de auditoría

### Autenticación

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer <token_jwt>
```

## 🔒 Seguridad

- **Autenticación JWT** con Supabase
- **Row Level Security** en base de datos
- **Rate limiting** en API
- **Validación de entrada** en todos los endpoints
- **Sanitización de archivos** subidos
- **Logs de auditoría** completos
- **CORS configurado** correctamente

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend/gestor-documental-frontend
npm test
```

## 📊 Monitoreo

El sistema incluye:

- **Health check** endpoint (`/health`)
- **Logs estructurados** con Morgan
- **Métricas de rendimiento**
- **Alertas automáticas**
- **Dashboard de auditoría**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- **Email**: soporte@mineduc.gob.gt
- **Documentación**: Ver carpeta `database/` para detalles de BD
- **Issues**: Usar el sistema de issues de GitHub

## 🔄 Changelog

### v1.0.0 (2024-12-08)
- ✅ Sistema completo de gestión documental
- ✅ Autenticación y autorización
- ✅ Flujos de aprobación
- ✅ Integración con IA
- ✅ OCR para documentos
- ✅ Sistema de notificaciones
- ✅ Reportes y auditoría
- ✅ Despliegue en Render y Vercel

---

**Desarrollado con ❤️ para el Ministerio de Educación de Guatemala**

