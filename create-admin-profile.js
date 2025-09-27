#!/usr/bin/env node

/**
 * Script para crear un perfil de administrador en la tabla user_profiles
 * Uso: node create-admin-profile.js <user_id> [email]
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: './backend/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminProfile() {
  try {
    console.log('🔍 Buscando usuarios autenticados...')

    // Listar usuarios de auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error obteniendo usuarios:', authError.message)
      return
    }

    console.log(`✅ Encontrados ${authUsers.users.length} usuarios en auth.users`)

    if (authUsers.users.length === 0) {
      console.log('ℹ️ No hay usuarios autenticados. Primero inicia sesión en la aplicación.')
      return
    }

    // Mostrar usuarios disponibles
    authUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`)
    })

    // Buscar el usuario admin específicamente
    const targetUser = authUsers.users.find(user => user.email === 'admin@mineduc.gob.gt') || authUsers.users[0]
    console.log(`🎯 Creando perfil admin para: ${targetUser.email}`)

    // Verificar si ya existe un perfil
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single()

    if (existingProfile) {
      console.log('ℹ️ El usuario ya tiene un perfil. Actualizando rol a admin...')

      const { data: updated, error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', targetUser.id)

      if (updateError) {
        console.error('❌ Error actualizando perfil:', updateError.message)
        return
      }

      console.log('✅ Perfil actualizado a admin exitosamente')
      return
    }

    // Crear nuevo perfil
    const profileData = {
      id: targetUser.id,
      email: targetUser.email,
      first_name: 'Administrador',
      last_name: 'MINEDUC',
      role: 'admin',
      department: 'TI',
      phone: '+502 2411-9595',
      is_active: true
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()

    if (insertError) {
      console.error('❌ Error creando perfil:', insertError.message)
      return
    }

    console.log('✅ Perfil de administrador creado exitosamente:', newProfile[0])
    console.log('🎉 Ahora puedes refrescar la aplicación y verás el menú de admin')

  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
  }
}

createAdminProfile()