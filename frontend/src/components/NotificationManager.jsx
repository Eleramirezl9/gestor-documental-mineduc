import { useState, useEffect } from 'react'
import { 
  Plus, 
  Send, 
  Check, 
  X, 
  Eye, 
  Clock, 
  Users, 
  AlertTriangle,
  MessageCircle,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  BarChart3,
  FileText,
  UserCheck,
  Zap,
  Mail
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from './ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { Checkbox } from './ui/checkbox'
import { notificationsAPI } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const NotificationManager = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('manage')
  
  // Estados para gestión de notificaciones
  const [notifications, setNotifications] = useState([])
  const [pendingNotifications, setPendingNotifications] = useState([])
  const [stats, setStats] = useState({})
  const [adminStats, setAdminStats] = useState({})
  
  // Estados para crear notificación
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    target_users: [],
    requires_approval: false,
    send_email: false
  })
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  
  // Estados para usuarios disponibles
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    loadData()
    if (user?.role === 'admin') {
      loadPendingNotifications()
      loadAdminStats()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationsAPI.getAll({ limit: 50 }),
        notificationsAPI.getStats()
      ])
      
      setNotifications(notificationsResponse.data.notifications || [])
      setStats(statsResponse.data)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingNotifications = async () => {
    try {
      const response = await notificationsAPI.getPendingApproval()
      setPendingNotifications(response.data.notifications || [])
    } catch (error) {
      console.error('Error cargando notificaciones pendientes:', error)
    }
  }

  const loadAdminStats = async () => {
    try {
      const response = await notificationsAPI.getAdminStats()
      setAdminStats(response.data)
    } catch (error) {
      console.error('Error cargando estadísticas de admin:', error)
    }
  }

  const createNotification = async () => {
    try {
      if (!newNotification.title || !newNotification.message) {
        toast.error('Título y mensaje son requeridos')
        return
      }

      setLoading(true)
      const notificationData = {
        ...newNotification,
        target_users: selectedUsers.length > 0 ? selectedUsers : undefined
      }

      const response = await notificationsAPI.create(notificationData)
      
      toast.success(response.data.message)
      setCreateDialogOpen(false)
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        priority: 'medium',
        target_users: [],
        requires_approval: false,
        send_email: false
      })
      setSelectedUsers([])
      
      // Recargar datos
      await loadData()
      if (user?.role === 'admin') {
        await loadPendingNotifications()
      }
      
    } catch (error) {
      console.error('Error creando notificación:', error)
      toast.error('Error al crear la notificación')
    } finally {
      setLoading(false)
    }
  }

  const approveNotification = async (notificationId) => {
    try {
      setLoading(true)
      const response = await notificationsAPI.approve(notificationId)
      toast.success(response.data.message)
      
      // Actualizar listas
      await loadPendingNotifications()
      await loadData()
      await loadAdminStats()
      
    } catch (error) {
      console.error('Error aprobando notificación:', error)
      toast.error('Error al aprobar la notificación')
    } finally {
      setLoading(false)
    }
  }

  const rejectNotification = async (notificationId, reason = '') => {
    try {
      setLoading(true)
      const response = await notificationsAPI.reject(notificationId, reason)
      toast.success(response.data.message)
      
      // Actualizar listas
      await loadPendingNotifications()
      await loadAdminStats()
      
    } catch (error) {
      console.error('Error rechazando notificación:', error)
      toast.error('Error al rechazar la notificación')
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />
      case 'error':
        return <XCircle className={`${iconClass} text-red-600`} />
      case 'document':
        return <FileText className={`${iconClass} text-blue-600`} />
      case 'user':
        return <Users className={`${iconClass} text-purple-600`} />
      case 'system':
        return <Settings className={`${iconClass} text-gray-600`} />
      default:
        return <Bell className={`${iconClass} text-blue-600`} />
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    }
    const labels = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja'
    }
    return { color: colors[priority] || colors.medium, label: labels[priority] || 'Media' }
  }

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
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = notifications.filter(notification => {
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filterType !== 'all' && notification.type !== filterType) return false
    if (filterPriority !== 'all' && notification.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            Gestión de Notificaciones
          </h2>
          <p className="text-gray-600 mt-1">
            Administra y crea notificaciones del sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Notificación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Notificación</DialogTitle>
                <DialogDescription>
                  Envía una notificación a usuarios específicos o a ti mismo
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Título de la notificación"
                      value={newNotification.title}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={newNotification.type}
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Información</SelectItem>
                        <SelectItem value="success">Éxito</SelectItem>
                        <SelectItem value="warning">Advertencia</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="document">Documento</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    placeholder="Contenido de la notificación"
                    rows={4}
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      value={newNotification.priority}
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Destinatarios</Label>
                    <div className="text-sm text-gray-500">
                      {selectedUsers.length === 0 ? 'Solo para ti' : `${selectedUsers.length} usuario(s) seleccionado(s)`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires_approval"
                      checked={newNotification.requires_approval}
                      onCheckedChange={(checked) => setNewNotification(prev => ({ ...prev, requires_approval: checked }))}
                    />
                    <Label htmlFor="requires_approval">Requiere aprobación</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send_email"
                      checked={newNotification.send_email}
                      onCheckedChange={(checked) => setNewNotification(prev => ({ ...prev, send_email: checked }))}
                    />
                    <Label htmlFor="send_email">Enviar por email</Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createNotification} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar Notificación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Sin leer</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.unread || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-600">Urgentes</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.urgent_unread || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Hoy</span>
            </div>
            <div className="text-2xl font-bold text-gray-700">{stats.today || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">Gestionar</TabsTrigger>
          {user?.role === 'admin' && (
            <>
              <TabsTrigger value="approval">
                Aprobaciones
                {pendingNotifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics">Análisis</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Tab: Gestionar Notificaciones */}
        <TabsContent value="manage" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Buscar notificaciones..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="document">Documentos</SelectItem>
                      <SelectItem value="user">Usuarios</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                      <SelectItem value="warning">Advertencia</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de notificaciones */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando notificaciones...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No hay notificaciones
                  </h3>
                  <p className="text-gray-500">
                    Las notificaciones aparecerán aquí cuando se creen
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => {
                    const priority = getPriorityBadge(notification.priority)
                    
                    return (
                      <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`font-medium ${
                                    !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                                  }`}>
                                    {notification.title}
                                  </h3>
                                  <Badge className={`text-xs ${priority.color}`}>
                                    {priority.label}
                                  </Badge>
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                
                                <p className={`text-sm mb-3 ${
                                  !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                                }`}>
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(notification.created_at)}
                                  </span>
                                  
                                  {notification.read_at && (
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      Leída {formatTimeAgo(notification.read_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Aprobaciones (solo admins) */}
        {user?.role === 'admin' && (
          <TabsContent value="approval" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Notificaciones Pendientes de Aprobación
                </CardTitle>
                <CardDescription>
                  Revisa y aprueba las notificaciones creadas por otros usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      No hay notificaciones pendientes
                    </h3>
                    <p className="text-gray-500">
                      Todas las notificaciones han sido procesadas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingNotifications.map((notification) => {
                      const priority = getPriorityBadge(notification.priority)
                      
                      return (
                        <div key={notification.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-gray-900">{notification.title}</h3>
                                <Badge className={`text-xs ${priority.color}`}>
                                  {priority.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Pendiente
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-3">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  Creado por: {notification.creator?.name || notification.creator?.email}
                                </span>
                                <span>
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {notification.data?.target_users && (
                                  <span>
                                    Destinatarios: {notification.data.target_users.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveNotification(notification.id)}
                                disabled={loading}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprobar
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectNotification(notification.id)}
                                disabled={loading}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Análisis (solo admins) */}
        {user?.role === 'admin' && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Estadísticas Globales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total notificaciones:</span>
                      <span className="font-medium">{adminStats.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sin leer globales:</span>
                      <span className="font-medium">{adminStats.unread_global || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pendientes:</span>
                      <span className="font-medium text-yellow-600">{adminStats.pending_approval || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rechazadas:</span>
                      <span className="font-medium text-red-600">{adminStats.rejected || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.by_type || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-sm text-gray-600 capitalize">{type}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Por Prioridad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.by_priority || {}).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between">
                        <span className="text-sm text-gray-600 capitalize">{priority}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default NotificationManager