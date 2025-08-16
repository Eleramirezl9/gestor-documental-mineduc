import { useState } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import toast from 'react-hot-toast'
import { documentsAPI } from '../lib/api'
import FileExplorer from './FileExplorer'

const SimpleUploadModal = ({ isOpen, onClose, onDocumentCreated }) => {
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    tags: [],
    isPublic: false
  })
  
  const [tagInput, setTagInput] = useState('')
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(false)

  const categories = [
    { id: '1', name: 'Resoluciones Ministeriales' },
    { id: '2', name: 'Acuerdos Gubernativos' },
    { id: '3', name: 'Circulares' },
    { id: '4', name: 'Instructivos' },
    { id: '5', name: 'Manuales' },
    { id: '6', name: 'Otros' }
  ]

  const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif']
  const maxFileSize = 50 * 1024 * 1024 // 50MB

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No se seleccionó ningún archivo' }
    
    const extension = file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(extension)) {
      return { 
        valid: false, 
        error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}` 
      }
    }
    
    if (file.size > maxFileSize) {
      return { 
        valid: false, 
        error: 'El archivo es demasiado grande. Tamaño máximo: 50MB' 
      }
    }
    
    return { valid: true }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      const validation = validateFile(files[0])
      if (validation.valid) {
        setFile(files[0])
      } else {
        toast.error(validation.error)
      }
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const validation = validateFile(selectedFile)
      if (validation.valid) {
        setFile(selectedFile)
      } else {
        toast.error(validation.error)
      }
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio')
      return
    }
    
    if (!file) {
      toast.error('Debe seleccionar un archivo')
      return
    }
    
    try {
      setLoading(true)
      setUploadProgress(10)
      
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('categoryId', formData.categoryId)
      uploadFormData.append('tags', formData.tags.join(','))
      uploadFormData.append('isPublic', formData.isPublic)
      
      setUploadProgress(50)
      
      const response = await documentsAPI.upload(uploadFormData)
      
      setUploadProgress(100)
      setSuccess(true)
      
      if (onDocumentCreated) {
        onDocumentCreated(response.data.document)
      }
      
      toast.success('Documento subido exitosamente')
      
      setTimeout(() => {
        handleClose()
      }, 2000)
      
    } catch (error) {
      console.error('Error subiendo documento:', error)
      
      // Manejar errores de validación específicos
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationMessages = error.response.data.errors.map(err => err.msg || err.message).join(', ')
        toast.error(`Errores de validación: ${validationMessages}`)
      } else {
        toast.error('Error al subir el documento: ' + (error.response?.data?.error || error.message))
      }
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryId: '',
      tags: [],
      isPublic: false
    })
    setTagInput('')
    setFile(null)
    setUploadProgress(0)
    setSuccess(false)
    setShowFileExplorer(false)
  }

  const handleFileFromExplorer = (selectedFile) => {
    setFile(selectedFile)
    setShowFileExplorer(false)
    toast.success(`Archivo seleccionado: ${selectedFile.name}`)
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">¡Documento subido exitosamente!</h3>
              <p className="text-gray-500 mt-1">
                El documento ha sido procesado y está disponible
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento
          </DialogTitle>
          <DialogDescription>
            Complete la información y seleccione el archivo a subir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título * (mínimo 3 caracteres)</Label>
            <Input
              id="title"
              placeholder="Título del documento (mínimo 3 caracteres)"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="mt-1"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción del documento"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-1"
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <Select 
              value={formData.categoryId} 
              onValueChange={(value) => handleInputChange('categoryId', value)}
              disabled={loading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags">Etiquetas</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="tags"
                placeholder="Agregar etiqueta"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                disabled={loading}
              />
              <Button type="button" onClick={handleAddTag} variant="outline" disabled={loading}>
                Agregar
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => !loading && handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="rounded"
              disabled={loading}
            />
            <Label htmlFor="isPublic">Documento público</Label>
          </div>

          <div>
            <Label>Archivo *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mt-1 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 text-blue-500 mx-auto" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {!loading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Cambiar archivo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="font-medium">
                      Arrastra tu archivo aquí
                    </p>
                    <p className="text-sm text-gray-500">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload').click()}
                      disabled={loading}
                    >
                      Seleccionar archivo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowFileExplorer(true)}
                      disabled={loading}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Explorar Sistema
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Tipos permitidos: {allowedTypes.join(', ')} • Máximo: 50MB
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Procesando documento...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.title.trim() || !file}>
              {loading ? 'Subiendo...' : 'Subir Documento'}
            </Button>
          </div>
        </div>

        {/* Explorador de archivos */}
        <FileExplorer
          isOpen={showFileExplorer}
          onClose={() => setShowFileExplorer(false)}
          onFileSelect={handleFileFromExplorer}
          allowedTypes={allowedTypes}
        />
      </DialogContent>
    </Dialog>
  )
}

export default SimpleUploadModal