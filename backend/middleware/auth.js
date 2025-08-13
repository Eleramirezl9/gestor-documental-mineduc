const jwt = require('jsonwebtoken');
const { supabase } = require('backend/config/supabase');

// Middleware para verificar JWT
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.substring(7);
    
    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener información adicional del usuario desde la base de datos
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil de usuario:', profileError);
    }

    req.user = {
      ...user,
      profile: userProfile
    };
    
    next();
  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(401).json({ error: 'Token inválido' });
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
  requireRole,
  requirePermission
};

