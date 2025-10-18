import { useState, useEffect } from 'react'
import { 
  Bell,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  CheckCircle,
  X,
  ArrowRight,
  Filter,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Progress } from './ui/progress'
import { useAuth } from '../hooks/useAuth'
import { documentRequirementsAPI, notificationsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const SmartNotificationsWidget = ({ onNavigate }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('alerts')

  // Estados para datos
  const [smartAlerts, setSmartAlerts] = useState([])
  const [pendingDocs, setPendingDocs] = useState([])
  const [expiringDocs, setExpiringDocs] = useState([])
  const [recentNotifications, setRecentNotifications] = useState([])
  const [summary, setSummary] = useState(null)

  // Estados para filtros
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    loadData()
    // Auto-refresh cada 2 minutos
    const interval = setInterval(loadData, 120000)
    return () => clearInterval(interval)
  }, [user])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      await Promise.all([
        loadPendingDocuments(),
        loadExpiringDocuments(),
        loadRecentNotifications(),
        generateSmartAlerts()
      ])
    } catch (error) {
      console.error('Error cargando datos del widget:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingDocuments = async () => {
    try {
      const response = await documentRequirementsAPI.getPendingDocuments()
      setPendingDocs(response.data || [])
    } catch (error) {
      // Si es error 401, no logueamos ya que el interceptor manejará la redirección
      if (error.response?.status === 401) {
        return
      }
      console.error('Error cargando documentos pendientes:', error)
    }
  }

  const loadExpiringDocuments = async () => {
    try {
      const response = await documentRequirementsAPI.getExpiringDocuments()
      setExpiringDocs(response.data || [])
    } catch (error) {
      // Si es error 401, no logueamos ya que el interceptor manejará la redirección
      if (error.response?.status === 401) {
        return
      }
      console.error('Error cargando documentos próximos a vencer:', error)
    }
  }

  const loadRecentNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 5, page: 1 })
      setRecentNotifications(response.data.notifications || [])
    } catch (error) {
      // Si es error 401, no logueamos ya que el interceptor manejará la redirección
      if (error.response?.status === 401) {
        return
      }
      console.error('Error cargando notificaciones recientes:', error)
    }
  }

  const generateSmartAlerts = async () => {
    try {
      const alerts = []

      // Generar alertas inteligentes basadas en los datos
      const pendingResponse = await documentRequirementsAPI.getPendingDocuments()
      const expiringResponse = await documentRequirementsAPI.getExpiringDocuments()

      const pending = pendingResponse.data || []
      const expiring = expiringResponse.data || []

      // Documentos vencidos
      const overdue = pending.filter(doc => doc.priority_level === 'overdue')
      if (overdue.length > 0) {
        alerts.push({
          id: 'overdue',
          type: 'critical',
          icon: AlertTriangle,
          title: `${overdue.length} documento${overdue.length > 1 ? 's' : ''} atrasado${overdue.length > 1 ? 's' : ''}`,
          message: 'Tienes documentos que debían entregarse y están atrasados',
          priority: 'urgent',
          action: 'Ver documentos atrasados',
          count: overdue.length,
          data: overdue
        })
      }

      // Documentos por vencer hoy/mañana
      const urgent = expiring.filter(doc => doc.urgency_level === 'urgent')
      if (urgent.length > 0) {
        alerts.push({
          id: 'urgent-expiring',
          type: 'warning',
          icon: Clock,
          title: `${urgent.length} documento${urgent.length > 1 ? 's' : ''} por vencer`,
          message: 'Documentos que vencen en las próximas 24-48 horas',
          priority: 'high',
          action: 'Renovar documentos',
          count: urgent.length,
          data: urgent
        })
      }

      // Documentos pendientes próximos a fecha límite
      const dueSoon = pending.filter(doc => doc.priority_level === 'due_soon')
      if (dueSoon.length > 0) {
        alerts.push({
          id: 'due-soon',
          type: 'info',
          icon: FileText,
          title: `${dueSoon.length} documento${dueSoon.length > 1 ? 's' : ''} por entregar`,
          message: 'Documentos que deben entregarse en los próximos días',
          priority: 'medium',
          action: 'Preparar documentos',
          count: dueSoon.length,
          data: dueSoon
        })
      }

      // Alerta de buen cumplimiento
      const approved = pending.filter(doc => doc.status === 'approved').length
      const total = pending.length + approved
      const complianceRate = total > 0 ? (approved / total) * 100 : 0

      if (complianceRate >= 80 && total > 0) {
        alerts.push({
          id: 'good-compliance',
          type: 'success',
          icon: CheckCircle,
          title: '¡Excelente cumplimiento!',
          message: `Tienes ${complianceRate.toFixed(0)}% de documentos al día`,
          priority: 'low',
          action: 'Ver todos mis documentos',
          count: approved,
          data: { complianceRate }
        })
      }

      // Resumen general
      setSummary({
        totalPending: pending.length,
        totalExpiring: expiring.filter(d => d.urgency_level !== 'ok').length,
        complianceRate,
        criticalAlerts: alerts.filter(a => a.priority === 'urgent').length
      })

      setSmartAlerts(alerts)
    } catch (error) {
      // Si es error 401, no logueamos ya que el interceptor manejará la redirección
      if (error.response?.status === 401) {
        return
      }
      console.error('Error generando alertas inteligentes:', error)
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'warning':
        return 'border-orange-500 bg-orange-50'
      case 'info':
        return 'border-blue-500 bg-blue-50'
      case 'success':
        return 'border-green-500 bg-green-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[priority] || colors.medium
  }

  const handleAlertAction = (alert) => {
    switch (alert.id) {
      case 'overdue':
      case 'due-soon':
        onNavigate?.('/documents/requirements?tab=pending')
        break
      case 'urgent-expiring':
        onNavigate?.('/documents/requirements?tab=expiring')
        break
      case 'good-compliance':
        onNavigate?.('/documents/requirements?tab=my-documents')
        break
      default:
        onNavigate?.('/documents/requirements')
    }
  }

  const filteredAlerts = smartAlerts.filter(alert => 
    priorityFilter === 'all' || alert.priority === priorityFilter
  )

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Hace poco'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Ahora mismo'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Hace ${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Hace ${diffInDays}d`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando alertas inteligentes...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Notificaciones Inteligentes
        </CardTitle>
        <CardDescription>
          Alertas y recordatorios personalizados para tus documentos
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="alerts" className="text-xs">
                Alertas
                {summary?.criticalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {summary.criticalAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Pendientes
                {summary?.totalPending > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {summary.totalPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">
                Recientes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: Alertas Inteligentes */}
          <TabsContent value="alerts" className="mt-4 space-y-4">
            <div className="px-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {filteredAlerts.length} alerta{filteredAlerts.length !== 1 ? 's' : ''}
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="urgent">Urgentes</SelectItem>
                    <SelectItem value="high">Altas</SelectItem>
                    <SelectItem value="medium">Medias</SelectItem>
                    <SelectItem value="low">Bajas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resumen rápido */}
              {summary && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">{summary.complianceRate.toFixed(0)}%</div>
                    <div className="text-xs text-gray-600">Cumplimiento</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">{summary.totalPending + summary.totalExpiring}</div>
                    <div className="text-xs text-gray-600">Acción requerida</div>
                  </div>
                </div>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto px-6 space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">¡Todo en orden!</p>
                  <p className="text-xs text-gray-500">No hay alertas que requieran tu atención</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const IconComponent = alert.icon
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.type)} hover:shadow-sm transition-shadow cursor-pointer`}
                      onClick={() => handleAlertAction(alert)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{alert.title}</h4>
                              <Badge className={`text-xs ${getPriorityBadge(alert.priority)}`}>
                                {alert.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{alert.message}</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs p-1 hover:bg-white/50"
                            >
                              {alert.action}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                        {alert.count && (
                          <div className="text-xs font-bold text-gray-500 bg-white rounded-full w-6 h-6 flex items-center justify-center">
                            {alert.count}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* Tab: Documentos Pendientes */}
          <TabsContent value="pending" className="mt-4">
            <div className="max-h-80 overflow-y-auto px-6 space-y-3">
              {pendingDocs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">¡Excelente!</p>
                  <p className="text-xs text-gray-500">No tienes documentos pendientes</p>
                </div>
              ) : (
                pendingDocs.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{doc.document_type_name}</h4>
                        <p className="text-xs text-gray-600">
                          Fecha límite: {new Date(doc.required_date).toLocaleDateString()}
                        </p>
                        <Badge className={`text-xs mt-1 ${getPriorityBadge(doc.priority_level === 'overdue' ? 'urgent' : 'medium')}`}>
                          {doc.priority_level === 'overdue' ? 'Atrasado' : 'Pendiente'}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onNavigate?.('/documents/requirements?tab=pending')}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              {pendingDocs.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onNavigate?.('/documents/requirements?tab=pending')}
                  >
                    Ver todos ({pendingDocs.length})
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Notificaciones Recientes */}
          <TabsContent value="recent" className="mt-4">
            <div className="max-h-80 overflow-y-auto px-6 space-y-3">
              {recentNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No hay notificaciones recientes</p>
                </div>
              ) : (
                recentNotifications.map((notification) => (
                  <div key={notification.id} className={`p-3 border rounded-lg ${!notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate?.('/notifications')}
                >
                  Ver todas las notificaciones
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default SmartNotificationsWidget