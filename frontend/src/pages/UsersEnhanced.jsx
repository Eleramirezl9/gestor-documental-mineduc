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
  Send,
  Building2,
  Phone,
  MapPin,
  IdCard,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  FileText,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Checkbox } from '../components/ui/checkbox'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const UsersEnhanced = () => {
  // Estados principales
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    role: 'all',
    department: 'all',
    contractType: 'all',
    status: 'active'
  })

  // Estados de modales
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showInvitationManager, setShowInvitationManager] = useState(false)

  // Estados de formularios
  const [newUserData, setNewUserData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    dpi: '',
    nit: '',
    position: '',
    department: '',
    role: 'viewer',
    hire_date: '',
    supervisor_id: '',
    contract_type: 'permanent',
    salary_range: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    birth_date: '',
    gender: 'unspecified',
    marital_status: 'unspecified',
    bio: '',
    skills: []
  })

  const [invitationData, setInvitationData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    position: '',
    department: '',
    invited_role: 'viewer',
    invitation_type: 'employee',
    contract_type: 'permanent',
    custom_message: '',
    required_documents: ['CV actualizado', 'Copia de DPI', 'Certificados académicos'],
    expires_in_days: 7
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadUsersAndInvitations()
  }, [filters])

  const loadUsersAndInvitations = async () => {
    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token

      if (!token) {
        toast.error('Sesión expirada')
        return
      }

      // Cargar usuarios
      const cleanFilters = {
        role: filters.role === 'all' ? '' : filters.role,
        department: filters.department === 'all' ? '' : filters.department,
        contractType: filters.contractType === 'all' ? '' : filters.contractType,
        status: filters.status
      }

      const userParams = new URLSearchParams({
        ...cleanFilters,
        include_inactive: filters.status === 'all' ? 'true' : 'false'
      })

      const usersResponse = await fetch(`${API_BASE}/api/users/enhanced?${userParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Cargar invitaciones
      const invitationsResponse = await fetch(`${API_BASE}/api/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuarios por término de búsqueda
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.employee_id?.toLowerCase().includes(searchLower) ||
      user.dpi?.includes(searchTerm) ||
      user.position?.toLowerCase().includes(searchLower)
    )
  })

  // Funciones de utilidad
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { label: 'Administrador', color: 'bg-red-100 text-red-800' },
      editor: { label: 'Editor', color: 'bg-blue-100 text-blue-800' },
      viewer: { label: 'Visor', color: 'bg-green-100 text-green-800' }
    }
    const roleInfo = roleMap[role] || { label: 'Sin rol', color: 'bg-gray-100 text-gray-800' }
    return <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
  }

  const getContractTypeBadge = (contractType) => {
    const typeMap = {
      permanent: { label: 'Permanente', color: 'bg-green-100 text-green-800' },
      temporary: { label: 'Temporal', color: 'bg-yellow-100 text-yellow-800' },
      consultant: { label: 'Consultor', color: 'bg-purple-100 text-purple-800' },
      intern: { label: 'Practicante', color: 'bg-blue-100 text-blue-800' }
    }
    const typeInfo = typeMap[contractType] || { label: contractType, color: 'bg-gray-100 text-gray-800' }
    return <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
  }

  const getStatusBadge = (isActive, onboardingCompleted) => {
    if (!isActive) {
      return <Badge className="bg-red-100 text-red-800">Inactivo</Badge>
    }
    if (!onboardingCompleted) {
      return <Badge className="bg-yellow-100 text-yellow-800">Onboarding</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Activo</Badge>
  }

  const getInvitationStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      accepted: { label: 'Aceptada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
      expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    const Icon = statusInfo.icon
    return (
      <Badge className={statusInfo.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    )
  }

  // Handlers para acciones de usuario
  const handleCreateUser = async (e) => {
    e.preventDefault()

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch(`${API_BASE}/api/users/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUserData)
      })

      if (response.ok) {
        toast.success('Usuario creado exitosamente')
        setShowNewUserModal(false)
        setNewUserData({
          email: '',
          first_name: '',
          last_name: '',
          dpi: '',
          nit: '',
          position: '',
          department: '',
          role: 'viewer',
          hire_date: '',
          supervisor_id: '',
          contract_type: 'permanent',
          salary_range: '',
          phone: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          address: '',
          birth_date: '',
          gender: '',
          marital_status: '',
          bio: '',
          skills: []
        })
        loadUsersAndInvitations()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error creando usuario')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error creando usuario')
    }
  }

  const handleSendInvitation = async (e) => {
    e.preventDefault()

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch(`${API_BASE}/api/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(invitationData)
      })

      if (response.ok) {
        toast.success('Invitación enviada exitosamente')
        setShowInviteModal(false)
        setInvitationData({
          email: '',
          first_name: '',
          last_name: '',
          position: '',
          department: '',
          invited_role: 'viewer',
          invitation_type: 'employee',
          contract_type: 'permanent',
          custom_message: '',
          required_documents: ['CV actualizado', 'Copia de DPI', 'Certificados académicos'],
          expires_in_days: 7
        })
        loadUsersAndInvitations()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error enviando invitación')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error enviando invitación')
    }
  }

  const handleResendInvitation = async (invitationId) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch(`${API_BASE}/api/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Invitación reenviada exitosamente')
        loadUsersAndInvitations()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error reenviando invitación')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error reenviando invitación')
    }
  }

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('¿Estás seguro de cancelar esta invitación?')) return

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch(`${API_BASE}/api/invitations/${invitationId}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Invitación cancelada')
        loadUsersAndInvitations()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error cancelando invitación')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error cancelando invitación')
    }
  }

  const handleViewUser = async (userId) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch(`${API_BASE}/api/users/enhanced/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedUser(data.user)
        setShowUserProfile(true)
      } else {
        toast.error('Error cargando perfil del usuario')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error cargando perfil del usuario')
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Colaboradores</h1>
          <p className="text-gray-600 mt-1">
            Sistema completo de gestión de usuarios MINEDUC Guatemala
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button onClick={() => setShowNewUserModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
          <Button variant="outline" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Colaborador
          </Button>
          <Button variant="outline" onClick={() => setShowInvitationManager(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Gestionar Invitaciones
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
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
                  {users.filter(u => u.is_active && u.onboarding_completed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Onboarding</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.is_active && !u.onboarding_completed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Invitaciones</p>
                <p className="text-2xl font-bold">
                  {invitations.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar Colaboradores</CardTitle>
          <CardDescription>
            Encuentra colaboradores específicos usando los filtros disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email, DPI, código..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Secretaría General">Secretaría General</SelectItem>
                <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                <SelectItem value="Tecnología">Tecnología</SelectItem>
                <SelectItem value="Administración">Administración</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.contractType} onValueChange={(value) => setFilters({...filters, contractType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="permanent">Permanente</SelectItem>
                <SelectItem value="temporary">Temporal</SelectItem>
                <SelectItem value="consultant">Consultor</SelectItem>
                <SelectItem value="intern">Practicante</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Colaboradores</CardTitle>
          <CardDescription>
            {filteredUsers.length} colaborador(es) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron colaboradores
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando tu primer colaborador'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contratación</TableHead>
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
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                          {user.dpi && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <IdCard className="h-3 w-3 mr-1" />
                              DPI: {user.dpi}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">
                        {user.employee_id || 'No asignado'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.position || 'Sin especificar'}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          {user.department || 'Sin departamento'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {getContractTypeBadge(user.contract_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.is_active, user.onboarding_completed)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(user.hire_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil Completo
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Información
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Documentos
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar Datos
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
      <Dialog open={showNewUserModal} onOpenChange={setShowNewUserModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Colaborador</DialogTitle>
            <DialogDescription>
              Completa la información del nuevo colaborador. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="work">Laboral</TabsTrigger>
                <TabsTrigger value="contact">Contacto</TabsTrigger>
                <TabsTrigger value="additional">Adicional</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="first_name">Nombres *</Label>
                    <Input
                      id="first_name"
                      required
                      value={newUserData.first_name}
                      onChange={(e) => setNewUserData({...newUserData, first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Apellidos *</Label>
                    <Input
                      id="last_name"
                      required
                      value={newUserData.last_name}
                      onChange={(e) => setNewUserData({...newUserData, last_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dpi">DPI (13 dígitos)</Label>
                    <Input
                      id="dpi"
                      placeholder="1234567890123"
                      maxLength={13}
                      value={newUserData.dpi}
                      onChange={(e) => setNewUserData({...newUserData, dpi: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nit">NIT</Label>
                    <Input
                      id="nit"
                      placeholder="12345678-9"
                      value={newUserData.nit}
                      onChange={(e) => setNewUserData({...newUserData, nit: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={newUserData.birth_date}
                      onChange={(e) => setNewUserData({...newUserData, birth_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Género</Label>
                    <Select value={newUserData.gender} onValueChange={(value) => setNewUserData({...newUserData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">No especificar</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="marital_status">Estado Civil</Label>
                    <Select value={newUserData.marital_status} onValueChange={(value) => setNewUserData({...newUserData, marital_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado civil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">No especificar</SelectItem>
                        <SelectItem value="single">Soltero/a</SelectItem>
                        <SelectItem value="married">Casado/a</SelectItem>
                        <SelectItem value="divorced">Divorciado/a</SelectItem>
                        <SelectItem value="widowed">Viudo/a</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="work" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Posición/Cargo *</Label>
                    <Input
                      id="position"
                      required
                      value={newUserData.position}
                      onChange={(e) => setNewUserData({...newUserData, position: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Departamento *</Label>
                    <Select value={newUserData.department} onValueChange={(value) => setNewUserData({...newUserData, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Secretaría General">Secretaría General</SelectItem>
                        <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                        <SelectItem value="Tecnología">Tecnología</SelectItem>
                        <SelectItem value="Administración">Administración</SelectItem>
                        <SelectItem value="Finanzas">Finanzas</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="role">Rol del Sistema *</Label>
                    <Select value={newUserData.role} onValueChange={(value) => setNewUserData({...newUserData, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Visor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contract_type">Tipo de Contrato</Label>
                    <Select value={newUserData.contract_type} onValueChange={(value) => setNewUserData({...newUserData, contract_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Permanente</SelectItem>
                        <SelectItem value="temporary">Temporal</SelectItem>
                        <SelectItem value="consultant">Consultor</SelectItem>
                        <SelectItem value="intern">Practicante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hire_date">Fecha de Contratación</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={newUserData.hire_date}
                      onChange={(e) => setNewUserData({...newUserData, hire_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_range">Rango Salarial</Label>
                    <Input
                      id="salary_range"
                      placeholder="Q5,000 - Q8,000"
                      value={newUserData.salary_range}
                      onChange={(e) => setNewUserData({...newUserData, salary_range: e.target.value})}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      placeholder="+502 1234-5678"
                      value={newUserData.phone}
                      onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_name">Contacto de Emergencia</Label>
                    <Input
                      id="emergency_contact_name"
                      placeholder="Nombre completo"
                      value={newUserData.emergency_contact_name}
                      onChange={(e) => setNewUserData({...newUserData, emergency_contact_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Teléfono de Emergencia</Label>
                    <Input
                      id="emergency_contact_phone"
                      placeholder="+502 1234-5678"
                      value={newUserData.emergency_contact_phone}
                      onChange={(e) => setNewUserData({...newUserData, emergency_contact_phone: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      placeholder="Dirección completa..."
                      value={newUserData.address}
                      onChange={(e) => setNewUserData({...newUserData, address: e.target.value})}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <div>
                  <Label htmlFor="bio">Biografía/Descripción</Label>
                  <Textarea
                    id="bio"
                    placeholder="Información adicional sobre el colaborador..."
                    value={newUserData.bio}
                    onChange={(e) => setNewUserData({...newUserData, bio: e.target.value})}
                  />
                </div>
                {/* Aquí podrían ir campos para skills, certifications, etc. */}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowNewUserModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Colaborador
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Invitación */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Colaborador</DialogTitle>
            <DialogDescription>
              Envía una invitación personalizada para que se una al equipo MINEDUC.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inv_email">Email *</Label>
                <Input
                  id="inv_email"
                  type="email"
                  required
                  value={invitationData.email}
                  onChange={(e) => setInvitationData({...invitationData, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="inv_role">Rol a asignar *</Label>
                <Select value={invitationData.invited_role} onValueChange={(value) => setInvitationData({...invitationData, invited_role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visor</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inv_first_name">Nombres</Label>
                <Input
                  id="inv_first_name"
                  value={invitationData.first_name}
                  onChange={(e) => setInvitationData({...invitationData, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="inv_last_name">Apellidos</Label>
                <Input
                  id="inv_last_name"
                  value={invitationData.last_name}
                  onChange={(e) => setInvitationData({...invitationData, last_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="inv_position">Posición</Label>
                <Input
                  id="inv_position"
                  value={invitationData.position}
                  onChange={(e) => setInvitationData({...invitationData, position: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="inv_department">Departamento</Label>
                <Select value={invitationData.department} onValueChange={(value) => setInvitationData({...invitationData, department: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Secretaría General">Secretaría General</SelectItem>
                    <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                    <SelectItem value="Tecnología">Tecnología</SelectItem>
                    <SelectItem value="Administración">Administración</SelectItem>
                    <SelectItem value="Finanzas">Finanzas</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inv_type">Tipo de Invitación</Label>
                <Select value={invitationData.invitation_type} onValueChange={(value) => setInvitationData({...invitationData, invitation_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="contractor">Contratista</SelectItem>
                    <SelectItem value="consultant">Consultor</SelectItem>
                    <SelectItem value="intern">Practicante</SelectItem>
                    <SelectItem value="temporary">Temporal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inv_expires">Expira en (días)</Label>
                <Select value={invitationData.expires_in_days.toString()} onValueChange={(value) => setInvitationData({...invitationData, expires_in_days: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="14">14 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="inv_message">Mensaje Personalizado</Label>
              <Textarea
                id="inv_message"
                placeholder="Mensaje de bienvenida personalizado (opcional)..."
                value={invitationData.custom_message}
                onChange={(e) => setInvitationData({...invitationData, custom_message: e.target.value})}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                Enviar Invitación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestión de Invitaciones */}
      <Dialog open={showInvitationManager} onOpenChange={setShowInvitationManager}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Invitaciones</DialogTitle>
            <DialogDescription>
              Administra todas las invitaciones enviadas a potenciales colaboradores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay invitaciones
                </h3>
                <p className="text-gray-500">
                  Las invitaciones enviadas aparecerán aquí.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invitado</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invitation.first_name && invitation.last_name
                              ? `${invitation.first_name} ${invitation.last_name}`
                              : invitation.email
                            }
                          </div>
                          <div className="text-sm text-gray-500">{invitation.email}</div>
                          {invitation.department && (
                            <div className="text-sm text-gray-500">{invitation.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invitation.position || 'No especificado'}</TableCell>
                      <TableCell>{getRoleBadge(invitation.invited_role)}</TableCell>
                      <TableCell>{getInvitationStatusBadge(invitation.status)}</TableCell>
                      <TableCell>{formatDate(invitation.created_at)}</TableCell>
                      <TableCell>
                        <div className={invitation.is_expired ? 'text-red-600' : ''}>
                          {formatDate(invitation.expires_at)}
                        </div>
                        {invitation.days_until_expiry !== null && (
                          <div className="text-xs text-gray-500">
                            {invitation.days_until_expiry > 0
                              ? `${Math.floor(invitation.days_until_expiry)} días restantes`
                              : 'Expirada'
                            }
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            {invitation.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Reenviar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelInvitation(invitation.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Perfil de Usuario */}
      {selectedUser && (
        <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <UsersIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {selectedUser.full_name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim()}
                  </div>
                  <div className="text-sm text-gray-500 font-normal">
                    {selectedUser.employee_id} • {selectedUser.position}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="work">Información Laboral</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="team">Equipo</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <IdCard className="h-5 w-5 mr-2" />
                        Información Personal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <p className="font-medium">{selectedUser.phone || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">DPI</p>
                          <p className="font-medium font-mono">{selectedUser.dpi || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">NIT</p>
                          <p className="font-medium font-mono">{selectedUser.nit || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                          <p className="font-medium">{formatDate(selectedUser.birth_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Género</p>
                          <p className="font-medium">
                            {selectedUser.gender === 'M' ? 'Masculino' :
                             selectedUser.gender === 'F' ? 'Femenino' :
                             selectedUser.gender === 'other' ? 'Otro' : 'No especificado'}
                          </p>
                        </div>
                      </div>

                      {selectedUser.address && (
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="font-medium">{selectedUser.address}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Phone className="h-5 w-5 mr-2" />
                        Contacto de Emergencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Nombre</p>
                        <p className="font-medium">{selectedUser.emergency_contact_name || 'No especificado'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <p className="font-medium">{selectedUser.emergency_contact_phone || 'No especificado'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedUser.bio && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Biografía</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{selectedUser.bio}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="work" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Briefcase className="h-5 w-5 mr-2" />
                        Información Laboral
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Código de Empleado</p>
                          <p className="font-medium font-mono">{selectedUser.employee_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Posición</p>
                          <p className="font-medium">{selectedUser.position}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Departamento</p>
                          <p className="font-medium">{selectedUser.department}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Tipo de Contrato</p>
                          <div>{getContractTypeBadge(selectedUser.contract_type)}</div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Fecha de Contratación</p>
                          <p className="font-medium">{formatDate(selectedUser.hire_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Rango Salarial</p>
                          <p className="font-medium">{selectedUser.salary_range || 'No especificado'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        Estado del Sistema
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Rol del Sistema</p>
                        <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estado</p>
                        <div className="mt-1">{getStatusBadge(selectedUser.is_active, selectedUser.onboarding_completed)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Onboarding Completado</p>
                        <div className="flex items-center mt-1">
                          {selectedUser.onboarding_completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mr-1" />
                          )}
                          <span className="text-sm">
                            {selectedUser.onboarding_completed ? 'Sí' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registro</p>
                        <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Documentos del Colaborador
                      </span>
                      <Badge variant="outline">
                        {selectedUser.documents_count || 0} documentos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Funcionalidad de documentos en desarrollo
                      </p>
                      <Button className="mt-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Documento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Supervisor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedUser.supervisor ? (
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <UsersIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {selectedUser.supervisor.first_name} {selectedUser.supervisor.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedUser.supervisor.position}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedUser.supervisor.employee_id}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Sin supervisor asignado</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Equipo</span>
                        <Badge variant="outline">
                          {selectedUser.subordinates_count || 0} subordinados
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedUser.subordinates && selectedUser.subordinates.length > 0 ? (
                        <div className="space-y-2">
                          {selectedUser.subordinates.map((subordinate) => (
                            <div key={subordinate.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                                <UsersIcon className="h-3 w-3" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {subordinate.first_name} {subordinate.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {subordinate.position} • {subordinate.employee_id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">Sin subordinados directos</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default UsersEnhanced