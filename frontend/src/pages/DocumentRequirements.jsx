import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  FileText, 
  Settings, 
  Users, 
  Bell,
  Download,
  Upload,
  Plus,
  BarChart3
} from 'lucide-react'
import DocumentRequirementsComponent from '../components/DocumentRequirements'
import DocumentRequirementsAdmin from '../components/DocumentRequirementsAdmin'
import { useAuth } from '../hooks/useAuth'

const DocumentRequirementsPage = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'user-view')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['user-view', 'admin-view'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    setSearchParams({ tab: newTab })
  }

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'editor'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Documentos</h1>
          <p className="text-gray-600 mt-2">
            Sistema inteligente de seguimiento y recordatorios de documentos organizacionales
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
          {canAccessAdmin && (
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Estadísticas
            </Button>
          )}
        </div>
      </div>

      {/* Información del sistema */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-blue-900 mb-2">
                Sistema de Gestión Inteligente de Documentos
              </h3>
              <p className="text-blue-700 mb-4">
                Este sistema te ayuda a mantener todos tus documentos organizacionales al día con recordatorios 
                automáticos, seguimiento de vencimientos y notificaciones inteligentes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Seguimiento automático de vencimientos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Recordatorios inteligentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Gestión por departamentos</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={`grid w-full ${canAccessAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="user-view" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Mis Documentos
          </TabsTrigger>
          {canAccessAdmin && (
            <TabsTrigger value="admin-view" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Panel Administrativo
            </TabsTrigger>
          )}
        </TabsList>

        {/* Vista de Usuario */}
        <TabsContent value="user-view" className="space-y-6">
          <div className="space-y-6">
            {/* Descripción de la vista de usuario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Mis Documentos Requeridos
                </CardTitle>
                <CardDescription>
                  Visualiza el estado de todos tus documentos, recibe recordatorios automáticos 
                  y mantén tu documentación al día.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Componente principal de gestión de documentos */}
            <DocumentRequirementsComponent />
          </div>
        </TabsContent>

        {/* Vista Administrativa */}
        {canAccessAdmin && (
          <TabsContent value="admin-view" className="space-y-6">
            <div className="space-y-6">
              {/* Descripción de la vista administrativa */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Panel Administrativo
                  </CardTitle>
                  <CardDescription>
                    Gestiona tipos de documentos, supervisa el cumplimiento organizacional 
                    y configura políticas de documentación.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Componente administrativo */}
              <DocumentRequirementsAdmin />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Información adicional para usuarios viewer */}
      {!canAccessAdmin && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-yellow-800">Información</h4>
                <p className="text-sm text-yellow-700">
                  Para acceder a funciones administrativas como gestión de tipos de documentos 
                  y supervisión departamental, contacta a tu administrador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer con ayuda */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="text-center">
            <h4 className="font-medium text-gray-800 mb-2">¿Necesitas ayuda?</h4>
            <p className="text-sm text-gray-600 mb-3">
              Consulta nuestra guía de documentos requeridos o contacta al área de soporte.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Guía de Usuario
              </Button>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Contactar Soporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentRequirementsPage