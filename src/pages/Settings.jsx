import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  Save,
  RefreshCw,
  Bell,
  Shield,
  Database,
  Mail,
  Globe,
  FileText,
  Users,
  Key,
  Trash2,
  AlertTriangle,
  Check,
  X
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { settingsAPI } from '../lib/api'
import toast from 'react-hot-toast'

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    general: {
      site_name: '',
      site_description: '',
      contact_email: '',
      max_file_size: 10,
      allowed_file_types: ''
    },
    security: {
      session_timeout: 60,
      max_login_attempts: 5,
      password_min_length: 8,
      require_two_factor: false,
      auto_logout_inactive: true
    },
    notifications: {
      email_enabled: true,
      document_approval_notifications: true,
      user_registration_notifications: true,
      system_alerts: true,
      daily_reports: false
    },
    storage: {
      storage_provider: 'local',
      backup_frequency: 'daily',
      retention_period: 365,
      auto_cleanup: true
    },
    integrations: {
      ai_classification_enabled: true,
      ocr_enabled: true,
      api_rate_limit: 1000,
      webhook_url: ''
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.getAll()
      if (response.data.settings) {
        setSettings(prev => ({
          ...prev,
          ...response.data.settings
        }))
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
      toast.error('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      await settingsAPI.update(settings)
      toast.success('Configuración guardada exitosamente')
    } catch (error) {
      console.error('Error guardando configuración:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (window.confirm('¿Estás seguro de que quieres restablecer toda la configuración?')) {
      try {
        setSaving(true)
        await settingsAPI.reset()
        await loadSettings()
        toast.success('Configuración restablecida')
      } catch (error) {
        console.error('Error restableciendo configuración:', error)
        toast.error('Error al restablecer la configuración')
      } finally {
        setSaving(false)
      }
    }
  }

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const handleSystemStatusCheck = async () => {
    try {
      toast.loading('Verificando estado del sistema...')
      const response = await settingsAPI.getSystemStatus()
      toast.dismiss()
      
      if (response.data.status === 'healthy') {
        toast.success('Sistema funcionando correctamente')
      } else {
        toast.warning('Se detectaron algunos problemas en el sistema')
      }
    } catch (error) {
      toast.dismiss()
      console.error('Error verificando estado:', error)
      toast.error('Error al verificar el estado del sistema')
    }
  }

  const SettingCard = ({ icon: Icon, title, description, children }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )

  const InputField = ({ label, value, onChange, type = 'text', placeholder = '', suffix = '' }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  )

  const ToggleField = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <Button
        variant={checked ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(!checked)}
        className="ml-4"
      >
        {checked ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {checked ? 'Activo' : 'Inactivo'}
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">
            Gestiona la configuración del sistema y preferencias
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={handleResetSettings} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Configuraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración General */}
        <SettingCard
          icon={Globe}
          title="Configuración General"
          description="Configuración básica del sistema"
        >
          <InputField
            label="Nombre del sitio"
            value={settings.general.site_name}
            onChange={(value) => updateSetting('general', 'site_name', value)}
            placeholder="MINEDUC Document Management"
          />
          <InputField
            label="Descripción del sitio"
            value={settings.general.site_description}
            onChange={(value) => updateSetting('general', 'site_description', value)}
            placeholder="Sistema de gestión documental"
          />
          <InputField
            label="Email de contacto"
            type="email"
            value={settings.general.contact_email}
            onChange={(value) => updateSetting('general', 'contact_email', value)}
            placeholder="admin@mineduc.gob.gt"
          />
          <InputField
            label="Tamaño máximo de archivo"
            type="number"
            value={settings.general.max_file_size}
            onChange={(value) => updateSetting('general', 'max_file_size', parseInt(value))}
            suffix="MB"
          />
          <InputField
            label="Tipos de archivo permitidos"
            value={settings.general.allowed_file_types}
            onChange={(value) => updateSetting('general', 'allowed_file_types', value)}
            placeholder="pdf,doc,docx,jpg,png"
          />
        </SettingCard>

        {/* Configuración de Seguridad */}
        <SettingCard
          icon={Shield}
          title="Seguridad"
          description="Configuración de seguridad y autenticación"
        >
          <InputField
            label="Tiempo de sesión (minutos)"
            type="number"
            value={settings.security.session_timeout}
            onChange={(value) => updateSetting('security', 'session_timeout', parseInt(value))}
            suffix="min"
          />
          <InputField
            label="Máximo intentos de login"
            type="number"
            value={settings.security.max_login_attempts}
            onChange={(value) => updateSetting('security', 'max_login_attempts', parseInt(value))}
          />
          <InputField
            label="Longitud mínima de contraseña"
            type="number"
            value={settings.security.password_min_length}
            onChange={(value) => updateSetting('security', 'password_min_length', parseInt(value))}
            suffix="caracteres"
          />
          <ToggleField
            label="Autenticación de dos factores"
            description="Requiere verificación adicional al iniciar sesión"
            checked={settings.security.require_two_factor}
            onChange={(value) => updateSetting('security', 'require_two_factor', value)}
          />
          <ToggleField
            label="Cerrar sesión automáticamente"
            description="Cerrar sesión por inactividad"
            checked={settings.security.auto_logout_inactive}
            onChange={(value) => updateSetting('security', 'auto_logout_inactive', value)}
          />
        </SettingCard>

        {/* Configuración de Notificaciones */}
        <SettingCard
          icon={Bell}
          title="Notificaciones"
          description="Configuración de notificaciones y alertas"
        >
          <ToggleField
            label="Notificaciones por email"
            description="Habilitar envío de notificaciones por correo"
            checked={settings.notifications.email_enabled}
            onChange={(value) => updateSetting('notifications', 'email_enabled', value)}
          />
          <ToggleField
            label="Notificaciones de aprobación"
            description="Notificar cuando se aprueben/rechacen documentos"
            checked={settings.notifications.document_approval_notifications}
            onChange={(value) => updateSetting('notifications', 'document_approval_notifications', value)}
          />
          <ToggleField
            label="Registro de usuarios"
            description="Notificar cuando se registren nuevos usuarios"
            checked={settings.notifications.user_registration_notifications}
            onChange={(value) => updateSetting('notifications', 'user_registration_notifications', value)}
          />
          <ToggleField
            label="Alertas del sistema"
            description="Notificar sobre errores y problemas del sistema"
            checked={settings.notifications.system_alerts}
            onChange={(value) => updateSetting('notifications', 'system_alerts', value)}
          />
          <ToggleField
            label="Reportes diarios"
            description="Enviar resumen diario de actividades"
            checked={settings.notifications.daily_reports}
            onChange={(value) => updateSetting('notifications', 'daily_reports', value)}
          />
        </SettingCard>

        {/* Configuración de Almacenamiento */}
        <SettingCard
          icon={Database}
          title="Almacenamiento"
          description="Configuración de almacenamiento y respaldos"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Proveedor de almacenamiento</label>
            <div className="flex space-x-2">
              {['local', 'aws', 'google'].map((provider) => (
                <Button
                  key={provider}
                  variant={settings.storage.storage_provider === provider ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSetting('storage', 'storage_provider', provider)}
                  className="capitalize"
                >
                  {provider}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Frecuencia de respaldo</label>
            <div className="flex space-x-2">
              {['daily', 'weekly', 'monthly'].map((freq) => (
                <Button
                  key={freq}
                  variant={settings.storage.backup_frequency === freq ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSetting('storage', 'backup_frequency', freq)}
                  className="capitalize"
                >
                  {freq === 'daily' ? 'Diario' : freq === 'weekly' ? 'Semanal' : 'Mensual'}
                </Button>
              ))}
            </div>
          </div>

          <InputField
            label="Período de retención (días)"
            type="number"
            value={settings.storage.retention_period}
            onChange={(value) => updateSetting('storage', 'retention_period', parseInt(value))}
            suffix="días"
          />
          
          <ToggleField
            label="Limpieza automática"
            description="Eliminar archivos antiguos automáticamente"
            checked={settings.storage.auto_cleanup}
            onChange={(value) => updateSetting('storage', 'auto_cleanup', value)}
          />
        </SettingCard>

        {/* Configuración de Integraciones */}
        <SettingCard
          icon={Key}
          title="Integraciones"
          description="Configuración de APIs y servicios externos"
        >
          <ToggleField
            label="Clasificación con IA"
            description="Usar inteligencia artificial para clasificar documentos"
            checked={settings.integrations.ai_classification_enabled}
            onChange={(value) => updateSetting('integrations', 'ai_classification_enabled', value)}
          />
          <ToggleField
            label="OCR (Reconocimiento de texto)"
            description="Extraer texto de imágenes y documentos escaneados"
            checked={settings.integrations.ocr_enabled}
            onChange={(value) => updateSetting('integrations', 'ocr_enabled', value)}
          />
          <InputField
            label="Límite de API (por hora)"
            type="number"
            value={settings.integrations.api_rate_limit}
            onChange={(value) => updateSetting('integrations', 'api_rate_limit', parseInt(value))}
            suffix="requests/hour"
          />
          <InputField
            label="URL de Webhook"
            value={settings.integrations.webhook_url}
            onChange={(value) => updateSetting('integrations', 'webhook_url', value)}
            placeholder="https://api.ejemplo.com/webhook"
          />
        </SettingCard>

        {/* Estado del Sistema */}
        <SettingCard
          icon={AlertTriangle}
          title="Estado del Sistema"
          description="Información sobre el estado actual del sistema"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Estado del servidor</span>
              <Badge className="bg-green-100 text-green-800">En línea</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Base de datos</span>
              <Badge className="bg-green-100 text-green-800">Conectada</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Almacenamiento</span>
              <Badge className="bg-yellow-100 text-yellow-800">75% usado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Última sincronización</span>
              <span className="text-sm text-gray-500">Hace 5 minutos</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full" size="sm" onClick={handleSystemStatusCheck}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Estado
              </Button>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}

export default Settings