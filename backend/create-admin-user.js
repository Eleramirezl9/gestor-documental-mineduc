const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  try {
    console.log('🔍 Verificando usuario admin@mineduc.gob.gt...');

    // Verificar si ya existe el perfil
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', 'admin@mineduc.gob.gt')
      .single();

    if (existingProfile) {
      console.log('✅ Usuario admin ya existe:', existingProfile);
      if (existingProfile.role !== 'admin') {
        console.log('🔧 Actualizando rol a admin...');
        const { data, error } = await supabaseAdmin
          .from('user_profiles')
          .update({ role: 'admin' })
          .eq('email', 'admin@mineduc.gob.gt')
          .select();

        if (error) {
          console.error('❌ Error actualizando rol:', error);
        } else {
          console.log('✅ Rol actualizado exitosamente:', data);
        }
      }
      return;
    }

    console.log('👤 Usuario admin no existe, creándolo...');

    // Verificar si existe en auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    const adminUser = authUsers.users.find(u => u.email === 'admin@mineduc.gob.gt');

    if (!adminUser) {
      console.log('❌ Usuario admin@mineduc.gob.gt no existe en auth.users');
      console.log('📝 Por favor, crea el usuario primero en Supabase Auth o regístrate en la app');
      return;
    }

    // Crear perfil para usuario admin existente
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: adminUser.id,
        email: 'admin@mineduc.gob.gt',
        first_name: 'Administrador',
        last_name: 'Sistema',
        role: 'admin',
        employee_id: 'MIN25-ADMIN',
        position: 'Administrador del Sistema',
        department: 'TI',
        hire_date: new Date().toISOString().split('T')[0],
        contract_type: 'permanent',
        is_active: true
      })
      .select();

    if (createError) {
      console.error('❌ Error creando perfil de admin:', createError);
    } else {
      console.log('✅ Perfil de admin creado exitosamente:', newProfile);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createAdminUser().then(() => {
  console.log('🏁 Proceso completado');
  process.exit(0);
});