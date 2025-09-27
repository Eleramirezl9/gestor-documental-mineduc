import { useState } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'
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

const DocumentUploadModal = ({ isOpen, onClose, onDocumentCreated }) => {
  const [step, setStep] = useState(1) // 1: info, 2: upload, 3: success
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [documentId, setDocumentId] = useState(null)
  
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

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        toast.error('El título es obligatorio')
        return
      }
      
      try {
        setLoading(true)
        const response = await documentsAPI.create(formData)
        setDocumentId(response.data.document.id)
        setStep(2)
      } catch (error) {
        console.error('Error creando documento:', error)
        
        // Manejar errores de validación y autenticación específicos
        if (error.response?.status === 401) {
          toast.error('Error de autenticación: Por favor, inicie sesión nuevamente')
        } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          const validationMessages = error.response.data.errors.map(err => err.msg || err.message).join(', ')
          toast.error(`Errores de validación: ${validationMessages}`)
        } else {
          toast.error('Error al crear el documento: ' + (error.response?.data?.error || error.message))
        }
      } finally {
        setLoading(false)
      }
    } else if (step === 2) {
      if (!file) {
        toast.error('Debe seleccionar un archivo')
        return
      }
      
      await handleUpload()
    }
  }

  const handleUpload = async () => {
    try {
      setLoading(true)
      setUploadProgress(10)
      
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      
      setUploadProgress(30)
      
      const response = await documentsAPI.uploadToDocument(documentId, uploadFormData)
      
      setUploadProgress(100)
      setStep(3)
      
      if (onDocumentCreated) {
        onDocumentCreated(response.data.document)
      }
      
      toast.success('Documento subido exitosamente')
      
    } catch (error) {
      console.error('Error subiendo archivo:', error)
      toast.error('Error al subir el archivo: ' + (error.response?.data?.error || error.message))
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (step === 3) {
      resetForm()
    }
    onClose()
  }

  const resetForm = () => {
    setStep(1)
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
    setDocumentId(null)
  }

  const handleStartOver = () => {
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {step === 1 && 'Nuevo Documento'}
            {step === 2 && 'Subir Archivo'}
            {step === 3 && 'Documento Creado'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Complete la información básica del documento'}
            {step === 2 && 'Seleccione el archivo a subir'}
            {step === 3 && 'Su documento ha sido creado exitosamente'}
          </DialogDescription>
        </DialogHeader>

        {/* Paso 1: Información del documento */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título * (mínimo 3 caracteres)</Label>
              <Input
                id="title"
                placeholder="Título del documento (mínimo 3 caracteres)"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1"
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
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
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
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
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
                        onClick={() => handleRemoveTag(tag)}
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
              />
              <Label htmlFor="isPublic">Documento público</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                {loading ? 'Creando...' : 'Continuar'}
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: Subida de archivo */}
        {step === 2 && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                  <FileText className="h-12 w-12 text-blue-500 mx-auto" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium">
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
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    Seleccionar archivo
                  </Button>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <p>Tipos de archivo permitidos: {allowedTypes.join(', ')}</p>
              <p>Tamaño máximo: 50MB</p>
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Subiendo archivo...</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Atrás
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleNext} disabled={loading || !file}>
                  {loading ? 'Subiendo...' : 'Subir Archivo'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Éxito */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">¡Documento creado exitosamente!</h3>
              <p className="text-gray-500 mt-1">
                El documento ha sido subido y está siendo procesado
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h4 className="font-medium mb-2">Detalles del documento:</h4>
              <ul className="text-sm space-y-1">
                <li><strong>Título:</strong> {formData.title}</li>
                {formData.description && (
                  <li><strong>Descripción:</strong> {formData.description}</li>
                )}
                {file && (
                  <li><strong>Archivo:</strong> {file.name}</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleStartOver}>
                Subir Otro
              </Button>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DocumentUploadModal