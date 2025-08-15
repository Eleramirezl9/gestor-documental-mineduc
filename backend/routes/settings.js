const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Configuración predeterminada del sistema
let systemSettings = {
  general: {
    site_name: 'MINEDUC Document Management',
    site_description: 'Sistema de gestión documental del Ministerio de Educación',
    contact_email: 'admin@mineduc.gob.gt',
    max_file_size: 10,
    allowed_file_types: 'pdf,doc,docx,jpg,png,xlsx'
  },
  security: {
    session_timeout: 60,
    max_login_attempts: 5,
    password_min_length: 8,
    require_two_factor: false,
    auto_logout_inactive: true
  },
  notifications: {
    email_enabled: true,
    document_approval_notifications: true,
    user_registration_notifications: true,
    system_alerts: true,
    daily_reports: false
  },
  storage: {
    storage_provider: 'local',
    backup_frequency: 'daily',
    retention_period: 365,
    auto_cleanup: true
  },
  integrations: {
    ai_classification_enabled: true,
    ocr_enabled: true,
    api_rate_limit: 1000,
    webhook_url: ''
  }
};

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Obtener configuración del sistema
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        settings: systemSettings
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Actualizar configuración del sistema
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 */
router.put('/', verifyToken, async (req, res) => {
  try {
    const newSettings = req.body;
    
    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Configuración inválida'
      });
    }

    systemSettings = {
      ...systemSettings,
      ...newSettings
    };

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: {
        settings: systemSettings
      }
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/settings/reset:
 *   post:
 *     summary: Restablecer configuración a valores predeterminados
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración restablecida exitosamente
 */
router.post('/reset', verifyToken, async (req, res) => {
  try {
    systemSettings = {
      general: {
        site_name: 'MINEDUC Document Management',
        site_description: 'Sistema de gestión documental del Ministerio de Educación',
        contact_email: 'admin@mineduc.gob.gt',
        max_file_size: 10,
        allowed_file_types: 'pdf,doc,docx,jpg,png,xlsx'
      },
      security: {
        session_timeout: 60,
        max_login_attempts: 5,
        password_min_length: 8,
        require_two_factor: false,
        auto_logout_inactive: true
      },
      notifications: {
        email_enabled: true,
        document_approval_notifications: true,
        user_registration_notifications: true,
        system_alerts: true,
        daily_reports: false
      },
      storage: {
        storage_provider: 'local',
        backup_frequency: 'daily',
        retention_period: 365,
        auto_cleanup: true
      },
      integrations: {
        ai_classification_enabled: true,
        ocr_enabled: true,
        api_rate_limit: 1000,
        webhook_url: ''
      }
    };

    res.json({
      success: true,
      message: 'Configuración restablecida exitosamente',
      data: {
        settings: systemSettings
      }
    });
  } catch (error) {
    console.error('Error al restablecer configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/settings/system-status:
 *   get:
 *     summary: Obtener estado del sistema
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del sistema obtenido exitosamente
 */
router.get('/system-status', verifyToken, async (req, res) => {
  try {
    const status = {
      server: 'online',
      database: 'connected',
      storage: '75% used',
      last_sync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error al obtener estado del sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;