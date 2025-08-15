import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  FileText,
  Users,
  Activity,
  PieChart,
  BarChart,
  LineChart,
  Settings,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { reportsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const Reports = () => {
  const [reportData, setReportData] = useState({
    documentStats: {},
    userStats: {},
    activityStats: {},
    workflowStats: {}
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30days')

  useEffect(() => {
    loadReportData()
  }, [selectedPeriod])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      const [documents, users, activity, workflows] = await Promise.all([
        reportsAPI.getDocumentStats(selectedPeriod),
        reportsAPI.getUserStats(selectedPeriod),
        reportsAPI.getActivityStats(selectedPeriod),
        reportsAPI.getWorkflowStats(selectedPeriod)
      ])

      setReportData({
        documentStats: documents.data || {},
        userStats: users.data || {},
        activityStats: activity.data || {},
        workflowStats: workflows.data || {}
      })
    } catch (error) {
      console.error('Error cargando reportes:', error)
      toast.error('Error al cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = (type) => {
    toast(`Exportando reporte ${type}`, { icon: '📊' })
  }

  const handleRefreshData = () => {
    loadReportData()
    toast.success('Datos actualizados')
  }

  const periods = [
    { value: '7days', label: 'Últimos 7 días' },
    { value: '30days', label: 'Últimos 30 días' },
    { value: '3months', label: 'Últimos 3 meses' },
    { value: '1year', label: 'Último año' }
  ]

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value || 0}</p>
            {change !== undefined && (
              <div className={`flex items-center text-sm mt-1 ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(change)}% vs período anterior
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">
            Analiza el rendimiento y estadísticas del sistema
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                {periods.find(p => p.value === selectedPeriod)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Período de tiempo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {periods.map((period) => (
                <DropdownMenuItem
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                >
                  {period.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportReport('excel')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportReport('pdf')}>
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportReport('csv')}>
                CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Documentos"
          value={reportData.documentStats.total}
          change={reportData.documentStats.growth}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Usuarios Activos"
          value={reportData.userStats.active}
          change={reportData.userStats.growth}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Actividad Diaria"
          value={reportData.activityStats.daily_average}
          change={reportData.activityStats.growth}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Workflows Completados"
          value={reportData.workflowStats.completed}
          change={reportData.workflowStats.growth}
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* Gráficos y reportes detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de documentos por estado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Documentos por Estado
            </CardTitle>
            <CardDescription>
              Distribución de documentos según su estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Aprobados</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {reportData.documentStats.approved || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pendientes</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {reportData.documentStats.pending || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Rechazados</span>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  {reportData.documentStats.rejected || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">En Revisión</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {reportData.documentStats.in_review || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actividad de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2" />
              Actividad de Usuarios
            </CardTitle>
            <CardDescription>
              Usuarios más activos en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(reportData.userStats.top_active || []).map((user, index) => (
                <div key={user.id || index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name || 'Usuario sin nombre'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {user.activity_count || 0} acciones
                  </Badge>
                </div>
              ))}
              {(!reportData.userStats.top_active || reportData.userStats.top_active.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay datos de actividad disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tendencia de documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Tendencia de Documentos
            </CardTitle>
            <CardDescription>
              Documentos creados en el tiempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                Gráfico de tendencias disponible próximamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rendimiento del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Rendimiento del Sistema
            </CardTitle>
            <CardDescription>
              Métricas de rendimiento y uso del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tiempo promedio de procesamiento</span>
                <Badge variant="outline">
                  {reportData.activityStats.avg_processing_time || '0s'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Documentos procesados/día</span>
                <Badge variant="outline">
                  {reportData.documentStats.daily_average || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tasa de error</span>
                <Badge variant="outline">
                  {reportData.activityStats.error_rate || '0%'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Uptime del sistema</span>
                <Badge className="bg-green-100 text-green-800">
                  {reportData.activityStats.uptime || '99.9%'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Reports