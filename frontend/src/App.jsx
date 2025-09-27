import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import './App.css'

// Lazy loading de páginas
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Documents = lazy(() => import('./pages/Documents'))
const Users = lazy(() => import('./pages/Users'))
const UsersEnhanced = lazy(() => import('./pages/UsersEnhanced'))
const Reports = lazy(() => import('./pages/Reports'))
const Audit = lazy(() => import('./pages/Audit'))
const Settings = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const NotificationAutomation = lazy(() => import('./pages/NotificationAutomation'))
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'))

// Componente de loading para lazy loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

// Componente para rutas públicas (solo accesibles sin autenticación)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return user ? <Navigate to="/dashboard" /> : children
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={
              <PublicRoute>
                <Suspense fallback={<PageLoader />}>
                  <Login />
                </Suspense>
              </PublicRoute>
            } />

            {/* Rutas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="documents" element={
                <Suspense fallback={<PageLoader />}>
                  <Documents />
                </Suspense>
              } />
              <Route path="users" element={
                <Suspense fallback={<PageLoader />}>
                  <Users />
                </Suspense>
              } />
              <Route path="user-management" element={
                <Suspense fallback={<PageLoader />}>
                  <UsersEnhanced />
                </Suspense>
              } />
              <Route path="reports" element={
                <Suspense fallback={<PageLoader />}>
                  <Reports />
                </Suspense>
              } />
              <Route path="audit" element={
                <Suspense fallback={<PageLoader />}>
                  <Audit />
                </Suspense>
              } />
              <Route path="notifications" element={
                <Suspense fallback={<PageLoader />}>
                  <Notifications />
                </Suspense>
              } />
              <Route path="automation" element={
                <Suspense fallback={<PageLoader />}>
                  <NotificationAutomation />
                </Suspense>
              } />
              <Route path="employees" element={
                <Suspense fallback={<PageLoader />}>
                  <EmployeeManagement />
                </Suspense>
              } />
              <Route path="settings" element={
                <Suspense fallback={<PageLoader />}>
                  <Settings />
                </Suspense>
              } />
            </Route>
            
            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
          
          {/* Notificaciones toast */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
