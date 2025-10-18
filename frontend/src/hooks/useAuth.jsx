import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  // NO cargar usuario desde localStorage al inicio para evitar usar tokens expirados
  // La sesión se verificará con Supabase directamente
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Función para obtener el perfil del usuario con su rol
  const getUserProfile = async (userId) => {
    if (!userId) return null

    try {
      console.log('🔍 Obteniendo perfil para userId:', userId)

      // Timeout reducido de 3s a 1s para evitar bloqueos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 1000)
      )

      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const result = await Promise.race([queryPromise, timeoutPromise])
      const { data, error } = result

      if (error) {
        console.error('❌ Error obteniendo perfil:', error)
        // Si no existe el perfil, devolver null sin bloquear
        if (error.code === 'PGRST116' || error.message === 'Timeout') {
          console.log('ℹ️ No se encontró perfil o timeout, continuando sin rol específico')
          return null
        }
        return null
      }

      console.log('✅ Perfil obtenido:', data)
      return data
    } catch (error) {
      console.error('❌ Error inesperado obteniendo perfil:', error)
      console.log('ℹ️ Continuando sin perfil específico')
      return null
    }
  }

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('🔍 Obteniendo sesión inicial...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Error obteniendo sesión:', error)
          setSession(null)
          setUser(null)
          // Limpiar localStorage si hay error
          localStorage.removeItem('mineduc_user')
          setLoading(false)
          return
        }

        console.log('✅ Sesión obtenida:', session?.user?.email)
        setSession(session)

        if (session?.user) {
          // Determinar el rol basado en el email directamente
          let role = 'viewer'
          if (session.user.email === 'admin@mineduc.gob.gt') {
            role = 'admin'
          } else if (session.user.email === 'editor@mineduc.gob.gt') {
            role = 'editor'
          }

          const userWithRole = {
            ...session.user,
            role: role
          }
          console.log('👤 Usuario con rol asignado:', { email: userWithRole.email, role: userWithRole.role })
          setUser(userWithRole)
          // Guardar en localStorage para carga rápida futura
          try {
            localStorage.setItem('mineduc_user', JSON.stringify(userWithRole))
          } catch (e) {
            console.warn('No se pudo guardar usuario en localStorage:', e)
          }

          // Perfil desde DB deshabilitado para evitar errores de RLS
          // getUserProfile(session.user.id).then(profile => {
          //   if (profile && profile.role !== role) {
          //     console.log('📝 Actualizando rol desde perfil:', profile.role)
          //     setUser(prev => ({ ...prev, role: profile.role, profile: profile }))
          //   }
          // }).catch(err => console.log('ℹ️ No se pudo obtener perfil desde DB:', err.message))
        } else {
          console.log('ℹ️ No hay sesión activa')
          setUser(null)
          localStorage.removeItem('mineduc_user')
        }
      } catch (error) {
        console.error('❌ Error inesperado en getInitialSession:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('🔄 Cambio de autenticación:', event, session?.user?.email)
          setSession(session)

          if (session?.user) {
            // Determinar el rol basado en el email directamente
            let role = 'viewer'
            if (session.user.email === 'admin@mineduc.gob.gt') {
              role = 'admin'
            } else if (session.user.email === 'editor@mineduc.gob.gt') {
              role = 'editor'
            }

            const userWithRole = {
              ...session.user,
              role: role
            }
            setUser(userWithRole)
            // Guardar en localStorage
            try {
              localStorage.setItem('mineduc_user', JSON.stringify(userWithRole))
            } catch (e) {
              console.warn('No se pudo guardar usuario en localStorage:', e)
            }

            // Perfil desde DB deshabilitado para evitar errores de RLS
            // getUserProfile(session.user.id).then(profile => {
            //   if (profile && profile.role !== role) {
            //     console.log('📝 Actualizando rol desde perfil:', profile.role)
            //     setUser(prev => ({ ...prev, role: profile.role, profile: profile }))
            //   }
            // }).catch(err => console.log('ℹ️ No se pudo obtener perfil desde DB:', err.message))
          } else {
            setUser(null)
            localStorage.removeItem('mineduc_user')
          }

          if (event === 'SIGNED_IN') {
            toast.success('Sesión iniciada correctamente')
          } else if (event === 'SIGNED_OUT') {
            toast.success('Sesión cerrada correctamente')
          }
        } catch (error) {
          console.error('❌ Error en onAuthStateChange:', error)
          setUser(session?.user ?? null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Cuenta creada exitosamente')
      return { success: true, data }
    } catch (error) {
      toast.error('Error inesperado al crear cuenta')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      // Limpiar localStorage
      localStorage.removeItem('mineduc_user')

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      toast.error('Error inesperado al cerrar sesión')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Correo de recuperación enviado')
      return { success: true }
    } catch (error) {
      toast.error('Error inesperado al enviar correo de recuperación')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Contraseña actualizada correctamente')
      return { success: true }
    } catch (error) {
      toast.error('Error inesperado al actualizar contraseña')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
