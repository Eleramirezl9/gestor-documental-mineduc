import { useState, useEffect } from 'react'
import {
  Users as UsersIcon,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  Shield,
  Mail,
  UserCheck,
  UserX,
  UserPlus,
  FileText,
  Clock,
  AlertTriangle,
  Phone,
  MapPin,
  Send,
  Download,
  Upload
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Progress } from '../components/ui/progress'
import { usersAPI, documentsAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import NewUserModal from '../components/NewUserModal'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [userDocuments, setUserDocuments] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await usersAPI.getAll()
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">Administrador</Badge>
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800">Editor</Badge>
      case 'viewer':
        return <Badge className="bg-green-100 text-green-800">Visor</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Sin rol</Badge>
    }
  }

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Activo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inactivo</Badge>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleView = async (userId) => {
    try {
      setProfileLoading(true)
      const user = users.find(u => u.id === userId)
      setSelectedUser(user)
      setShowUserProfile(true)

      // Cargar documentos del usuario
      const docsResponse = await documentsAPI.getByUser(userId)
      setUserDocuments(docsResponse.data.documents || [])
    } catch (error) {
      console.error('Error cargando perfil:', error)
      toast.error('Error al cargar el perfil del usuario')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleEdit = (userId) => {
    toast('Función de editar disponible próximamente', { icon: '✏️' })
  }

  const handleDelete = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      await usersAPI.delete(userId)
      toast.success('Usuario eliminado correctamente')
      loadUsers()
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      toast.error('Error al eliminar el usuario')
    }
  }

  const handleSendWelcomeEmail = async (userId) => {
    try {
      const loadingToast = toast.loading('Enviando email de bienvenida...')

      // Llamar a la API para enviar email de bienvenida
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/users/${userId}/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (response.ok) {
        toast.success('Email de bienvenida enviado correctamente', { id: loadingToast })
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al enviar email de bienvenida', { id: loadingToast })
      }
    } catch (error) {
      console.error('Error enviando email:', error)
      toast.error('Error al enviar email de bienvenida')
    }
  }

  const handleSendReminder = async (userId) => {
    try {
      const loadingToast = toast.loading('Enviando recordatorio...')

      // Llamar a la API para enviar recordatorio
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/users/${userId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          reminderType: 'Documentos Pendientes',
          customMessage: null
        })
      });

      if (response.ok) {
        toast.success('Recordatorio enviado correctamente', { id: loadingToast })
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al enviar recordatorio', { id: loadingToast })
      }
    } catch (error) {
      console.error('Error enviando recordatorio:', error)
      toast.error('Error al enviar recordatorio')
    }
  }

  const handleToggleStatus = async (userId) => {
    try {
      await usersAPI.toggleStatus(userId)
      toast.success('Estado del usuario actualizado')
      loadUsers()
    } catch (error) {
      console.error('Error cambiando estado:', error)
      toast.error('Error al cambiar el estado del usuario')
    }
  }

  const handleNewUser = () => {
    setShowNewUserModal(true)
  }

  const handleUserCreated = () => {
    loadUsers()
  }

  const handleInviteUser = () => {
    toast('Funcionalidad de invitar usuario próximamente', { icon: '📧' })
  }

  const handleAdvancedFilters = () => {
    toast('Filtros avanzados próximamente', { icon: '🔍' })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los usuarios del sistema y sus permisos
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button onClick={handleNewUser}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
          <Button variant="outline" onClick={handleInviteUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar</CardTitle>
          <CardDescription>
            Encuentra usuarios específicos usando los filtros disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email o rol..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleAdvancedFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avanzados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.is_active !== false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.is_active === false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando tu primer usuario'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <UsersIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email || 'Sin email'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.is_active !== false)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(user.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" title="Acciones">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleView(user.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(user.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWelcomeEmail(user.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Bienvenida
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendReminder(user.id)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar Recordatorio
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                            {user.is_active !== false ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nuevo Usuario */}
      <NewUserModal
        isOpen={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        onUserCreated={handleUserCreated}
      />

      {/* Modal de Perfil de Usuario */}
      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <UsersIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {selectedUser?.name || 'Usuario sin nombre'}
                </div>
                <div className="text-sm text-gray-500 font-normal">
                  {selectedUser?.email}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Información detallada del usuario y gestión de documentos
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="activity">Actividad</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información Personal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{selectedUser?.email || 'No especificado'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <p className="font-medium">{selectedUser?.phone || 'No especificado'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Departamento</p>
                          <p className="font-medium">{selectedUser?.department || 'No especificado'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Estado y Permisos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Rol</p>
                          <div className="mt-1">{getRoleBadge(selectedUser?.role)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Estado</p>
                          <div className="mt-1">{getStatusBadge(selectedUser?.is_active !== false)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Registro</p>
                          <p className="font-medium">{formatDate(selectedUser?.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Administrativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleSendWelcomeEmail(selectedUser?.id)}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Bienvenida
                      </Button>
                      <Button variant="outline" onClick={() => handleSendReminder(selectedUser?.id)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Recordatorio
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Datos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total</p>
                          <p className="text-2xl font-bold">{userDocuments.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Pendientes</p>
                          <p className="text-2xl font-bold">
                            {userDocuments.filter(d => d.status === 'pending').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Vencidos</p>
                          <p className="text-2xl font-bold">
                            {userDocuments.filter(d => d.status === 'expired').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Lista de Documentos</span>
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir por Usuario
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay documentos registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="font-medium">{doc.title || `Documento ${index + 1}`}</p>
                                <p className="text-sm text-gray-500">
                                  {formatDate(doc.created_at)} • {doc.file_size || 'Tamaño desconocido'}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={doc.status === 'approved' ? 'default' : 'secondary'}
                              className={
                                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                              }
                            >
                              {doc.status === 'approved' ? 'Aprobado' :
                                doc.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Registro de Actividad</CardTitle>
                    <CardDescription>
                      Historial de acciones y eventos del usuario
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium">Usuario registrado en el sistema</p>
                          <p className="text-sm text-gray-500">{formatDate(selectedUser?.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium">Último inicio de sesión</p>
                          <p className="text-sm text-gray-500">
                            {selectedUser?.last_login ? formatDate(selectedUser.last_login) : 'Nunca'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium">Documentos pendientes de revisión</p>
                          <p className="text-sm text-gray-500">
                            {userDocuments.filter(d => d.status === 'pending').length} documento(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Users