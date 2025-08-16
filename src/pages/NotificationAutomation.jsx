import { useState, useEffect } from 'react'
import { 
  Bot,
  Mail,
  Calendar,
  Clock,
  Users,
  FileText,
  Settings,
  Play,
  Pause,
  Zap,
  Send,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Sparkles,
  Target,
  Brain,
  Wand2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Slider } from '../components/ui/slider'
import { Alert, AlertDescription } from '../components/ui/alert'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { useAuth } from '../hooks/useAuth'
import { notificationsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const NotificationAutomation = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [serviceStatus, setServiceStatus] = useState(null)
  
  // Estados para el compositor inteligente
  const [messageComposer, setMessageComposer] = useState({
    type: 'document_expiration',
    userName: 'Juan Pérez',
    documentTitle: 'Certificado de Antecedentes',
    daysUntilExpiration: 7,
    urgencyLevel: 'medium',
    context: '',
    userRole: 'empleado',
    organizationalLevel: 'departamental'
  })
  
  const [generatedMessage, setGeneratedMessage] = useState(null)
  const [generatedSubjects, setGeneratedSubjects] = useState([])
  const [messageHistory, setMessageHistory] = useState([])
  
  // Estados para configuración
  const [automationSettings, setAutomationSettings] = useState({
    documentExpiration: {
      enabled: true,
      daysBeforeAlert: [1, 7, 30],
      emailEnabled: true,
      urgentThreshold: 1,
      highThreshold: 7
    },
    organizationalChanges: {
      enabled: true,
      autoNotifyAll: true,
      requireApproval: false
    },
    dailySummary: {
      enabled: true,
      sendTime: '08:00',
      includeMetrics: true
    },
    ai: {
      enabled: true,
      provider: 'groq',
      temperature: 0.7,
      maxTokens: 150
    }
  })

  const [testEmail, setTestEmail] = useState('')
  const [isTestingEmail, setIsTestingEmail] = useState(false)

  useEffect(() => {
    loadServiceStatus()
    loadMessageHistory()
  }, [])

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/automated-notifications/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setServiceStatus(data)
      }
    } catch (error) {
      console.error('Error cargando estado del servicio:', error)
    }
  }

  const loadMessageHistory = () => {
    const saved = localStorage.getItem('ai_message_history')
    if (saved) {
      setMessageHistory(JSON.parse(saved))
    }
  }

  const saveMessageToHistory = (message, metadata) => {
    const newEntry = {
      id: Date.now(),
      message,
      metadata,
      timestamp: new Date().toISOString()
    }
    
    const updated = [newEntry, ...messageHistory.slice(0, 9)] // Mantener últimos 10
    setMessageHistory(updated)
    localStorage.setItem('ai_message_history', JSON.stringify(updated))
  }

  const toggleService = async (action) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/automated-notifications/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        toast.success(`Servicio ${action === 'start' ? 'iniciado' : 'detenido'} exitosamente`)
        await loadServiceStatus()
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error(`Error ${action} servicio:`, error)
      toast.error(`Error al ${action === 'start' ? 'iniciar' : 'detener'} el servicio`)
    } finally {
      setLoading(false)
    }
  }

  const generateMessage = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/automated-notifications/generate-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageComposer)
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedMessage(data)
        
        if (data.success) {
          saveMessageToHistory(data.message, messageComposer)
          toast.success('Mensaje generado con IA exitosamente')
        } else {
          toast.warning('IA no disponible, usando mensaje predeterminado')
        }
      }
    } catch (error) {
      console.error('Error generando mensaje:', error)
      toast.error('Error al generar mensaje')
    } finally {
      setLoading(false)
    }
  }

  const generateSubjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/automated-notifications/generate-subject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: messageComposer.type,
          documentTitle: messageComposer.documentTitle,
          urgencyLevel: messageComposer.urgencyLevel,
          daysUntilExpiration: messageComposer.daysUntilExpiration
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedSubjects(data.subjects)
        toast.success('Asuntos generados exitosamente')
      }
    } catch (error) {
      console.error('Error generando asuntos:', error)
      toast.error('Error al generar asuntos')
    } finally {
      setLoading(false)
    }
  }

  const improveMessage = async (improvementType) => {
    if (!generatedMessage?.message) {
      toast.error('Primero genera un mensaje')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/automated-notifications/improve-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: generatedMessage.message,
          improvementType
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedMessage({
          ...generatedMessage,
          message: data.improvedMessage,
          sentiment: data.sentiment
        })
        toast.success(`Mensaje mejorado: ${improvementType}`)
      }
    } catch (error) {
      console.error('Error mejorando mensaje:', error)
      toast.error('Error al mejorar mensaje')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async (emailType) => {
    if (!testEmail) {
      toast.error('Ingresa un email para la prueba')
      return
    }

    try {
      setIsTestingEmail(true)
      const response = await fetch('/api/automated-notifications/test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          type: emailType
        })
      })
      
      if (response.ok) {
        toast.success(`Email de prueba enviado a ${testEmail}`)
      } else {
        throw new Error('Error enviando email')
      }
    } catch (error) {
      console.error('Error enviando email de prueba:', error)
      toast.error('Error al enviar email de prueba')
    } finally {
      setIsTestingEmail(false)
    }
  }

  const notifyOrganizationalChange = async (changeData) => {
    try {
      const response = await fetch('/api/automated-notifications/organizational-change', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeData)
      })
      
      if (response.ok) {
        toast.success('Notificación de cambio organizacional enviada')
      } else {
        throw new Error('Error enviando notificación')
      }
    } catch (error) {
      console.error('Error enviando notificación organizacional:', error)
      toast.error('Error al enviar notificación')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">Solo los administradores pueden acceder al sistema de automatización de notificaciones.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-600" />
            Automatización de Notificaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Sistema inteligente de notificaciones automáticas con IA
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadServiceStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {serviceStatus?.automatedService.isRunning ? (
            <Button
              variant="outline"
              onClick={() => toggleService('stop')}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              <Pause className="h-4 w-4 mr-2" />
              Detener Servicio
            </Button>
          ) : (
            <Button
              onClick={() => toggleService('start')}
              disabled={loading}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Servicio
            </Button>
          )}
        </div>
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${serviceStatus?.automatedService.isRunning ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm text-gray-600">Servicio Principal</span>
            </div>
            <div className={`text-lg font-bold ${serviceStatus?.automatedService.isRunning ? 'text-green-600' : 'text-red-600'}`}>
              {serviceStatus?.automatedService.isRunning ? 'Activo' : 'Detenido'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className={`h-4 w-4 ${serviceStatus?.aiService.available ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-600">IA ({serviceStatus?.aiService.provider})</span>
            </div>
            <div className={`text-lg font-bold ${serviceStatus?.aiService.available ? 'text-blue-600' : 'text-gray-600'}`}>
              {serviceStatus?.aiService.available ? 'Disponible' : 'Sin conexión'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className={`h-4 w-4 ${serviceStatus?.emailService.available ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm text-gray-600">Email</span>
            </div>
            <div className={`text-lg font-bold ${serviceStatus?.emailService.available ? 'text-green-600' : 'text-red-600'}`}>
              {serviceStatus?.emailService.available ? 'Configurado' : 'Error'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600">Procesos Activos</span>
            </div>
            <div className="text-lg font-bold text-orange-600">
              {serviceStatus?.automatedService.activeIntervals || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="composer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="composer" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Compositor IA
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automatización
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Pruebas
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoreo
          </TabsTrigger>
        </TabsList>

        {/* Tab: Compositor IA */}
        <TabsContent value="composer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuración del mensaje */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Configuración del Mensaje
                </CardTitle>
                <CardDescription>
                  Define los parámetros para generar un mensaje inteligente con IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipo de Notificación</Label>
                  <Select value={messageComposer.type} onValueChange={(value) => 
                    setMessageComposer(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document_expiration">Vencimiento de Documento</SelectItem>
                      <SelectItem value="document_required">Documento Requerido</SelectItem>
                      <SelectItem value="organizational_change">Cambio Organizacional</SelectItem>
                      <SelectItem value="reminder">Recordatorio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="userName">Nombre del Usuario</Label>
                    <Input
                      id="userName"
                      value={messageComposer.userName}
                      onChange={(e) => setMessageComposer(prev => ({ ...prev, userName: e.target.value }))}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <Label htmlFor="userRole">Rol del Usuario</Label>
                    <Select value={messageComposer.userRole} onValueChange={(value) => 
                      setMessageComposer(prev => ({ ...prev, userRole: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empleado">Empleado</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="documentTitle">Título del Documento</Label>
                  <Input
                    id="documentTitle"
                    value={messageComposer.documentTitle}
                    onChange={(e) => setMessageComposer(prev => ({ ...prev, documentTitle: e.target.value }))}
                    placeholder="Certificado de Antecedentes"
                  />
                </div>

                {messageComposer.type === 'document_expiration' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="daysUntilExpiration">Días hasta Vencimiento</Label>
                      <Input
                        id="daysUntilExpiration"
                        type="number"
                        value={messageComposer.daysUntilExpiration}
                        onChange={(e) => setMessageComposer(prev => ({ ...prev, daysUntilExpiration: parseInt(e.target.value) }))}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="urgencyLevel">Nivel de Urgencia</Label>
                      <Select value={messageComposer.urgencyLevel} onValueChange={(value) => 
                        setMessageComposer(prev => ({ ...prev, urgencyLevel: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgente</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="context">Contexto Adicional (Opcional)</Label>
                  <Textarea
                    id="context"
                    value={messageComposer.context}
                    onChange={(e) => setMessageComposer(prev => ({ ...prev, context: e.target.value }))}
                    placeholder="Información adicional que la IA debe considerar..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateMessage} disabled={loading} className="flex-1">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {loading ? 'Generando...' : 'Generar Mensaje con IA'}
                  </Button>
                  <Button variant="outline" onClick={generateSubjects} disabled={loading}>
                    <Target className="h-4 w-4 mr-2" />
                    Asuntos
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resultado generado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Mensaje Generado
                </CardTitle>
                <CardDescription>
                  Resultado de la IA y herramientas de mejora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedMessage ? (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Mensaje Principal
                      </h4>
                      <p className="text-sm text-gray-700">{generatedMessage.message}</p>
                    </div>

                    {generatedMessage.suggestions && generatedMessage.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Sugerencias Alternativas
                        </h4>
                        <div className="space-y-2">
                          {generatedMessage.suggestions.map((suggestion, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded text-sm">
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {generatedMessage.sentiment && (
                      <div>
                        <h4 className="font-medium mb-2">Análisis de Sentimiento</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Profesionalismo: <Badge variant="secondary">{generatedMessage.sentiment.professionalism}/5</Badge></div>
                          <div>Claridad: <Badge variant="secondary">{generatedMessage.sentiment.clarity}/5</Badge></div>
                          <div>Urgencia: <Badge variant="secondary">{generatedMessage.sentiment.urgency}/5</Badge></div>
                          <div>Amabilidad: <Badge variant="secondary">{generatedMessage.sentiment.friendliness}/5</Badge></div>
                        </div>
                      </div>
                    )}

                    {/* Botones de mejora */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => improveMessage('shorter')}>
                        Más Conciso
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => improveMessage('friendlier')}>
                        Más Amigable
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => improveMessage('urgent')}>
                        Más Urgente
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => improveMessage('clearer')}>
                        Más Claro
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Configura los parámetros y genera un mensaje con IA</p>
                  </div>
                )}

                {/* Asuntos generados */}
                {generatedSubjects.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Líneas de Asunto Sugeridas
                    </h4>
                    <div className="space-y-2">
                      {generatedSubjects.map((subject, index) => (
                        <div key={index} className="p-2 bg-purple-50 rounded text-sm font-medium">
                          {subject}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historial de mensajes */}
          {messageHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Mensajes Generados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {messageHistory.map((entry) => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{entry.metadata.type}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{entry.message}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.metadata.documentTitle} • {entry.metadata.userName}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Automatización */}
        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuración de vencimientos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Vencimiento de Documentos
                </CardTitle>
                <CardDescription>
                  Configuración de alertas automáticas por vencimiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="doc-expiration-enabled">Habilitar Alertas de Vencimiento</Label>
                  <Switch
                    id="doc-expiration-enabled"
                    checked={automationSettings.documentExpiration.enabled}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        documentExpiration: { ...prev.documentExpiration, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Días antes del vencimiento para alertar</Label>
                  <div className="flex gap-2 mt-2">
                    {automationSettings.documentExpiration.daysBeforeAlert.map((days, index) => (
                      <Badge key={index} variant="secondary">{days} día{days !== 1 ? 's' : ''}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Umbral Urgente (días)</Label>
                    <Slider
                      value={[automationSettings.documentExpiration.urgentThreshold]}
                      onValueChange={([value]) => 
                        setAutomationSettings(prev => ({
                          ...prev,
                          documentExpiration: { ...prev.documentExpiration, urgentThreshold: value }
                        }))
                      }
                      max={7}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {automationSettings.documentExpiration.urgentThreshold} día{automationSettings.documentExpiration.urgentThreshold !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div>
                    <Label>Umbral Prioridad Alta (días)</Label>
                    <Slider
                      value={[automationSettings.documentExpiration.highThreshold]}
                      onValueChange={([value]) => 
                        setAutomationSettings(prev => ({
                          ...prev,
                          documentExpiration: { ...prev.documentExpiration, highThreshold: value }
                        }))
                      }
                      max={30}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {automationSettings.documentExpiration.highThreshold} días
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Enviar Emails Automáticos</Label>
                  <Switch
                    id="email-enabled"
                    checked={automationSettings.documentExpiration.emailEnabled}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        documentExpiration: { ...prev.documentExpiration, emailEnabled: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuración de cambios organizacionales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cambios Organizacionales
                </CardTitle>
                <CardDescription>
                  Notificaciones automáticas de cambios en la organización
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="org-changes-enabled">Habilitar Notificaciones</Label>
                  <Switch
                    id="org-changes-enabled"
                    checked={automationSettings.organizationalChanges.enabled}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        organizationalChanges: { ...prev.organizationalChanges, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-notify-all">Notificar a Todos Automáticamente</Label>
                  <Switch
                    id="auto-notify-all"
                    checked={automationSettings.organizationalChanges.autoNotifyAll}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        organizationalChanges: { ...prev.organizationalChanges, autoNotifyAll: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="require-approval">Requerir Aprobación</Label>
                  <Switch
                    id="require-approval"
                    checked={automationSettings.organizationalChanges.requireApproval}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        organizationalChanges: { ...prev.organizationalChanges, requireApproval: checked }
                      }))
                    }
                  />
                </div>

                {/* Formulario para cambio organizacional */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Notificar Cambio Organizacional</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.target)
                    notifyOrganizationalChange({
                      title: formData.get('change-title'),
                      description: formData.get('change-description'),
                      documents_affected: formData.get('affected-docs').split(',').filter(d => d.trim()),
                      effective_date: formData.get('effective-date')
                    })
                  }} className="space-y-3">
                    <Input name="change-title" placeholder="Título del cambio" required />
                    <Textarea name="change-description" placeholder="Descripción del cambio..." rows={3} required />
                    <Input name="affected-docs" placeholder="Documentos afectados (separados por coma)" />
                    <Input name="effective-date" type="date" required />
                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Notificación
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            {/* Configuración de resúmenes diarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Resúmenes Diarios
                </CardTitle>
                <CardDescription>
                  Envío automático de resúmenes diarios a usuarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily-summary-enabled">Habilitar Resúmenes Diarios</Label>
                  <Switch
                    id="daily-summary-enabled"
                    checked={automationSettings.dailySummary.enabled}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        dailySummary: { ...prev.dailySummary, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="send-time">Hora de Envío</Label>
                  <Input
                    id="send-time"
                    type="time"
                    value={automationSettings.dailySummary.sendTime}
                    onChange={(e) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        dailySummary: { ...prev.dailySummary, sendTime: e.target.value }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-metrics">Incluir Métricas</Label>
                  <Switch
                    id="include-metrics"
                    checked={automationSettings.dailySummary.includeMetrics}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        dailySummary: { ...prev.dailySummary, includeMetrics: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuración de IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Configuración de IA
                </CardTitle>
                <CardDescription>
                  Parámetros para la generación inteligente de mensajes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-enabled">Habilitar IA</Label>
                  <Switch
                    id="ai-enabled"
                    checked={automationSettings.ai.enabled}
                    onCheckedChange={(checked) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        ai: { ...prev.ai, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="ai-provider">Proveedor de IA</Label>
                  <Select value={automationSettings.ai.provider} onValueChange={(value) => 
                    setAutomationSettings(prev => ({
                      ...prev,
                      ai: { ...prev.ai, provider: value }
                    }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq">Groq (Gratuito)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Creatividad (Temperature)</Label>
                  <Slider
                    value={[automationSettings.ai.temperature]}
                    onValueChange={([value]) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        ai: { ...prev.ai, temperature: value }
                      }))
                    }
                    max={1}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {automationSettings.ai.temperature} ({automationSettings.ai.temperature < 0.3 ? 'Conservador' : automationSettings.ai.temperature < 0.7 ? 'Balanceado' : 'Creativo'})
                  </div>
                </div>

                <div>
                  <Label>Longitud Máxima (Tokens)</Label>
                  <Slider
                    value={[automationSettings.ai.maxTokens]}
                    onValueChange={([value]) => 
                      setAutomationSettings(prev => ({
                        ...prev,
                        ai: { ...prev.ai, maxTokens: value }
                      }))
                    }
                    max={500}
                    min={50}
                    step={25}
                    className="mt-2"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {automationSettings.ai.maxTokens} tokens
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Pruebas */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Pruebas de Email
              </CardTitle>
              <CardDescription>
                Envía emails de prueba para verificar la configuración del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-email">Email de Prueba</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => sendTestEmail('document_expiration')}
                  disabled={isTestingEmail || !testEmail}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Vencimiento de Documento
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => sendTestEmail('document_required')}
                  disabled={isTestingEmail || !testEmail}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Documento Requerido
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => sendTestEmail('organizational_change')}
                  disabled={isTestingEmail || !testEmail}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Cambio Organizacional
                </Button>
              </div>

              {isTestingEmail && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Enviando email de prueba... Esto puede tardar unos segundos.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Monitoreo */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Servicio Principal</span>
                      <Badge variant={serviceStatus.automatedService.isRunning ? "default" : "destructive"}>
                        {serviceStatus.automatedService.isRunning ? 'Activo' : 'Detenido'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Procesos Activos</span>
                      <Badge variant="secondary">
                        {serviceStatus.automatedService.activeIntervals}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>IA Disponible</span>
                      <Badge variant={serviceStatus.aiService.available ? "default" : "destructive"}>
                        {serviceStatus.aiService.available ? `Sí (${serviceStatus.aiService.provider})` : 'No'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>Email Configurado</span>
                      <Badge variant={serviceStatus.emailService.available ? "default" : "destructive"}>
                        {serviceStatus.emailService.available ? 'Sí' : 'No'}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500">
                      Última actualización: {serviceStatus.timestamp ? new Date(serviceStatus.timestamp).toLocaleString('es-ES') : 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Cargando estado del sistema...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Procesos Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceStatus?.automatedService.intervalNames ? (
                  <div className="space-y-2">
                    {serviceStatus.automatedService.intervalNames.map((name, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">{name}</span>
                        <Badge variant="outline" className="text-green-600">
                          Activo
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay procesos activos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationAutomation