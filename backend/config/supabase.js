const { createClient } = require("@supabase/supabase-js");

// Validar variables de entorno críticas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error("❌ Error crítico: Supabase environment variables are not set.");
  console.error("Variables requeridas: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // Fallar inmediatamente en producción
  }
}

// Cliente para operaciones de autenticación (usa anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Cliente administrativo para operaciones de backend (usa service role)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Función helper para verificar conexión a Supabase
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Conexión a Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a Supabase:', error.message);
    return false;
  }
};

// Log de configuración en desarrollo
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Configuración Supabase:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NO CONFIGURADA',
    anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NO CONFIGURADA',
    serviceKey: supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 20)}...` : 'NO CONFIGURADA'
  });
}

module.exports = { 
  supabase, 
  supabaseAdmin, 
  testConnection 
};
