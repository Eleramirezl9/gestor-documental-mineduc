import { useState, useEffect } from 'react'
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  FileText,
  Users,
  Calendar,
  Clock,
  Filter,
  Search,
  Zap,
  Archive,
  Eye,
  EyeOff,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Switch } from '../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '../components/ui/dropdown-menu'
import { Checkbox } from '../components/ui/checkbox'
import { Label } from '../components/ui/label'
import { notificationsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedNotifications, setSelectedNotifications] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({})

  // Estados para configuración
  const [settings, setSettings] = useState({
    sound: true,
    desktop: true,
    email: false,
    autoMarkRead: false,
    showPreviews: true
  })

  useEffect(() => {
    loadNotifications()
  }, [activeTab, filterType, filterPriority, sortBy, currentPage, searchTerm])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const params = {
        limit: 20,
        page: currentPage
      }

      if (activeTab === 'unread') {
        params.unread_only = true
      }

      if (filterType !== 'all') {
        params.type = filterType
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await notificationsAPI.getAll(params)
      let notificationData = response.data.notifications || []

      // Filtrar por prioridad
      if (filterPriority !== 'all') {
        notificationData = notificationData.filter(n => n.priority === filterPriority)
      }

      // Ordenar
      if (sortBy === 'oldest') {
        notificationData = notificationData.reverse()
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        notificationData.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      }

      setNotifications(notificationData)
      setPagination(response.data.pagination || {})
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
      toast.error('Error al cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds) => {
    try {
      if (Array.isArray(notificationIds)) {
        // Marcar múltiples como leídas
        await Promise.all(notificationIds.map(id => notificationsAPI.markAsRead(id)))
        toast.success(`${notificationIds.length} notificaciones marcadas como leídas`)
      } else {
        // Marcar una como leída
        await notificationsAPI.markAsRead(notificationIds)
        toast.success('Notificación marcada como leída')
      }
      
      setNotifications(prev => 
        prev.map(notif => 
          (Array.isArray(notificationIds) ? notificationIds : [notificationIds]).includes(notif.id)
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      )
      
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error)
      toast.error('Error al marcar como leídas')
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      )
      
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
      toast.error('Error al marcar todas como leídas')
    }
  }

  const deleteNotifications = async (notificationIds) => {
    try {
      if (Array.isArray(notificationIds)) {
        await Promise.all(notificationIds.map(id => notificationsAPI.delete(id)))
        toast.success(`${notificationIds.length} notificaciones eliminadas`)
      } else {
        await notificationsAPI.delete(notificationIds)
        toast.success('Notificación eliminada')
      }
      
      setNotifications(prev => 
        prev.filter(notif => 
          !(Array.isArray(notificationIds) ? notificationIds : [notificationIds]).includes(notif.id)
        )
      )
      
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Error eliminando notificaciones:', error)
      toast.error('Error al eliminar notificaciones')
    }
  }

  const toggleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set())
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)))
    }
  }

  const toggleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId)
      } else {
        newSet.add(notificationId)
      }
      return newSet
    })
  }

  const getNotificationIcon = (type) => {
    const iconClass = "h-5 w-5"
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600`} />
      case 'document':
        return <FileText className={`${iconClass} text-blue-600`} />
      case 'user':
        return <Users className={`${iconClass} text-purple-600`} />
      case 'system':
        return <Settings className={`${iconClass} text-gray-600`} />
      default:
        return <Info className={`${iconClass} text-blue-600`} />
    }
  }

  const getNotificationColor = (type, priority, isRead) => {
    const opacity = isRead ? 'opacity-70' : ''
    
    if (priority === 'urgent') return `border-l-red-500 bg-red-50 ${opacity}`
    if (priority === 'high') return `border-l-orange-500 bg-orange-50 ${opacity}`
    
    switch (type) {
      case 'success':
        return `border-l-green-500 bg-green-50 ${opacity}`
      case 'warning':
        return `border-l-yellow-500 bg-yellow-50 ${opacity}`
      case 'error':
        return `border-l-red-500 bg-red-50 ${opacity}`
      case 'document':
        return `border-l-blue-500 bg-blue-50 ${opacity}`
      case 'user':
        return `border-l-purple-500 bg-purple-50 ${opacity}`
      case 'system':
        return `border-l-gray-500 bg-gray-50 ${opacity}`
      default:
        return `border-l-blue-500 bg-blue-50 ${opacity}`
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread' && notification.is_read) return false
    if (activeTab === 'read' && !notification.is_read) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const urgentNotifications = notifications.filter(n => n.priority === 'urgent' && !n.is_read)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            Notificaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona todas tus notificaciones y alertas del sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Configuración de Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound" className="text-sm">Sonido</Label>
                  <Switch
                    id="sound"
                    checked={settings.sound}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="desktop" className="text-sm">Notificaciones de escritorio</Label>
                  <Switch
                    id="desktop"
                    checked={settings.desktop}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, desktop: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="previews" className="text-sm">Mostrar vistas previas</Label>
                  <Switch
                    id="previews"
                    checked={settings.showPreviews}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showPreviews: checked }))}
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Sin leer</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-600">Urgentes</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{urgentNotifications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Hoy</span>
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {notifications.filter(n => {
                const today = new Date().toDateString()
                const notifDate = new Date(n.created_at).toDateString()
                return today === notifDate
              }).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-700">{pagination.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
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
            
            {/* Filtros */}
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguos</SelectItem>
                  <SelectItem value="priority">Por prioridad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs y acciones masivas */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                Todas
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Sin leer
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">
                Leídas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Acciones masivas */}
          {selectedNotifications.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedNotifications.size} seleccionada{selectedNotifications.size !== 1 ? 's' : ''}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(Array.from(selectedNotifications))}
              >
                <Eye className="h-4 w-4 mr-2" />
                Marcar leídas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de notificaciones */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Cargando notificaciones...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {activeTab === 'unread' ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}
              </h3>
              <p className="text-gray-500">
                Las nuevas notificaciones aparecerán aquí cuando lleguen
              </p>
            </div>
          ) : (
            <>
              {/* Header de tabla */}
              <div className="border-b bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium text-gray-700">Seleccionar todas</span>
                  
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="ml-auto text-blue-600 hover:text-blue-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Marcar todas como leídas ({unreadCount})
                    </Button>
                  )}
                </div>
              </div>

              {/* Notificaciones */}
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => {
                  const isSelected = selectedNotifications.has(notification.id)
                  const priority = getPriorityBadge(notification.priority)
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-all duration-200 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectNotification(notification.id)}
                        />
                        
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
                            
                            <div className="flex items-center gap-1">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  title="Marcar como leída"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotifications(notification.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Eliminar notificación"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="border-t p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, pagination.total)} de {pagination.total} notificaciones
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <span className="text-sm text-gray-600">
                        Página {currentPage} de {pagination.totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                        disabled={currentPage === pagination.totalPages}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Notifications