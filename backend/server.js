const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MINEDUC Document Management API",
      version: "1.0.0",
      description: "API REST para el Sistema de Gestión Documental del Ministerio de Educación de Guatemala",
      contact: {
        name: "MINEDUC Development Team",
        email: "dev@mineduc.gob.gt"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.API_BASE_URL || "https://gestor-documental-mineduc-backend.onrender.com"
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' ? "Servidor de Producción" : "Servidor de Desarrollo"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Mensaje de error"
            },
            message: {
              type: "string",
              description: "Descripción detallada del error"
            }
          }
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID único del usuario"
            },
            email: {
              type: "string",
              format: "email",
              description: "Correo electrónico del usuario"
            },
            role: {
              type: "string",
              enum: ["admin", "editor", "viewer"],
              description: "Rol del usuario"
            },
            profile: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                phone: { type: "string" },
                department: { type: "string" },
                position: { type: "string" }
              }
            }
          }
        },
        ValidationError: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Mensaje de éxito"
            },
            data: {
              type: "object",
              description: "Datos de la respuesta"
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ["./routes/*.js", "./server.js"]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware de seguridad
app.use(helmet());

// Rate limiting - diferentes límites para diferentes rutas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: "Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite más estricto para autenticación
  message: { error: "Demasiados intentos de autenticación, intenta de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use('/api/auth', authLimiter);

// CORS - configuración dinámica para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://gestor-documental-mineduc.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true); // Permitir todo en desarrollo
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por política CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Logging
app.use(morgan("combined"));

// Parseo de JSON con límites de seguridad
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || "50mb",
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || "50mb",
  parameterLimit: 1000
}));

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: "MINEDUC API Documentation",
  customCss: `
    .topbar-wrapper img { content: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='); }
    .swagger-ui .topbar { background-color: #1976d2; }
    .swagger-ui .auth-wrapper { margin-bottom: 20px; }
    .swagger-ui .auth-container .auth-btn-wrapper { margin-top: 10px; }
    .swagger-ui .info { margin-bottom: 30px; }
    .auth-instructions {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
    }
  `,
  customJsStr: `
    // Agregar instrucciones de autenticación
    window.onload = function() {
      setTimeout(function() {
        const infoSection = document.querySelector('.swagger-ui .info');
        if (infoSection && !document.querySelector('.auth-instructions')) {
          const authInstructions = document.createElement('div');
          authInstructions.className = 'auth-instructions';
          authInstructions.innerHTML = \`
            <h4>🔐 Cómo usar la autenticación JWT:</h4>
            <ol>
              <li>Primero, haz login en <strong>POST /api/auth/login</strong> con tu email y contraseña</li>
              <li>Copia el token de la respuesta</li>
              <li>Haz clic en el botón <strong>"Authorize"</strong> arriba</li>
              <li>Ingresa el token (no agregues "Bearer ", se agrega automáticamente)</li>
              <li>Ahora puedes usar todas las rutas protegidas</li>
            </ol>
            <p><strong>Usuarios de prueba:</strong></p>
            <ul>
              <li>Admin: admin@mineduc.gob.gt</li>
              <li>Editor: editor@mineduc.gob.gt</li>
              <li>Viewer: viewer@mineduc.gob.gt</li>
            </ul>
          \`;
          infoSection.parentNode.insertBefore(authInstructions, infoSection.nextSibling);
        }
      }, 1000);
    };
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
    requestInterceptor: function(req) {
      // Log para debug en desarrollo
      if (window.location.hostname === 'localhost') {
        console.log('Swagger Request:', req);
      }
      return req;
    }
  }
}));

// Rutas principales
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/workflows", require("./routes/workflows"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/settings", require("./routes/settings"));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar el estado de salud del servidor
 *     description: Endpoint para verificar que el servidor está funcionando correctamente
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-14T10:30:00.000Z"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });
  
  // Errores específicos
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Formato de datos inválido'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Archivo demasiado grande'
    });
  }
  
  res.status(err.status || 500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : "Error interno del servidor",
  });
});

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
