import { useState, useEffect, memo, useMemo } from 'react'
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  Plus,
  RefreshCw
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
import { dashboardAPI, reportsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

// Memoizar gráficos para evitar re-renders innecesarios
const DocumentsBarChart = memo(({ chartData }) => (
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
))

const DocumentsPieChart = memo(({ pieData }) => (
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
))

DocumentsBarChart.displayName = 'DocumentsBarChart'
DocumentsPieChart.displayName = 'DocumentsPieChart'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    documents: { total: 0, pending: 0, approved: 0, rejected: 0 },
    users: { total: 0, active: 0, inactive: 0 },
    workflows: { total: 0, pending: 0, completed: 0 }
  })
  const [loadingStates, setLoadingStates] = useState({
    stats: true,
    documents: true,
    users: true,
    workflows: true,
    recent: true
  })
  const [recentDocuments, setRecentDocuments] = useState([])
  const [chartData, setChartData] = useState([])
  const [alerts, setAlerts] = useState({
    oldPendingDocuments: 0,
    totalPending: 0,
    newUsers: 0
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Memoizar pieData para evitar recalcular en cada render
  const pieData = useMemo(() => [
    { name: 'Aprobados', value: stats.documents.approved, color: '#10b981' },
    { name: 'Pendientes', value: stats.documents.pending, color: '#f59e0b' },
    { name: 'Rechazados', value: stats.documents.rejected, color: '#ef4444' }
  ], [stats.documents])

  // Verificar si hay algún dato cargando
  const isAnyLoading = useMemo(() =>
    Object.values(loadingStates).some(Boolean),
    [loadingStates]
  )

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Usar el nuevo endpoint consolidado de dashboard
      const response = await dashboardAPI.getStats()
      const data = response.data

      // Actualizar estadísticas
      setStats({
        documents: data.documents,
        users: data.users,
        workflows: data.workflows
      })

      // Actualizar datos de gráficos
      setChartData(data.chartData.monthly)

      // Actualizar documentos recientes
      setRecentDocuments(data.documents.recentDocuments || [])

      // Guardar alertas en estado
      setAlerts(data.alerts || {
        oldPendingDocuments: 0,
        totalPending: 0,
        newUsers: 0
      })

      // Marcar todo como cargado
      setLoadingStates({
        stats: false,
        documents: false,
        users: false,
        workflows: false,
        recent: false
      })

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
      toast.error('Error al cargar los datos del dashboard')

      // Marcar todo como cargado aunque haya error
      setLoadingStates({
        stats: false,
        documents: false,
        users: false,
        workflows: false,
        recent: false
      })
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const handleNewDocument = () => {
    navigate('/documents')
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadDashboardData()
      toast.success('Dashboard actualizado')
    } catch (error) {
      toast.error('Error al actualizar el dashboard')
    } finally {
      setIsRefreshing(false)
    }
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

  // Solo mostrar skeleton si TODAS las stats están cargando al inicio
  const showFullSkeleton = loadingStates.stats && isAnyLoading

  if (showFullSkeleton) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
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
              {stats.documents.trends?.percentageChange !== undefined && (
                <span className={stats.documents.trends.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.documents.trends.percentageChange >= 0 ? '+' : ''}{stats.documents.trends.percentageChange}%
                </span>
              )} desde el mes pasado
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
              {stats.documents.trends?.thisWeekApproved !== undefined && (
                <>
                  <span className="text-green-600">
                    {stats.documents.trends.thisWeekApproved}
                  </span> esta semana
                </>
              )}
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
            <DocumentsBarChart chartData={chartData} />
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
            <DocumentsPieChart pieData={pieData} />
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
              {alerts.totalPending > 0 && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {alerts.totalPending} documentos pendientes de revisión
                    </p>
                    {alerts.oldPendingDocuments > 0 && (
                      <p className="text-xs text-gray-500">
                        {alerts.oldPendingDocuments} {alerts.oldPendingDocuments === 1 ? 'lleva' : 'llevan'} más de 3 días sin revisar
                      </p>
                    )}
                  </div>
                </div>
              )}

              {stats.documents.trends?.percentageChange !== undefined && stats.documents.trends.percentageChange > 0 && (
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Incremento en la actividad del sistema
                    </p>
                    <p className="text-xs text-gray-500">
                      +{stats.documents.trends.percentageChange}% más documentos que el mes pasado
                    </p>
                  </div>
                </div>
              )}

              {alerts.newUsers > 0 && (
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Nuevos usuarios registrados
                    </p>
                    <p className="text-xs text-gray-500">
                      {alerts.newUsers} {alerts.newUsers === 1 ? 'usuario nuevo' : 'usuarios nuevos'} esta semana
                    </p>
                  </div>
                </div>
              )}

              {alerts.totalPending === 0 && alerts.newUsers === 0 && (
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Todo al día
                    </p>
                    <p className="text-xs text-gray-500">
                      No hay alertas pendientes en este momento
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso de objetivos */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Sistema</CardTitle>
          <CardDescription>
            Estado actual de los principales indicadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tasa de Aprobación</span>
                <span className="text-sm text-gray-500">
                  {stats.documents.total > 0
                    ? Math.round((stats.documents.approved / stats.documents.total) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={stats.documents.total > 0
                  ? (stats.documents.approved / stats.documents.total) * 100
                  : 0}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Usuarios Activos</span>
                <span className="text-sm text-gray-500">
                  {stats.users.total > 0
                    ? Math.round((stats.users.active / stats.users.total) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={stats.users.total > 0
                  ? (stats.users.active / stats.users.total) * 100
                  : 0}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Workflows Completados</span>
                <span className="text-sm text-gray-500">
                  {stats.workflows.total > 0
                    ? Math.round((stats.workflows.completed / stats.workflows.total) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={stats.workflows.total > 0
                  ? (stats.workflows.completed / stats.workflows.total) * 100
                  : 0}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard

