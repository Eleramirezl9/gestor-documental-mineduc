import { useState, useEffect } from 'react'
import { 
  Folder, 
  File, 
  FileText, 
  FileSpreadsheet,
  Image,
  ArrowLeft,
  HardDrive,
  Home,
  FolderOpen,
  Upload,
  Plus,
  RefreshCw
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Separator } from './ui/separator'
import toast from 'react-hot-toast'

const FileExplorer = ({ isOpen, onClose, onFileSelect, allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'] }) => {
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [pathHistory, setPathHistory] = useState([])

  // Rutas comunes de Windows
  const commonPaths = [
    { name: 'Escritorio', path: 'C:\\Users\\eddyr\\OneDrive\\Escritorio', icon: Home },
    { name: 'Descargas', path: 'C:\\Users\\eddyr\\Downloads', icon: Folder },
    { name: 'Documentos', path: 'C:\\Users\\eddyr\\OneDrive\\Documentos', icon: FileText },
    { name: 'Imágenes', path: 'C:\\Users\\eddyr\\OneDrive\\Imágenes', icon: Image }
  ]

  useEffect(() => {
    if (isOpen) {
      // Iniciar en el escritorio
      navigateToPath('C:\\Users\\eddyr\\OneDrive\\Escritorio')
    }
  }, [isOpen])

  const getFileIcon = (fileName, isDirectory) => {
    if (isDirectory) return <Folder className="h-5 w-5 text-blue-500" />
    
    const extension = fileName.split('.').pop().toLowerCase()
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-5 w-5 text-purple-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const isFileAllowed = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    return allowedTypes.includes(extension)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const navigateToPath = async (path) => {
    try {
      setLoading(true)
      
      // Simular lectura de directorio - en una aplicación real esto requeriría una API del backend
      // Por ahora, simularemos algunos archivos comunes
      const simulatedFiles = await simulateDirectoryListing(path)
      
      setFiles(simulatedFiles)
      setCurrentPath(path)
      setSelectedFile(null)
      
    } catch (error) {
      console.error('Error navegando a:', path, error)
      toast.error('Error al acceder a la carpeta')
    } finally {
      setLoading(false)
    }
  }

  // Simulación de listado de directorio (en producción esto sería una llamada al backend)
  const simulateDirectoryListing = async (path) => {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Archivos simulados según la ruta
    const simulatedFiles = []
    
    if (path.includes('Escritorio')) {
      simulatedFiles.push(
        { name: 'Documentos', isDirectory: true, size: 0, modified: new Date() },
        { name: 'Proyecto.docx', isDirectory: false, size: 256000, modified: new Date() },
        { name: 'Presupuesto.xlsx', isDirectory: false, size: 45000, modified: new Date() },
        { name: 'Informe.pdf', isDirectory: false, size: 1200000, modified: new Date() },
        { name: 'Imagen.jpg', isDirectory: false, size: 800000, modified: new Date() }
      )
    } else if (path.includes('Downloads')) {
      simulatedFiles.push(
        { name: 'Manual.pdf', isDirectory: false, size: 2500000, modified: new Date() },
        { name: 'Datos.xlsx', isDirectory: false, size: 150000, modified: new Date() },
        { name: 'Captura.png', isDirectory: false, size: 500000, modified: new Date() }
      )
    } else if (path.includes('Documentos')) {
      simulatedFiles.push(
        { name: 'Oficiales', isDirectory: true, size: 0, modified: new Date() },
        { name: 'Contratos', isDirectory: true, size: 0, modified: new Date() },
        { name: 'Reporte_Anual.docx', isDirectory: false, size: 890000, modified: new Date() },
        { name: 'Estadisticas.xlsx', isDirectory: false, size: 67000, modified: new Date() }
      )
    } else {
      // Directorio genérico
      simulatedFiles.push(
        { name: 'Carpeta 1', isDirectory: true, size: 0, modified: new Date() },
        { name: 'Archivo.pdf', isDirectory: false, size: 500000, modified: new Date() }
      )
    }
    
    return simulatedFiles
  }

  const handleFileDoubleClick = (file) => {
    if (file.isDirectory) {
      const newPath = `${currentPath}\\${file.name}`
      setPathHistory([...pathHistory, currentPath])
      navigateToPath(newPath)
    } else if (isFileAllowed(file.name)) {
      handleFileSelection(file)
    } else {
      toast.error('Tipo de archivo no permitido')
    }
  }

  const handleFileSelection = (file) => {
    if (!file.isDirectory && isFileAllowed(file.name)) {
      // Crear un objeto File simulado
      const simulatedFile = new File([''], file.name, { 
        type: getMimeType(file.name),
        lastModified: file.modified 
      })
      
      // Agregar propiedades adicionales
      Object.defineProperty(simulatedFile, 'size', {
        value: file.size,
        writable: false
      })
      
      onFileSelect(simulatedFile)
      onClose()
      toast.success(`Archivo seleccionado: ${file.name}`)
    }
  }

  const getMimeType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    }
    return mimeTypes[extension] || 'application/octet-stream'
  }

  const goBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1]
      setPathHistory(pathHistory.slice(0, -1))
      navigateToPath(previousPath)
    }
  }

  const breadcrumbParts = currentPath.split('\\').filter(part => part)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Explorador de Archivos
          </DialogTitle>
          <DialogDescription>
            Navega y selecciona archivos desde tu sistema. Tipos permitidos: {allowedTypes.join(', ')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 h-[70vh]">
          {/* Barra de navegación */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              disabled={pathHistory.length === 0}
              title="Ir atrás"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Atrás</span>
            </Button>
            
            <div className="flex-1">
              <Input
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && navigateToPath(currentPath)}
                placeholder="Ruta del directorio"
                className="font-mono text-sm"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPath(currentPath)}
              disabled={loading}
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <HardDrive className="h-4 w-4" />
            {breadcrumbParts.map((part, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && <span>\\</span>}
                <span className="hover:text-blue-600 cursor-pointer">{part}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
            {/* Panel lateral - Accesos rápidos */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Accesos Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {commonPaths.map((path) => (
                  <Button
                    key={path.path}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigateToPath(path.path)}
                  >
                    <path.icon className="h-4 w-4 mr-2" />
                    {path.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Panel principal - Lista de archivos */}
            <Card className="md:col-span-3">
              <CardContent className="p-0">
                <ScrollArea className="h-[50vh]">
                  {loading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Cargando archivos...</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedFile?.name === file.name
                              ? 'bg-blue-100 border border-blue-300'
                              : 'hover:bg-gray-50'
                          } ${
                            !file.isDirectory && !isFileAllowed(file.name)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          onClick={() => setSelectedFile(file)}
                          onDoubleClick={() => handleFileDoubleClick(file)}
                        >
                          {getFileIcon(file.name, file.isDirectory)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{file.name}</span>
                              {!file.isDirectory && isFileAllowed(file.name) && (
                                <Badge variant="secondary" className="text-xs">
                                  Permitido
                                </Badge>
                              )}
                            </div>
                            {!file.isDirectory && (
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • {file.modified.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {files.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <Folder className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No hay archivos en esta carpeta</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Panel de archivo seleccionado */}
          {selectedFile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(selectedFile.name, selectedFile.isDirectory)}
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      {!selectedFile.isDirectory && (
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {!selectedFile.isDirectory && isFileAllowed(selectedFile.name) && (
                    <Button onClick={() => handleFileSelection(selectedFile)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar Archivo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FileExplorer