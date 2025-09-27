const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Middleware para verificar JWT
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth attempt:', { 
      method: req.method, 
      path: req.path, 
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
    });
    
    // Verificar que el header de autorización esté presente
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid auth header');
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'MISSING_TOKEN',
        message: 'Debe incluir el header Authorization: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar que el token no esté vacío
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'EMPTY_TOKEN' 
      });
    }
    
    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Determinar el tipo de error específico
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Token inválido o expirado';
      
      if (error?.message?.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'El token ha expirado, por favor inicie sesión nuevamente';
      } else if (error?.message?.includes('invalid')) {
        errorCode = 'TOKEN_INVALID';
        errorMessage = 'Token inválido';
      }
      
      return res.status(401).json({ 
        error: errorMessage,
        code: errorCode
      });
    }

    // Verificar que el usuario esté activo
    if (user.banned_until || user.email_confirmed_at === null) {
      return res.status(403).json({ 
        error: 'Cuenta de usuario inactiva o no verificada',
        code: 'USER_INACTIVE'
      });
    }

    // Determinar el rol basado en el email (mismo patrón que el frontend)
    let role = 'viewer';
    if (user.email === 'admin@mineduc.gob.gt') {
      role = 'admin';
    } else if (user.email === 'editor@mineduc.gob.gt') {
      role = 'editor';
    }

    // Crear perfil por defecto usando información de Supabase
    const userProfile = {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || 'Usuario',
      last_name: user.user_metadata?.last_name || 'MINEDUC',
      role: role,
      is_active: true,
      department: role === 'admin' ? 'TI' : 'General',
      position: role === 'admin' ? 'Administrador' : 'Usuario',
      employee_id: role === 'admin' ? 'MIN25001' : `MIN${Date.now().toString().slice(-5)}`,
      phone: '+502 2411-9595'
    };

    req.user = {
      ...user,
      profile: userProfile
    };
    
    // Log de acceso exitoso (opcional en desarrollo)
    if (process.env.NODE_ENV === 'production') {
      console.log(`Acceso autorizado: ${user.email} (${userProfile.role}) - ${req.method} ${req.path}`);
    }
    
    next();
  } catch (error) {
    console.error('Error en verificación de token:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(401).json({ 
      error: 'Error interno en la verificación del token',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware opcional para verificar token sin fallar
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        // Determinar el rol basado en el email
        let role = 'viewer';
        if (user.email === 'admin@mineduc.gob.gt') {
          role = 'admin';
        } else if (user.email === 'editor@mineduc.gob.gt') {
          role = 'editor';
        }

        const userProfile = {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || 'Usuario',
          last_name: user.user_metadata?.last_name || 'MINEDUC',
          role: role,
          is_active: true,
          department: role === 'admin' ? 'TI' : 'General',
          position: role === 'admin' ? 'Administrador' : 'Usuario'
        };

        req.user = { ...user, profile: userProfile };
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, continuar sin usuario autenticado
    next();
  }
};

// Middleware para verificar roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profile) {
      return res.status(403).json({ error: 'Acceso denegado: perfil de usuario no encontrado' });
    }

    const userRole = req.user.profile.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acceso denegado: permisos insuficientes',
        required: roles,
        current: userRole
      });
    }
    
    next();
  };
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profile) {
      return res.status(403).json({ error: 'Acceso denegado: perfil de usuario no encontrado' });
    }

    const userPermissions = req.user.profile.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Acceso denegado: permiso específico requerido',
        required: permission
      });
    }
    
    next();
  };
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requirePermission
};
