import { useState, useEffect } from 'react'
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar,
  User,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  RefreshCw
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
import { auditAPI } from '../lib/api'
import toast from 'react-hot-toast'

const Audit = () => {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('30days')
  const [filteredLogs, setFilteredLogs] = useState([])

  useEffect(() => {
    loadAuditLogs()
  }, [selectedAction, selectedPeriod])

  useEffect(() => {
    const filtered = auditLogs.filter(log => 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredLogs(filtered)
  }, [searchTerm, auditLogs])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      const response = await auditAPI.getLogs({
        action: selectedAction !== 'all' ? selectedAction : undefined,
        period: selectedPeriod
      })
      setAuditLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error cargando logs de auditoría:', error)
      toast.error('Error al cargar los logs de auditoría')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'update':
        return <Activity className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'login':
        return <User className="h-4 w-4 text-purple-600" />
      case 'logout':
        return <User className="h-4 w-4 text-gray-600" />
      case 'view':
        return <Eye className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionBadge = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800">Crear</Badge>
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800">Actualizar</Badge>
      case 'delete':
        return <Badge className="bg-red-100 text-red-800">Eliminar</Badge>
      case 'login':
        return <Badge className="bg-purple-100 text-purple-800">Iniciar Sesión</Badge>
      case 'logout':
        return <Badge className="bg-gray-100 text-gray-800">Cerrar Sesión</Badge>
      case 'view':
        return <Badge className="bg-blue-100 text-blue-800">Ver</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{action || 'Desconocido'}</Badge>
    }
  }

  const getRiskLevel = (action, details) => {
    if (action?.toLowerCase() === 'delete') return 'high'
    if (action?.toLowerCase() === 'update' && details?.includes('security')) return 'high'
    if (action?.toLowerCase() === 'login' && details?.includes('failed')) return 'medium'
    if (action?.toLowerCase() === 'create') return 'low'
    return 'low'
  }

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">Alto</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medio</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Bajo</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExportLogs = () => {
    toast('Exportando logs de auditoría', { icon: '📋' })
  }

  const handleRefreshLogs = () => {
    loadAuditLogs()
    toast.success('Logs actualizados')
  }

  const actions = [
    { value: 'all', label: 'Todas las acciones' },
    { value: 'create', label: 'Crear' },
    { value: 'update', label: 'Actualizar' },
    { value: 'delete', label: 'Eliminar' },
    { value: 'login', label: 'Iniciar sesión' },
    { value: 'logout', label: 'Cerrar sesión' },
    { value: 'view', label: 'Ver' }
  ]

  const periods = [
    { value: '24hours', label: 'Últimas 24 horas' },
    { value: '7days', label: 'Últimos 7 días' },
    { value: '30days', label: 'Últimos 30 días' },
    { value: '3months', label: 'Últimos 3 meses' }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-600 mt-1">
            Monitorea todas las actividades y cambios en el sistema
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={handleRefreshLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Auditoría</CardTitle>
          <CardDescription>
            Filtra los logs de auditoría por acción, usuario o período de tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por usuario, acción o detalles..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {actions.find(a => a.value === selectedAction)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Tipo de acción</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.value}
                    onClick={() => setSelectedAction(action.value)}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Eventos</p>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Alto Riesgo</p>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(log => getRiskLevel(log.action, log.details) === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Usuarios Únicos</p>
                <p className="text-2xl font-bold">
                  {new Set(auditLogs.map(log => log.user_email)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Última Actividad</p>
                <p className="text-sm font-bold">
                  {auditLogs.length > 0 ? formatDate(auditLogs[0]?.created_at) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de logs de auditoría */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoría</CardTitle>
          <CardDescription>
            {filteredLogs.length} evento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron eventos de auditoría
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay actividad registrada en el período seleccionado'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">
                            {log.user_email || 'Sistema'}
                          </div>
                          <div className="text-xs text-gray-500">
                            IP: {log.ip_address || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">
                          {log.resource_type || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRiskBadge(getRiskLevel(log.action, log.details))}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">
                          {log.details || 'Sin detalles adicionales'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Audit