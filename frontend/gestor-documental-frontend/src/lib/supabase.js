import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_url_here'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función helper para obtener el token de sesión actual
export const getAuthToken = () => {
  const session = supabase.auth.getSession()
  return session?.access_token || null
}

// Función helper para obtener el usuario actual
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error obteniendo usuario:', error)
    return null
  }
  return user
}

// Función helper para cerrar sesión
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error cerrando sesión:', error)
    return false
  }
  return true
}

