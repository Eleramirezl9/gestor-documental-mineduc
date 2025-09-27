import { useState, useEffect } from 'react'
import { 
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  Upload,
  Download,
  Bell,
  BellOff,
  Filter,
  Search,
  User,
  Users,
  Building
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { DocumentUploadModal } from './DocumentUploadModal'
import { useAuth } from '../hooks/useAuth'
import { documentRequirementsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const DocumentRequirements = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-documents')
  
  // Estados para documentos del usuario
  const [myDocuments, setMyDocuments] = useState([])
  const [pendingDocs, setPendingDocs] = useState([])
  const [expiringDocs, setExpiringDocs] = useState([])
  
  // Estados para vista departamental (solo admins/editors)
  const [departmentSummary, setDepartmentSummary] = useState(null)
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  
  // Estados para modales
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState(null)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      await Promise.all([
        loadMyDocuments(),
        loadPendingDocuments(),
        loadExpiringDocuments(),
        user.role !== 'viewer' ? loadDepartmentSummary() : Promise.resolve()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los documentos')
    } finally {
      setLoading(false)
    }
  }

  const loadMyDocuments = async () => {
    try {
      const response = await documentRequirementsAPI.getMyRequirements()
      setMyDocuments(response.data || [])
    } catch (error) {
      console.error('Error cargando mis documentos:', error)
    }
  }

  const loadPendingDocuments = async () => {
    try {
      const response = await documentRequirementsAPI.getPendingDocuments()
      setPendingDocs(response.data || [])
    } catch (error) {
      console.error('Error cargando documentos pendientes:', error)
    }
  }

  const loadExpiringDocuments = async () => {
    try {
      const response = await documentRequirementsAPI.getExpiringDocuments()
      setExpiringDocs(response.data || [])
    } catch (error) {
      console.error('Error cargando documentos próximos a vencer:', error)
    }
  }

  const loadDepartmentSummary = async () => {
    try {
      const response = await documentRequirementsAPI.getDepartmentSummary(user.department)
      setDepartmentSummary(response.data)
    } catch (error) {
      console.error('Error cargando resumen departamental:', error)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'expired':
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'warning':
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ok':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'expired':
      case 'overdue':
        return <X className="h-4 w-4" />
      case 'urgent':
        return <AlertCircle className="h-4 w-4" />
      case 'warning':
      case 'due_soon':
        return <Clock className="h-4 w-4" />
      case 'ok':
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No definida'
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDaysUntil = (date, label = 'días') => {
    if (!date) return 'No definida'
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    
    if (days < 0) return `Vencido hace ${Math.abs(days)} ${label}`
    if (days === 0) return 'Vence hoy'
    if (days === 1) return 'Vence mañana'
    return `${days} ${label} restantes`
  }

  const handleUploadDocument = (requirement) => {
    setSelectedRequirement(requirement)
    setUploadModalOpen(true)
  }

  const handleUploadSuccess = () => {
    setUploadModalOpen(false)
    setSelectedRequirement(null)
    loadData()
    toast.success('Documento subido exitosamente')
  }

  const filterDocuments = (documents) => {
    return documents.filter(doc => {
      const matchesSearch = doc.document_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
      
      const matchesPriority = priorityFilter === 'all' || 
                             doc.urgency_level === priorityFilter ||
                             doc.priority_level === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando documentos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Documentos</p>
                <p className="text-2xl font-bold">{myDocuments.length}</p>
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
                <p className="text-2xl font-bold">{pendingDocs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Por Vencer</p>
                <p className="text-2xl font-bold">
                  {expiringDocs.filter(d => d.urgency_level !== 'ok').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Aprobados</p>
                <p className="text-2xl font-bold">
                  {myDocuments.filter(d => d.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="submitted">Enviados</SelectItem>
                <SelectItem value="approved">Aprobados</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="ok">Normales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-documents" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mis Documentos
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes
            {pendingDocs.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingDocs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Por Vencer
            {expiringDocs.filter(d => d.urgency_level !== 'ok').length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {expiringDocs.filter(d => d.urgency_level !== 'ok').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Mis Documentos */}
        <TabsContent value="my-documents" className="space-y-4">
          <div className="grid gap-4">
            {filterDocuments(myDocuments).map((doc) => (
              <Card key={doc.id} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{doc.document_type_name}</h3>
                        <Badge className={getPriorityColor(doc.status)}>
                          {getPriorityIcon(doc.status)}
                          <span className="ml-1 capitalize">{doc.status}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{doc.description}</p>
                      
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                        {doc.required_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Fecha límite: {formatDate(doc.required_date)}</span>
                          </div>
                        )}
                        
                        {doc.expiration_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>Vence: {formatDate(doc.expiration_date)}</span>
                          </div>
                        )}
                        
                        {doc.next_renewal_date && (
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-gray-400" />
                            <span>Renovación: {formatDate(doc.next_renewal_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {doc.status === 'pending' && (
                        <Button onClick={() => handleUploadDocument(doc)} size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Subir
                        </Button>
                      )}
                      
                      {doc.current_document_title && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Ver Actual
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filterDocuments(myDocuments).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No hay documentos</h3>
                  <p className="text-gray-600">No tienes documentos que coincidan con los filtros seleccionados.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {filterDocuments(pendingDocs).map((doc) => (
              <Card key={doc.id} className="relative border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{doc.document_type_name}</h3>
                        <Badge className={getPriorityColor(doc.priority_level)}>
                          {getPriorityIcon(doc.priority_level)}
                          <span className="ml-1 capitalize">{doc.priority_level}</span>
                        </Badge>
                        {doc.is_mandatory && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Obligatorio
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{doc.description}</p>
                      
                      <div className="text-sm text-gray-600">
                        <p><strong>Fecha límite:</strong> {formatDate(doc.required_date)}</p>
                        <p><strong>Estado:</strong> {formatDaysUntil(doc.required_date)}</p>
                      </div>
                    </div>
                    
                    <Button onClick={() => handleUploadDocument(doc)} size="sm" className="ml-4">
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Documento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filterDocuments(pendingDocs).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">¡Excelente trabajo!</h3>
                  <p className="text-gray-600">No tienes documentos pendientes por entregar.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Por Vencer */}
        <TabsContent value="expiring" className="space-y-4">
          <div className="grid gap-4">
            {filterDocuments(expiringDocs).map((doc) => (
              <Card key={doc.id} className={`relative border-l-4 ${
                doc.urgency_level === 'expired' ? 'border-l-red-500' :
                doc.urgency_level === 'urgent' ? 'border-l-orange-500' :
                'border-l-yellow-500'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{doc.document_type_name}</h3>
                        <Badge className={getPriorityColor(doc.urgency_level)}>
                          {getPriorityIcon(doc.urgency_level)}
                          <span className="ml-1 capitalize">{doc.urgency_level}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        {doc.current_document_title ? `Documento actual: "${doc.current_document_title}"` : doc.description}
                      </p>
                      
                      <div className="text-sm">
                        <p className="text-gray-600">
                          <strong>Fecha de vencimiento:</strong> {formatDate(doc.expiration_date)}
                        </p>
                        <p className={`font-medium ${
                          doc.urgency_level === 'expired' ? 'text-red-600' :
                          doc.urgency_level === 'urgent' ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {formatDaysUntil(doc.expiration_date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button onClick={() => handleUploadDocument(doc)} size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Renovar
                      </Button>
                      
                      {doc.current_document_title && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Ver Actual
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filterDocuments(expiringDocs).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Todos tus documentos están al día</h3>
                  <p className="text-gray-600">No tienes documentos próximos a vencer.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de subida de documentos */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        requirement={selectedRequirement}
      />
    </div>
  )
}

export default DocumentRequirements