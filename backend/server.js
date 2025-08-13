const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana de tiempo
  message: "Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.",
});
app.use(limiter);

// CORS - permitir todas las origins para desarrollo
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Logging
app.use(morgan("combined"));

// Parseo de JSON
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rutas principales (TODAS COMENTADAS)
// app.use("/api/auth", require("./routes/auth"));
// app.use("/api/users", require("./routes/users"));
// app.use("/api/documents", require("./routes/documents"));
// app.use("/api/workflows", require("./routes/workflows"));
// app.use("/api/notifications", require("./routes/notifications"));
// app.use("/api/reports", require("./routes/reports"));
// app.use("/api/audit", require("./routes/audit"));

// Ruta de salud
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Algo salió mal!",
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
