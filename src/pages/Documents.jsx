import { useState, useEffect } from 'react'
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  Tag,
  ExternalLink
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { documentsAPI } from '../lib/api'
import DocumentUploadModal from '../components/DocumentUploadModal'
import SimpleUploadModal from '../components/SimpleUploadModal'
import DocumentGenerator from '../components/DocumentGenerator'
import toast from 'react-hot-toast'

const Documents = () => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredDocuments, setFilteredDocuments] = useState([])
  
  // Estados para modales
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSimpleUploadModal, setShowSimpleUploadModal] = useState(false)
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false)
  
  // Estados para confirmación de eliminación
  const [deleteDialog, setDeleteDialog] = useState({ open: false, documentId: null, documentTitle: '' })

  useEffect(() => {
    loadDocuments()
  }, [])

  useEffect(() => {
    // Filtrar documentos basado en el término de búsqueda
    const filtered = documents.filter(doc => 
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredDocuments(filtered)
  }, [searchTerm, documents])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await documentsAPI.getAll()
      setDocuments(response.data.documents || [])
    } catch (error) {
      console.error('Error cargando documentos:', error)
      toast.error('Error al cargar los documentos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Sin estado</Badge>
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleView = async (documentId) => {
    try {
      const response = await documentsAPI.getById(documentId)
      const document = response.data.document
      
      // Crear una nueva ventana/pestaña con información del documento
      const content = `
        <html>
          <head>
            <title>${document.title}</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
              .meta { color: #666; font-size: 14px; }
              .content { line-height: 1.6; }
              .badge { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${document.title}</div>
              <div class="meta">
                Archivo: ${document.file_name || 'Sin archivo'} | 
                Fecha: ${formatDate(document.created_at)} | 
                Estado: ${document.status}
              </div>
            </div>
            <div class="content">
              ${document.description ? `<p><strong>Descripción:</strong> ${document.description}</p>` : ''}
              ${document.tags && document.tags.length > 0 ? `
                <p><strong>Etiquetas:</strong> ${document.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}</p>
              ` : ''}
              ${document.extracted_text ? `
                <h3>Texto extraído (OCR):</h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${document.extracted_text}</div>
              ` : ''}
            </div>
          </body>
        </html>
      `
      
      const newWindow = window.open('', '_blank')
      newWindow.document.write(content)
      newWindow.document.close()
      
    } catch (error) {
      console.error('Error obteniendo documento:', error)
      toast.error('Error al cargar el documento')
    }
  }

  const handleEdit = (documentId) => {
    toast(`Funcionalidad de edición próximamente`, { icon: '✏️' })
    // TODO: Implementar modal de edición
  }

  const handleDelete = (document) => {
    setDeleteDialog({
      open: true,
      documentId: document.id,
      documentTitle: document.title
    })
  }

  const confirmDelete = async () => {
    try {
      await documentsAPI.delete(deleteDialog.documentId)
      toast.success('Documento eliminado exitosamente')
      loadDocuments() // Recargar lista
    } catch (error) {
      console.error('Error eliminando documento:', error)
      toast.error('Error al eliminar el documento')
    } finally {
      setDeleteDialog({ open: false, documentId: null, documentTitle: '' })
    }
  }

  const handleDownload = async (documentId) => {
    try {
      const loadingToast = toast.loading('Preparando descarga...')
      
      const response = await documentsAPI.getDownloadUrl(documentId)
      const { downloadUrl, fileName } = response.data
      
      // Crear un enlace temporal para descargar
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.dismiss(loadingToast)
      toast.success('Descarga iniciada')
      
    } catch (error) {
      console.error('Error descargando documento:', error)
      toast.error('Error al descargar el documento')
    }
  }

  const handleDocumentCreated = (newDocument) => {
    setDocuments(prev => [newDocument, ...prev])
    setShowUploadModal(false)
    setShowSimpleUploadModal(false)
  }

  const handleDocumentGenerated = (generatedDoc) => {
    toast.success(`${generatedDoc.type === 'pdf' ? 'PDF' : 'Excel'} generado: ${generatedDoc.fileName}`)
    setShowDocumentGenerator(false)
    // Opcionalmente podrías agregar el documento generado a la lista
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
          <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona todos los documentos del sistema
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <Button onClick={() => setShowDocumentGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Documento
          </Button>
          <Button variant="outline" onClick={() => setShowUploadModal(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Nuevo Documento
          </Button>
          <Button variant="outline" onClick={() => setShowSimpleUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivo
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar</CardTitle>
          <CardDescription>
            Encuentra documentos específicos usando los filtros disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por título, descripción o nombre de archivo..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline">
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
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobados</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rechazados</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
          <CardDescription>
            {filteredDocuments.length} documento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron documentos
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza subiendo tu primer documento'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {document.title || 'Sin título'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {document.description || 'Sin descripción'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(document.status)}
                    </TableCell>
                    <TableCell>
                      {formatDate(document.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {document.file_name || 'Sin archivo'}
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
                          <DropdownMenuItem onClick={() => handleView(document.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(document.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(document)}
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

      {/* Modales */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onDocumentCreated={handleDocumentCreated}
      />

      <SimpleUploadModal
        isOpen={showSimpleUploadModal}
        onClose={() => setShowSimpleUploadModal(false)}
        onDocumentCreated={handleDocumentCreated}
      />

      <DocumentGenerator
        isOpen={showDocumentGenerator}
        onClose={() => setShowDocumentGenerator(false)}
        onDocumentGenerated={handleDocumentGenerated}
      />

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, documentId: null, documentTitle: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el documento
              <strong> "{deleteDialog.documentTitle}"</strong> y su archivo asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Documents