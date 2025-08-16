import { useState, useEffect } from 'react'
import { 
  Plus,
  Edit,
  Trash2,
  Users,
  Building,
  Calendar,
  Bell,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Upload,
  Eye
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { useAuth } from '../hooks/useAuth'
import { documentRequirementsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const DocumentRequirementsAdmin = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Estados para datos
  const [documentTypes, setDocumentTypes] = useState([])
  const [departmentSummaries, setDepartmentSummaries] = useState([])
  const [globalSummary, setGlobalSummary] = useState(null)
  const [userRequirements, setUserRequirements] = useState([])

  // Estados para modales y formularios
  const [createTypeModalOpen, setCreateTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  // Estados para filtros
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Form states
  const [newDocumentType, setNewDocumentType] = useState({
    name: '',
    description: '',
    category_id: '',
    validity_period_months: 12,
    requires_renewal: true,
    reminder_before_days: 7,
    urgent_reminder_days: 1,
    required_for_roles: ['admin', 'editor', 'viewer'],
    required_for_departments: [],
    is_mandatory: true
  })

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'editor') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadDocumentTypes(),
        loadGlobalSummary(),
        loadDepartmentSummaries(),
        loadUserRequirements()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentTypes = async () => {
    try {
      const response = await documentRequirementsAPI.getDocumentTypes()
      setDocumentTypes(response.data || [])
    } catch (error) {
      console.error('Error cargando tipos de documentos:', error)
    }
  }

  const loadGlobalSummary = async () => {
    try {
      const response = await documentRequirementsAPI.getGlobalSummary()
      setGlobalSummary(response.data)
    } catch (error) {
      console.error('Error cargando resumen global:', error)
    }
  }

  const loadDepartmentSummaries = async () => {
    try {
      const response = await documentRequirementsAPI.getAllDepartmentSummaries()
      setDepartmentSummaries(response.data || [])
    } catch (error) {
      console.error('Error cargando resúmenes departamentales:', error)
    }
  }

  const loadUserRequirements = async () => {
    try {
      const response = await documentRequirementsAPI.getAllUserRequirements({
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        document_type: typeFilter !== 'all' ? typeFilter : undefined
      })
      setUserRequirements(response.data || [])
    } catch (error) {
      console.error('Error cargando requerimientos de usuarios:', error)
    }
  }

  const handleCreateDocumentType = async (e) => {
    e.preventDefault()
    try {
      await documentRequirementsAPI.createDocumentType(newDocumentType)
      toast.success('Tipo de documento creado exitosamente')
      setCreateTypeModalOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error creando tipo de documento:', error)
      toast.error('Error al crear el tipo de documento')
    }
  }

  const handleUpdateDocumentType = async (e) => {
    e.preventDefault()
    try {
      await documentRequirementsAPI.updateDocumentType(editingType.id, newDocumentType)
      toast.success('Tipo de documento actualizado exitosamente')
      setEditingType(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error actualizando tipo de documento:', error)
      toast.error('Error al actualizar el tipo de documento')
    }
  }

  const handleDeleteDocumentType = async (typeId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tipo de documento?')) return
    
    try {
      await documentRequirementsAPI.deleteDocumentType(typeId)
      toast.success('Tipo de documento eliminado exitosamente')
      loadData()
    } catch (error) {
      console.error('Error eliminando tipo de documento:', error)
      toast.error('Error al eliminar el tipo de documento')
    }
  }

  const resetForm = () => {
    setNewDocumentType({
      name: '',
      description: '',
      category_id: '',
      validity_period_months: 12,
      requires_renewal: true,
      reminder_before_days: 7,
      urgent_reminder_days: 1,
      required_for_roles: ['admin', 'editor', 'viewer'],
      required_for_departments: [],
      is_mandatory: true
    })
  }

  const startEdit = (type) => {
    setEditingType(type)
    setNewDocumentType({ ...type })
  }

  const getPriorityColor = (level) => {
    switch (level) {
      case 'expired':
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'urgent':
        return 'bg-orange-100 text-orange-800'
      case 'warning':
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'ok':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando panel administrativo...</span>
      </div>
    )
  }

  if (user?.role === 'viewer') {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Acceso Restringido</h3>
          <p className="text-gray-600">No tienes permisos para acceder al panel administrativo.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas globales */}
      {globalSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Usuarios</p>
                  <p className="text-2xl font-bold">{globalSummary.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Docs. Aprobados</p>
                  <p className="text-2xl font-bold">{globalSummary.approved_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Pendientes</p>
                  <p className="text-2xl font-bold">{globalSummary.pending_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Vencidos</p>
                  <p className="text-2xl font-bold">{globalSummary.expired_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="document-types">Tipos de Documentos</TabsTrigger>
          <TabsTrigger value="user-requirements">Requerimientos</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen General */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Documentos por estado */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Estado</CardTitle>
                <CardDescription>Distribución actual de documentos</CardDescription>
              </CardHeader>
              <CardContent>
                {globalSummary && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Aprobados
                      </span>
                      <span className="font-semibold">{globalSummary.approved_documents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        Pendientes
                      </span>
                      <span className="font-semibold">{globalSummary.pending_documents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        Vencidos
                      </span>
                      <span className="font-semibold">{globalSummary.expired_documents}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acciones rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>Tareas administrativas comunes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setCreateTypeModalOpen(true)} className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Tipo de Documento
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Usuarios
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reportes
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Enviar Recordatorios
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Resumen por departamento */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Departamento</CardTitle>
              <CardDescription>Estado de documentos por área</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Total Usuarios</TableHead>
                      <TableHead>Aprobados</TableHead>
                      <TableHead>Pendientes</TableHead>
                      <TableHead>Vencidos</TableHead>
                      <TableHead>% Cumplimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentSummaries.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell>{dept.total_users}</TableCell>
                        <TableCell>{dept.approved_documents}</TableCell>
                        <TableCell>{dept.pending_documents}</TableCell>
                        <TableCell>{dept.expired_documents}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(dept.compliance_percentage > 80 ? 'ok' : 'warning')}>
                            {dept.compliance_percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tipos de Documentos */}
        <TabsContent value="document-types" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Tipos de Documentos</h2>
              <p className="text-gray-600">Gestiona los tipos de documentos requeridos en la organización</p>
            </div>
            <Button onClick={() => setCreateTypeModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>

          <div className="grid gap-4">
            {documentTypes.map((type) => (
              <Card key={type.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{type.name}</h3>
                        {type.is_mandatory && (
                          <Badge variant="destructive">Obligatorio</Badge>
                        )}
                        {!type.is_active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{type.description}</p>
                      
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                          <span className="font-medium">Validez:</span> {type.validity_period_months} meses
                        </div>
                        <div>
                          <span className="font-medium">Recordatorio:</span> {type.reminder_before_days} días antes
                        </div>
                        <div>
                          <span className="font-medium">Urgente:</span> {type.urgent_reminder_days} días antes
                        </div>
                        <div>
                          <span className="font-medium">Renovación:</span> {type.requires_renewal ? 'Sí' : 'No'}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <span className="font-medium">Aplica a roles:</span> {type.required_for_roles.join(', ')}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => startEdit(type)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteDocumentType(type.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Requerimientos de Usuarios */}
        <TabsContent value="user-requirements" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Requerimientos de Usuarios</h2>
              <p className="text-gray-600">Supervisa el estado de documentos por usuario</p>
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departmentSummaries.map((dept) => (
                      <SelectItem key={dept.department} value={dept.department}>
                        {dept.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button onClick={loadUserRequirements}>
                  <Filter className="h-4 w-4 mr-2" />
                  Aplicar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de requerimientos */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRequirements.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.user_name}
                          <div className="text-sm text-gray-500">{req.user_email}</div>
                        </TableCell>
                        <TableCell>{req.department}</TableCell>
                        <TableCell>{req.document_type_name}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(req.status)}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(req.required_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {req.expiration_date ? new Date(req.expiration_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Bell className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Departamentos */}
        <TabsContent value="departments" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Gestión por Departamentos</h2>
            <p className="text-gray-600">Supervisa el cumplimiento por área organizacional</p>
          </div>

          <div className="grid gap-6">
            {departmentSummaries.map((dept) => (
              <Card key={dept.department}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {dept.department}
                  </CardTitle>
                  <CardDescription>
                    {dept.total_users} usuarios • {dept.compliance_percentage}% cumplimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{dept.approved_documents}</div>
                      <div className="text-sm text-green-600">Aprobados</div>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-600">{dept.pending_documents}</div>
                      <div className="text-sm text-yellow-600">Pendientes</div>
                    </div>
                    
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">{dept.expired_documents}</div>
                      <div className="text-sm text-red-600">Vencidos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal para crear/editar tipo de documento */}
      <Dialog open={createTypeModalOpen || editingType} onOpenChange={(open) => {
        if (!open) {
          setCreateTypeModalOpen(false)
          setEditingType(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Documento' : 'Crear Nuevo Tipo de Documento'}
            </DialogTitle>
            <DialogDescription>
              Configure los parámetros para el tipo de documento requerido
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingType ? handleUpdateDocumentType : handleCreateDocumentType} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newDocumentType.name}
                  onChange={(e) => setNewDocumentType({...newDocumentType, name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="validity_period">Validez (meses)</Label>
                <Input
                  id="validity_period"
                  type="number"
                  value={newDocumentType.validity_period_months}
                  onChange={(e) => setNewDocumentType({...newDocumentType, validity_period_months: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newDocumentType.description}
                onChange={(e) => setNewDocumentType({...newDocumentType, description: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="reminder_days">Recordatorio (días antes)</Label>
                <Input
                  id="reminder_days"
                  type="number"
                  value={newDocumentType.reminder_before_days}
                  onChange={(e) => setNewDocumentType({...newDocumentType, reminder_before_days: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label htmlFor="urgent_days">Recordatorio urgente (días antes)</Label>
                <Input
                  id="urgent_days"
                  type="number"
                  value={newDocumentType.urgent_reminder_days}
                  onChange={(e) => setNewDocumentType({...newDocumentType, urgent_reminder_days: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mandatory"
                checked={newDocumentType.is_mandatory}
                onCheckedChange={(checked) => setNewDocumentType({...newDocumentType, is_mandatory: checked})}
              />
              <Label htmlFor="mandatory">Documento obligatorio</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="renewal"
                checked={newDocumentType.requires_renewal}
                onCheckedChange={(checked) => setNewDocumentType({...newDocumentType, requires_renewal: checked})}
              />
              <Label htmlFor="renewal">Requiere renovación</Label>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingType ? 'Actualizar' : 'Crear'} Tipo de Documento
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setCreateTypeModalOpen(false)
                setEditingType(null)
                resetForm()
              }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentRequirementsAdmin