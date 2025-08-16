// Health check básico para verificar que el servidor puede iniciar
require('dotenv').config();

console.log('🏥 Health Check - Sistema de Notificaciones\n');

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

console.log('🔐 Variables de entorno:');
let envOk = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar} - Configurada`);
  } else {
    console.log(`❌ ${envVar} - FALTA`);
    envOk = false;
  }
});

// Verificar dependencias críticas
console.log('\n📦 Dependencias críticas:');
const criticalDeps = ['axios', 'nodemailer', 'express', '@supabase/supabase-js'];
let depsOk = true;

criticalDeps.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - Disponible`);
  } catch (error) {
    console.log(`❌ ${dep} - FALTA`);
    depsOk = false;
  }
});

console.log(`\n🎯 Estado general: ${envOk && depsOk ? '✅ LISTO' : '❌ PROBLEMAS'}`);

if (envOk && depsOk) {
  console.log('🚀 El servidor puede iniciarse correctamente');
} else {
  console.log('⚠️  Hay problemas de configuración');
}

console.log('\n💡 Para producción en Render:');
console.log('   - Todas las variables de entorno deben estar configuradas');
console.log('   - axios debe estar en dependencies (no devDependencies)'); 
console.log('   - El servidor debe poder acceder a Supabase');