import { useState, useEffect } from 'react'
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  MarkAsRead,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  FileText,
  Users,
  Settings
} from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel
} from './ui/dropdown-menu'
import { ScrollArea } from './ui/scroll-area'
import { notificationsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadUnreadCount()
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount()
      setUnreadCount(response.data.count)
    } catch (error) {
      // Si es error 401, no logueamos ya que el interceptor manejará la redirección
      if (error.response?.status === 401) {
        return
      }
      console.error('Error cargando conteo de notificaciones:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationsAPI.getAll({ 
        limit: 20,
        page: 1 
      })
      setNotifications(response.data.notifications || [])
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
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      )
      
      // Actualizar conteo
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
      toast.error('Error al marcar como leída')
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      
      // Actualizar estado local
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
      
      // Actualizar estado local
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      // Actualizar conteo si era no leída
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast.success('Notificación eliminada')
    } catch (error) {
      console.error('Error eliminando notificación:', error)
      toast.error('Error al eliminar la notificación')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'document':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'user':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent') return 'border-l-red-500 bg-red-50'
    if (priority === 'high') return 'border-l-orange-500 bg-orange-50'
    
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'error':
        return 'border-l-red-500 bg-red-50'
      case 'document':
        return 'border-l-blue-500 bg-blue-50'
      case 'user':
        return 'border-l-purple-500 bg-purple-50'
      case 'system':
        return 'border-l-gray-500 bg-gray-50'
      default:
        return 'border-l-blue-500 bg-blue-50'
    }
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
    
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            Notificaciones {unreadCount > 0 && `(${unreadCount} sin leer)`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96">
        <DropdownMenuHeader className="p-4">
          <div className="flex items-center justify-between">
            <DropdownMenuLabel className="text-lg font-semibold">
              Notificaciones
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                <MarkAsRead className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">
              {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
            </p>
          )}
        </DropdownMenuHeader>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm">Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-l-4 ${getNotificationColor(notification.type, notification.priority)} ${
                    !notification.is_read ? 'bg-opacity-100' : 'bg-opacity-50'
                  } hover:bg-opacity-75 transition-colors`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-white/50"
                              title="Marcar como leída"
                            >
                              <Check className="h-3 w-3" />
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
                      
                      <p className={`text-xs mt-1 ${
                        !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => {
                  setIsOpen(false)
                  // Aquí podrías navegar a una página de notificaciones completa
                }}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell