import { useState } from 'react'
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Plus,
  Eye,
  Settings,
  X
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Separator } from './ui/separator'
import toast from 'react-hot-toast'

const DocumentGenerator = ({ isOpen, onClose, onDocumentGenerated }) => {
  const [activeTab, setActiveTab] = useState('pdf')
  const [loading, setLoading] = useState(false)
  
  // Estados para PDF
  const [pdfData, setPdfData] = useState({
    title: '',
    content: '',
    author: 'MINEDUC Guatemala',
    subject: '',
    template: 'official'
  })
  
  // Estados para Excel
  const [excelData, setExcelData] = useState({
    fileName: '',
    sheetName: 'Hoja1',
    headers: ['Columna 1', 'Columna 2', 'Columna 3'],
    data: [
      ['Dato 1', 'Dato 2', 'Dato 3'],
      ['Dato 4', 'Dato 5', 'Dato 6']
    ],
    template: 'table'
  })
  
  const [newHeader, setNewHeader] = useState('')

  const pdfTemplates = [
    { id: 'official', name: 'Documento Oficial', description: 'Plantilla oficial de MINEDUC' },
    { id: 'report', name: 'Reporte', description: 'Plantilla para reportes institucionales' },
    { id: 'memo', name: 'Memorándum', description: 'Plantilla para memorándums internos' },
    { id: 'letter', name: 'Carta Formal', description: 'Plantilla para cartas oficiales' }
  ]

  const excelTemplates = [
    { id: 'table', name: 'Tabla Básica', description: 'Tabla simple con encabezados' },
    { id: 'report', name: 'Reporte Estadístico', description: 'Plantilla para reportes con gráficos' },
    { id: 'budget', name: 'Presupuesto', description: 'Plantilla para control presupuestario' },
    { id: 'inventory', name: 'Inventario', description: 'Plantilla para control de inventarios' }
  ]

  const handlePdfChange = (field, value) => {
    setPdfData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExcelChange = (field, value) => {
    setExcelData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addHeader = () => {
    if (newHeader.trim()) {
      setExcelData(prev => ({
        ...prev,
        headers: [...prev.headers, newHeader.trim()]
      }))
      setNewHeader('')
    }
  }

  const removeHeader = (index) => {
    setExcelData(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }))
  }

  const addRow = () => {
    const newRow = Array(excelData.headers.length).fill('')
    setExcelData(prev => ({
      ...prev,
      data: [...prev.data, newRow]
    }))
  }

  const updateCell = (rowIndex, cellIndex, value) => {
    setExcelData(prev => ({
      ...prev,
      data: prev.data.map((row, rIndex) => 
        rIndex === rowIndex 
          ? row.map((cell, cIndex) => cIndex === cellIndex ? value : cell)
          : row
      )
    }))
  }

  const removeRow = (rowIndex) => {
    setExcelData(prev => ({
      ...prev,
      data: prev.data.filter((_, i) => i !== rowIndex)
    }))
  }

  const generatePDF = async () => {
    try {
      setLoading(true)
      
      // Simular generación de PDF
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // En una implementación real, aquí generarías el PDF usando jsPDF o similar
      const pdfContent = `
        %PDF-1.4
        1 0 obj
        <<
        /Type /Catalog
        /Pages 2 0 R
        >>
        endobj
        
        2 0 obj
        <<
        /Type /Pages
        /Kids [3 0 R]
        /Count 1
        >>
        endobj
        
        3 0 obj
        <<
        /Type /Page
        /Parent 2 0 R
        /MediaBox [0 0 612 792]
        /Contents 4 0 R
        >>
        endobj
        
        4 0 obj
        <<
        /Length 44
        >>
        stream
        BT
        /F1 12 Tf
        72 720 Td
        (${pdfData.title}) Tj
        ET
        endstream
        endobj
        
        xref
        0 5
        0000000000 65535 f 
        0000000009 00000 n 
        0000000058 00000 n 
        0000000115 00000 n 
        0000000206 00000 n 
        trailer
        <<
        /Size 5
        /Root 1 0 R
        >>
        startxref
        299
        %%EOF
      `
      
      // Crear blob y descargar
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${pdfData.title || 'documento'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('PDF generado exitosamente')
      
      if (onDocumentGenerated) {
        onDocumentGenerated({
          type: 'pdf',
          fileName: `${pdfData.title || 'documento'}.pdf`,
          data: pdfData
        })
      }
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setLoading(false)
    }
  }

  const generateExcel = async () => {
    try {
      setLoading(true)
      
      // Simular generación de Excel
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Crear contenido CSV como alternativa simple
      let csvContent = excelData.headers.join(',') + '\n'
      excelData.data.forEach(row => {
        csvContent += row.join(',') + '\n'
      })
      
      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${excelData.fileName || 'documento'}.csv`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('Archivo Excel generado exitosamente')
      
      if (onDocumentGenerated) {
        onDocumentGenerated({
          type: 'excel',
          fileName: `${excelData.fileName || 'documento'}.csv`,
          data: excelData
        })
      }
      
    } catch (error) {
      console.error('Error generando Excel:', error)
      toast.error('Error al generar el archivo Excel')
    } finally {
      setLoading(false)
    }
  }

  const resetForms = () => {
    setPdfData({
      title: '',
      content: '',
      author: 'MINEDUC Guatemala',
      subject: '',
      template: 'official'
    })
    
    setExcelData({
      fileName: '',
      sheetName: 'Hoja1',
      headers: ['Columna 1', 'Columna 2', 'Columna 3'],
      data: [
        ['Dato 1', 'Dato 2', 'Dato 3'],
        ['Dato 4', 'Dato 5', 'Dato 6']
      ],
      template: 'table'
    })
  }

  const handleClose = () => {
    if (!loading) {
      resetForms()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generador de Documentos
          </DialogTitle>
          <DialogDescription>
            Crea documentos PDF o archivos Excel desde plantillas predefinidas
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documento PDF
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Archivo Excel
            </TabsTrigger>
          </TabsList>

          {/* Generador PDF */}
          <TabsContent value="pdf" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración del Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pdf-title">Título</Label>
                    <Input
                      id="pdf-title"
                      placeholder="Título del documento"
                      value={pdfData.title}
                      onChange={(e) => handlePdfChange('title', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pdf-subject">Asunto</Label>
                    <Input
                      id="pdf-subject"
                      placeholder="Asunto del documento"
                      value={pdfData.subject}
                      onChange={(e) => handlePdfChange('subject', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pdf-author">Autor</Label>
                    <Input
                      id="pdf-author"
                      value={pdfData.author}
                      onChange={(e) => handlePdfChange('author', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pdf-template">Plantilla</Label>
                    <Select value={pdfData.template} onValueChange={(value) => handlePdfChange('template', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pdfTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contenido</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Escribe el contenido del documento..."
                    value={pdfData.content}
                    onChange={(e) => handlePdfChange('content', e.target.value)}
                    rows={10}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handlePdfChange('content', '')}>
                Limpiar
              </Button>
              <Button onClick={generatePDF} disabled={loading || !pdfData.title.trim()}>
                {loading ? 'Generando...' : 'Generar PDF'}
              </Button>
            </div>
          </TabsContent>

          {/* Generador Excel */}
          <TabsContent value="excel" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="excel-filename">Nombre del Archivo</Label>
                    <Input
                      id="excel-filename"
                      placeholder="nombre-archivo"
                      value={excelData.fileName}
                      onChange={(e) => handleExcelChange('fileName', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="excel-sheet">Nombre de la Hoja</Label>
                    <Input
                      id="excel-sheet"
                      value={excelData.sheetName}
                      onChange={(e) => handleExcelChange('sheetName', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="excel-template">Plantilla</Label>
                    <Select value={excelData.template} onValueChange={(value) => handleExcelChange('template', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {excelTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gestión de encabezados */}
                  <div>
                    <Label>Columnas</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Nueva columna"
                        value={newHeader}
                        onChange={(e) => setNewHeader(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addHeader()}
                      />
                      <Button onClick={addHeader} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {excelData.headers.map((header, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {header}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeHeader(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Datos
                    <Button onClick={addRow} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Fila
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {excelData.data.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-2 items-center">
                        {row.map((cell, cellIndex) => (
                          <Input
                            key={cellIndex}
                            placeholder={excelData.headers[cellIndex] || `Col ${cellIndex + 1}`}
                            value={cell}
                            onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                            className="text-sm"
                          />
                        ))}
                        <Button
                          onClick={() => removeRow(rowIndex)}
                          size="sm"
                          variant="outline"
                          title="Eliminar fila"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExcelData(prev => ({ ...prev, data: [] }))}>
                Limpiar Datos
              </Button>
              <Button onClick={generateExcel} disabled={loading || !excelData.fileName.trim()}>
                {loading ? 'Generando...' : 'Generar Excel'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentGenerator