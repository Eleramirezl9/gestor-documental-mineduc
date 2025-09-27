import { useState, useEffect } from 'react'
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Download,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { documentsAPI, usersAPI, workflowsAPI, reportsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    documents: { total: 0, pending: 0, approved: 0, rejected: 0 },
    users: { total: 0, active: 0, inactive: 0 },
    workflows: { total: 0, pending: 0, completed: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [recentDocuments, setRecentDocuments] = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Cargar datos críticos primero (stats básicas)
      const [docsResponse, usersResponse, workflowsResponse, recentDocsResponse] = await Promise.allSettled([
        documentsAPI.getStats(),
        usersAPI.getStats(),
        workflowsAPI.getStats(),
        documentsAPI.getAll({ limit: 5, sort: 'created_at', order: 'desc' })
      ])

      // Procesar respuestas críticas
      if (docsResponse.status === 'fulfilled') {
        setStats(prev => ({ ...prev, documents: docsResponse.value.data }))
      } else {
        // Datos fallback para evitar pantallas vacías
        setStats(prev => ({ ...prev, documents: { total: 0, pending: 0, approved: 0, rejected: 0 } }))
      }

      if (usersResponse.status === 'fulfilled') {
        setStats(prev => ({ ...prev, users: usersResponse.value.data }))
      } else {
        setStats(prev => ({ ...prev, users: { total: 0, active: 0, inactive: 0 } }))
      }

      if (workflowsResponse.status === 'fulfilled') {
        setStats(prev => ({ ...prev, workflows: workflowsResponse.value.data }))
      } else {
        setStats(prev => ({ ...prev, workflows: { total: 0, pending: 0, completed: 0 } }))
      }

      if (recentDocsResponse.status === 'fulfilled') {
        setRecentDocuments(recentDocsResponse.value.data.documents || [])
      }

      // Simular datos de gráficos inmediatamente (no bloquean carga inicial)
      setChartData([
        { name: 'Ene', documentos: 65, aprobados: 45 },
        { name: 'Feb', documentos: 78, aprobados: 62 },
        { name: 'Mar', documentos: 90, aprobados: 75 },
        { name: 'Abr', documentos: 81, aprobados: 68 },
        { name: 'May', documentos: 95, aprobados: 82 },
        { name: 'Jun', documentos: 88, aprobados: 79 }
      ])

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
      toast.error('Error cargando datos del dashboard')

      // Datos fallback para evitar pantalla rota
      setStats({
        documents: { total: 0, pending: 0, approved: 0, rejected: 0 },
        users: { total: 0, active: 0, inactive: 0 },
        workflows: { total: 0, pending: 0, completed: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const pieData = [
    { name: 'Aprobados', value: stats.documents.approved, color: '#10b981' },
    { name: 'Pendientes', value: stats.documents.pending, color: '#f59e0b' },
    { name: 'Rechazados', value: stats.documents.rejected, color: '#ef4444' }
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const handleNewDocument = () => {
    navigate('/documents')
  }

  const handleExportReport = async () => {
    try {
      toast.loading('Generando reporte...')
      const response = await reportsAPI.exportDocuments({
        period: 'current_month',
        format: 'pdf'
      })
      
      // Crear y descargar el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte-dashboard-${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('Reporte exportado exitosamente')
    } catch (error) {
      toast.dismiss()
      console.error('Error exportando reporte:', error)
      toast.error('Error al exportar el reporte')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {user?.email?.split('@')[0] || 'Usuario'}
          </h1>
          <p className="text-gray-600 mt-1">
            Resumen de actividades del sistema de gestión documental
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button onClick={handleNewDocument}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Documento
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.pending}</div>
            <p className="text-xs text-muted-foreground">
              Requieren revisión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.approved}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.active}</div>
            <p className="text-xs text-muted-foreground">
              De {stats.users.total} usuarios totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Mes</CardTitle>
            <CardDescription>
              Comparación de documentos creados vs aprobados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="documentos" fill="#3b82f6" name="Creados" />
                <Bar dataKey="aprobados" fill="#10b981" name="Aprobados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico circular */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Documentos</CardTitle>
            <CardDescription>
              Distribución actual por estado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Documentos recientes y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
            <CardDescription>
              Últimos documentos agregados al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title || `Documento ${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Fecha no disponible'}
                      </p>
                    </div>
                    <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                      {doc.status || 'Pendiente'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No hay documentos recientes</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alertas y notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
            <CardDescription>
              Notificaciones importantes que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {stats.documents.pending} documentos pendientes de revisión
                  </p>
                  <p className="text-xs text-gray-500">
                    Algunos documentos llevan más de 3 días sin revisar
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Incremento en la actividad del sistema
                  </p>
                  <p className="text-xs text-gray-500">
                    +25% más documentos procesados esta semana
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Nuevos usuarios registrados
                  </p>
                  <p className="text-xs text-gray-500">
                    3 usuarios nuevos requieren activación
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso de objetivos */}
      <Card>
        <CardHeader>
          <CardTitle>Objetivos del Mes</CardTitle>
          <CardDescription>
            Progreso hacia las metas establecidas para este período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Documentos Procesados</span>
                <span className="text-sm text-gray-500">85/100</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tiempo de Respuesta</span>
                <span className="text-sm text-gray-500">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Satisfacción de Usuarios</span>
                <span className="text-sm text-gray-500">78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard

