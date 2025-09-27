import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ChevronDown,
  ChevronUp,
  Zap,
  Archive,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { notificationsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const IntuitivNotificationCenter = ({ className = "" }) => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedNotifications, setExpandedNotifications] = useState(new Set())
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Estados para configuración
  const [settings, setSettings] = useState({
    sound: true,
    desktop: true,
    email: false,
    autoMarkRead: false
  })

  useEffect(() => {
    loadUnreadCount()
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, filterType, sortBy])

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount()
      setUnreadCount(response.data.count)
    } catch (error) {
      console.error('Error cargando conteo de notificaciones:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const params = {
        limit: 50,
        page: 1
      }

      if (activeTab === 'unread') {
        params.unread_only = true
      }

      if (filterType !== 'all') {
        params.type = filterType
      }

      const response = await notificationsAPI.getAll(params)
      let notificationData = response.data.notifications || []

      // Ordenar
      if (sortBy === 'oldest') {
        notificationData = notificationData.reverse()
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        notificationData.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      }

      setNotifications(notificationData)
      setUnreadCount(response.data.pagination?.unreadCount || 0)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
      toast.error('Error al cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId)
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      if (settings.sound) {
        // Sonido suave para marcar como leída
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBnai4vG6ZyQGl')
        audio.volume = 0.1
        audio.play().catch(() => {})
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
      toast.error('Error al marcar como leída')
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
      
      setUnreadCount(0)
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
      toast.error('Error al marcar todas como leídas')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.delete(notificationId)
      
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast.success('Notificación eliminada')
    } catch (error) {
      console.error('Error eliminando notificación:', error)
      toast.error('Error al eliminar la notificación')
    }
  }

  const toggleExpanded = (notificationId) => {
    setExpandedNotifications(prev => {
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
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread' && notification.is_read) return false
    if (activeTab === 'read' && !notification.is_read) return false
    return true
  })

  const urgentNotifications = notifications.filter(n => n.priority === 'urgent' && !n.is_read)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative transition-all duration-200 hover:bg-gray-100 ${className}`}
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs text-white animate-bounce ${
                urgentNotifications.length > 0 ? 'bg-red-500' : 'bg-blue-500'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {urgentNotifications.length > 0 && (
            <div className="absolute -top-1 -left-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
          )}
          <span className="sr-only">
            Notificaciones {unreadCount > 0 && `(${unreadCount} sin leer)`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] p-0">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Notificaciones</h3>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>
                {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} nueva{unreadCount !== 1 ? 's' : ''}
                {urgentNotifications.length > 0 && (
                  <span className="text-red-600 font-medium"> 
                    {' '}({urgentNotifications.length} urgente{urgentNotifications.length !== 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Filtros y tabs */}
        <div className="p-3 border-b bg-gray-50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="all" className="text-xs">
                Todas
                <Badge variant="secondary" className="ml-1 text-xs">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Sin leer
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs">
                Leídas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs">
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs">
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

        {/* Lista de notificaciones */}
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Cargando notificaciones...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">
                {activeTab === 'unread' ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Las nuevas notificaciones aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id)
                const priority = getPriorityBadge(notification.priority)
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 transition-all duration-200 hover:bg-gray-50 ${getNotificationColor(notification.type, notification.priority, notification.is_read)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-medium line-clamp-1 ${
                                !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge className={`text-xs ${priority.color}`}>
                                {priority.label}
                              </Badge>
                            </div>
                            
                            <p className={`text-xs mt-1 ${
                              isExpanded ? '' : 'line-clamp-2'
                            } ${
                              !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {notification.message.length > 100 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(notification.id)}
                                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 mt-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Ver menos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Ver más
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-white/50"
                                title="Marcar como leída"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-white/50 text-red-500 hover:text-red-700"
                              title="Eliminar notificación"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/notifications')
                }}
              >
                Ver todas las notificaciones
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas ({unreadCount})
                </Button>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default IntuitivNotificationCenter