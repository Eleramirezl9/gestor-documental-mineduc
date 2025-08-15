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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error obteniendo sesión:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN') {
          toast.success('Sesión iniciada correctamente')
        } else if (event === 'SIGNED_OUT') {
          toast.success('Sesión cerrada correctamente')
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
