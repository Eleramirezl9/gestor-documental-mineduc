import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Activity,
  Search,
  Filter,
  Clock,
  User,
  FileText,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Mail,
  UserPlus,
  Settings,
  Calendar,
  ChevronDown,
  X
} from 'lucide-react';

// Colores institucionales MINEDUC Guatemala
const COLORS = {
  primary: '#1996C7',      // Azul bandera Guatemala
  primaryHover: '#167BAA', // Azul hover
  primaryLight: '#E0F4FB', // Azul tenue
  white: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#374151',
  border: '#E2E8F0',
  bgLight: '#F9FAFB'
};

// Tipos de actividad con iconos y colores
const ACTIVITY_TYPES = {
  document_upload: {
    icon: Upload,
    label: 'Documento subido',
    color: COLORS.primary
  },
  document_download: {
    icon: Download,
    label: 'Documento descargado',
    color: '#10B981'
  },
  document_approved: {
    icon: CheckCircle,
    label: 'Documento aprobado',
    color: '#10B981'
  },
  document_rejected: {
    icon: XCircle,
    label: 'Documento rechazado',
    color: '#EF4444'
  },
  document_expired: {
    icon: AlertTriangle,
    label: 'Documento vencido',
    color: '#F59E0B'
  },
  employee_created: {
    icon: UserPlus,
    label: 'Empleado creado',
    color: COLORS.primary
  },
  employee_updated: {
    icon: Edit,
    label: 'Empleado actualizado',
    color: '#8B5CF6'
  },
  employee_deleted: {
    icon: Trash2,
    label: 'Empleado eliminado',
    color: '#EF4444'
  },
  notification_sent: {
    icon: Mail,
    label: 'Notificación enviada',
    color: '#06B6D4'
  },
  profile_viewed: {
    icon: Eye,
    label: 'Perfil visualizado',
    color: '#6B7280'
  },
  settings_changed: {
    icon: Settings,
    label: 'Configuración modificada',
    color: '#8B5CF6'
  },
  report_generated: {
    icon: FileText,
    label: 'Reporte generado',
    color: COLORS.primary
  }
};

// Datos de ejemplo (mock data)
const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: 'document_upload',
    title: 'Subida de DPI',
    description: 'Se subió el documento de identificación personal del empleado Juan Pérez',
    user: 'María López',
    timestamp: new Date(Date.now() - 5 * 60000),
    metadata: { documentType: 'DPI', employeeName: 'Juan Pérez' }
  },
  {
    id: 2,
    type: 'document_approved',
    title: 'Aprobación de curriculum',
    description: 'Se aprobó el curriculum vitae de Ana García',
    user: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 15 * 60000),
    metadata: { documentType: 'Curriculum', employeeName: 'Ana García' }
  },
  {
    id: 3,
    type: 'employee_created',
    title: 'Nuevo empleado registrado',
    description: 'Se creó el perfil del empleado Pedro Martínez en el sistema',
    user: 'María López',
    timestamp: new Date(Date.now() - 45 * 60000),
    metadata: { employeeName: 'Pedro Martínez', department: 'Recursos Humanos' }
  },
  {
    id: 4,
    type: 'notification_sent',
    title: 'Recordatorio de documento',
    description: 'Se envió notificación sobre documentos pendientes a 15 empleados',
    user: 'Sistema Automático',
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    metadata: { recipientCount: 15 }
  },
  {
    id: 5,
    type: 'document_expired',
    title: 'Documento vencido',
    description: 'El certificado de antecedentes penales de Luis Hernández ha vencido',
    user: 'Sistema Automático',
    timestamp: new Date(Date.now() - 3 * 60 * 60000),
    metadata: { documentType: 'Antecedentes Penales', employeeName: 'Luis Hernández' }
  },
  {
    id: 6,
    type: 'report_generated',
    title: 'Reporte mensual generado',
    description: 'Se generó el reporte de documentos del mes de septiembre',
    user: 'María López',
    timestamp: new Date(Date.now() - 5 * 60 * 60000),
    metadata: { reportType: 'Mensual', month: 'Septiembre' }
  },
  {
    id: 7,
    type: 'employee_updated',
    title: 'Actualización de información',
    description: 'Se actualizó la información de contacto de Sandra Morales',
    user: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 8 * 60 * 60000),
    metadata: { employeeName: 'Sandra Morales', fieldsUpdated: ['teléfono', 'dirección'] }
  },
  {
    id: 8,
    type: 'document_download',
    title: 'Descarga de documento',
    description: 'Se descargó el título universitario de Roberto Díaz',
    user: 'María López',
    timestamp: new Date(Date.now() - 24 * 60 * 60000),
    metadata: { documentType: 'Título Universitario', employeeName: 'Roberto Díaz' }
  },
  {
    id: 9,
    type: 'document_rejected',
    title: 'Documento rechazado',
    description: 'Se rechazó la certificación laboral de Elena Castro por formato incorrecto',
    user: 'Carlos Rodríguez',
    timestamp: new Date(Date.now() - 36 * 60 * 60000),
    metadata: { documentType: 'Certificación Laboral', employeeName: 'Elena Castro', reason: 'Formato incorrecto' }
  },
  {
    id: 10,
    type: 'settings_changed',
    title: 'Configuración modificada',
    description: 'Se actualizaron las reglas de notificación automática',
    user: 'Administrador',
    timestamp: new Date(Date.now() - 48 * 60 * 60000),
    metadata: { settingType: 'Notificaciones Automáticas' }
  }
];

const ActivityHistory = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Cargar actividades (mock data por ahora)
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        // Simular llamada API
        await new Promise(resolve => setTimeout(resolve, 800));
        setActivities(MOCK_ACTIVITIES);
        setFilteredActivities(MOCK_ACTIVITIES);
      } catch (error) {
        toast.error('Error al cargar el historial de actividad');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  // Filtrar actividades
  useEffect(() => {
    let filtered = [...activities];

    // Filtro por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por tipo
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(activity =>
        selectedFilters.includes(activity.type)
      );
    }

    // Filtro por rango de fechas
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= start && activityDate <= end;
      });
    }

    setFilteredActivities(filtered);
  }, [searchQuery, selectedFilters, dateRange, activities]);

  // Formatear fecha relativa
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Formatear fecha completa
  const formatFullDate = (date) => {
    return date.toLocaleString('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle filtro
  const toggleFilter = (type) => {
    setSelectedFilters(prev =>
      prev.includes(type)
        ? prev.filter(f => f !== type)
        : [...prev, type]
    );
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSelectedFilters([]);
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <Activity
                  className="w-7 h-7"
                  style={{ color: COLORS.primary }}
                />
              </div>
              <div>
                <h1
                  className="text-3xl font-bold"
                  style={{ color: COLORS.primary }}
                >
                  Historial de Actividad
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: COLORS.textSecondary }}
                >
                  Registro completo de acciones y eventos del sistema
                </p>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <Card className="mb-6 shadow-sm border" style={{ borderColor: COLORS.border }}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Búsqueda */}
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    style={{ color: COLORS.textSecondary }}
                  />
                  <Input
                    type="text"
                    placeholder="Buscar por actividad, usuario o descripción..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                    style={{ borderColor: COLORS.border }}
                  />
                </div>

                {/* Botón de filtros */}
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                  style={showFilters ? {
                    backgroundColor: COLORS.primary,
                    color: COLORS.white
                  } : {
                    borderColor: COLORS.border,
                    color: COLORS.textPrimary
                  }}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {selectedFilters.length > 0 && (
                    <Badge
                      className="ml-1"
                      style={{
                        backgroundColor: COLORS.white,
                        color: COLORS.primary
                      }}
                    >
                      {selectedFilters.length}
                    </Badge>
                  )}
                </Button>

                {/* Botón limpiar filtros */}
                {(selectedFilters.length > 0 || searchQuery || dateRange.start) && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    <X className="w-4 h-4" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Panel de filtros expandible */}
              {showFilters && (
                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: `1px solid ${COLORS.border}` }}
                >
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Filtrar por tipo de actividad
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                    {Object.entries(ACTIVITY_TYPES).map(([type, config]) => {
                      const Icon = config.icon;
                      const isSelected = selectedFilters.includes(type);

                      return (
                        <button
                          key={type}
                          onClick={() => toggleFilter(type)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md"
                          style={{
                            backgroundColor: isSelected ? COLORS.primaryLight : COLORS.white,
                            borderColor: isSelected ? COLORS.primary : COLORS.border,
                            color: COLORS.textPrimary
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: config.color }}
                          />
                          <span className="text-sm truncate">{config.label}</span>
                          {isSelected && (
                            <CheckCircle
                              className="w-4 h-4 ml-auto"
                              style={{ color: COLORS.primary }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Filtros de fecha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="text-sm font-medium mb-2 block"
                        style={{ color: COLORS.textSecondary }}
                      >
                        Fecha inicio
                      </label>
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        style={{ borderColor: COLORS.border }}
                      />
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium mb-2 block"
                        style={{ color: COLORS.textSecondary }}
                      >
                        Fecha fin
                      </label>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        style={{ borderColor: COLORS.border }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: COLORS.primary }}
              />
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Activity
                  className="w-16 h-16 mx-auto mb-4 opacity-30"
                  style={{ color: COLORS.textSecondary }}
                />
                <p
                  className="text-lg font-medium"
                  style={{ color: COLORS.textSecondary }}
                >
                  No se encontraron actividades
                </p>
                <p
                  className="text-sm mt-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Intenta ajustar los filtros de búsqueda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div
                className="absolute left-6 top-0 bottom-0 w-0.5 hidden md:block"
                style={{ backgroundColor: COLORS.border }}
              />

              {/* Eventos del timeline */}
              <div className="space-y-4">
                {filteredActivities.map((activity, index) => {
                  const config = ACTIVITY_TYPES[activity.type];
                  const Icon = config?.icon || Activity;

                  return (
                    <div
                      key={activity.id}
                      className="relative group"
                    >
                      {/* Card del evento */}
                      <Card
                        className="ml-0 md:ml-16 transition-all duration-300 hover:shadow-lg cursor-pointer border"
                        style={{ borderColor: COLORS.border }}
                      >
                        <CardContent className="p-4 md:p-5">
                          <div className="flex items-start gap-4">
                            {/* Icono circular (visible en móvil y desktop) */}
                            <div
                              className="absolute left-0 md:left-[-40px] top-5 w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 z-10"
                              style={{
                                backgroundColor: COLORS.primary,
                                border: `4px solid ${COLORS.white}`
                              }}
                            >
                              <Icon
                                className="w-5 h-5"
                                style={{ color: COLORS.white }}
                                aria-label={config?.label}
                              />
                            </div>

                            {/* Contenido del evento */}
                            <div className="flex-1 ml-16 md:ml-0">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <h3
                                    className="text-lg font-semibold mb-1"
                                    style={{ color: COLORS.textPrimary }}
                                  >
                                    {activity.title}
                                  </h3>
                                  <p
                                    className="text-sm leading-relaxed"
                                    style={{ color: COLORS.textSecondary }}
                                  >
                                    {activity.description}
                                  </p>
                                </div>

                                {/* Badge de estado */}
                                <Badge
                                  className="self-start whitespace-nowrap text-xs font-medium px-3 py-1"
                                  style={{
                                    backgroundColor: COLORS.primaryLight,
                                    color: COLORS.primary,
                                    border: 'none'
                                  }}
                                >
                                  {config?.label}
                                </Badge>
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ color: COLORS.textSecondary }}
                                >
                                  <User className="w-4 h-4" />
                                  <span>{activity.user}</span>
                                </div>
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ color: COLORS.textSecondary }}
                                  title={formatFullDate(activity.timestamp)}
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>{formatRelativeTime(activity.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estadísticas resumidas */}
          {!loading && filteredActivities.length > 0 && (
            <Card
              className="mt-6 shadow-sm border"
              style={{ borderColor: COLORS.border }}
            >
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: COLORS.primary }}
                    >
                      {filteredActivities.length}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: COLORS.textSecondary }}
                    >
                      Total actividades
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: '#10B981' }}
                    >
                      {filteredActivities.filter(a => a.type.includes('approved')).length}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: COLORS.textSecondary }}
                    >
                      Aprobaciones
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: COLORS.primary }}
                    >
                      {filteredActivities.filter(a => a.type.includes('upload')).length}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: COLORS.textSecondary }}
                    >
                      Subidas
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: '#F59E0B' }}
                    >
                      {filteredActivities.filter(a => a.type.includes('expired')).length}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: COLORS.textSecondary }}
                    >
                      Vencidos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;
