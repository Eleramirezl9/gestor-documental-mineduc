import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEmployeeRealtimeUpdates } from '../hooks/useEmployeeRealtimeUpdates';
import { toast } from 'react-hot-toast';
import api, { employeesAPI } from '../lib/api';
import EmployeeReportSimple from '../components/reports/EmployeeReportSimple';
import useCanvasPDFGenerator from '../hooks/useCanvasPDFGenerator';
import usePDFGenerator from '../hooks/usePDFGenerator';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import {
  Plus,
  Search,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Activity,
  ChevronRight,
  Upload,
  Download as DownloadIcon,
  Eye,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon
} from 'lucide-react';

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('resumen');
  const reportRef = useRef();
  const { generatePDFFromData } = useCanvasPDFGenerator();
  const { printReport } = usePDFGenerator(); // Solo para funcionalidad de impresión

  // Callbacks para actualizaciones en tiempo real
  const handleEmployeeUpdate = useCallback((eventType, newEmployee, oldEmployee) => {
    console.log('🔄 Actualizando empleados en tiempo real:', { eventType, newEmployee, oldEmployee });

    setEmployees(prevEmployees => {
      switch (eventType) {
        case 'INSERT':
          // Verificar si el empleado ya existe para evitar duplicados
          const exists = prevEmployees.some(emp => emp.id === newEmployee.id);
          if (!exists) {
            return [...prevEmployees, newEmployee];
          }
          return prevEmployees;

        case 'UPDATE':
          return prevEmployees.map(emp =>
            emp.id === newEmployee.id ? { ...emp, ...newEmployee } : emp
          );

        case 'DELETE':
          return prevEmployees.filter(emp => emp.id !== oldEmployee.id);

        case 'TEST':
          toast('Actualización de prueba recibida', { icon: 'ℹ️' });
          return prevEmployees;

        default:
          return prevEmployees;
      }
    });
  }, []);

  const handleRequirementUpdate = useCallback((eventType, requirement, oldRequirement) => {
    console.log('🔄 Actualizando requerimientos en tiempo real:', { eventType, requirement, oldRequirement });

    // Recargar los empleados para actualizar sus estados de documentos
    // Esto es más simple que actualizar manualmente los estados complejos
    loadEmployees();
  }, []);

  // Configurar actualizaciones en tiempo real
  const { sendTestUpdate } = useEmployeeRealtimeUpdates(handleEmployeeUpdate, handleRequirementUpdate);

  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });

  // Estado del formulario de registro
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    first_name: '',
    last_name: '',
    department: '',
    phone: '',
    employee_id: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    address: '',
    date_of_birth: '',
    national_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    required_documents: []
  });

  // Obtener próximo ID de empleado disponible
  const getNextEmployeeId = async () => {
    try {
      console.log('🆔 Solicitando próximo employee_id...');
      const response = await employeesAPI.getNextId();

      if (response.data.success) {
        const nextId = response.data.employee_id;
        console.log('✅ Próximo ID obtenido:', nextId);
        return nextId;
      } else {
        throw new Error('No se pudo obtener el próximo ID');
      }
    } catch (error) {
      console.error('Error obteniendo próximo ID:', error);
      toast.error('Error obteniendo ID de empleado. Se usará ID automático.');
      // Fallback: generar ID básico
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const timestamp = Date.now().toString().slice(-3);
      return `MIN${currentYear}${timestamp}`;
    }
  };

  // Resetear formulario con próximo ID automático
  const resetEmployeeForm = async () => {
    const nextId = await getNextEmployeeId();
    setNewEmployee({
      email: '',
      first_name: '',
      last_name: '',
      department: '',
      phone: '',
      employee_id: nextId,
      position: '',
      hire_date: new Date().toISOString().split('T')[0],
      address: '',
      date_of_birth: '',
      national_id: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      required_documents: []
    });
  };

  // Cargar empleados
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = {};

      if (filters.search) params.search = filters.search;
      if (filters.department) params.department = filters.department;
      if (filters.status) params.status = filters.status;

      const response = await api.get('/employee-documents/employees', { params });
      console.log('📋 Response from loadEmployees:', response.data);
      console.log('📋 Employees array:', response.data.employees);
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error cargando empleados');
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo empleado
  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/employee-documents/register', newEmployee);

      // Axios responde con data directamente en response.data
      if (response.data.success) {
        toast.success('Empleado registrado exitosamente');
        await resetEmployeeForm();
        setShowRegistrationForm(false);
        loadEmployees();
      } else {
        throw new Error(response.data.error || 'Error registrando empleado');
      }
    } catch (error) {
      console.error('Error:', error);
      // Manejar errores de validación específicos
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => `${err.path}: ${err.msg}`).join(', ');
        toast.error(`Errores de validación: ${errorMessages}`);
      } else {
        // Otros tipos de error
        const errorMessage = error.response?.data?.error || error.message;
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte profesional
  const generateReport = async () => {
    try {
      setLoading(true);

      // Calcular estadísticas
      const departmentStats = {};
      const statusCounts = { 'Completo': 0, 'Normal': 0, 'Atención': 0, 'Crítico': 0 };

      employees.forEach(emp => {
        // Estadísticas por departamento
        if (departmentStats[emp.department]) {
          departmentStats[emp.department]++;
        } else {
          departmentStats[emp.department] = 1;
        }

        // Contar estados de documentos
        if (statusCounts[emp.documentStatus] !== undefined) {
          statusCounts[emp.documentStatus]++;
        }
      });

      // Convertir a array con porcentajes
      const departmentStatsArray = Object.entries(departmentStats).map(([dept, count]) => ({
        department: dept,
        count,
        percentage: ((count / employees.length) * 100).toFixed(1)
      }));

      // Identificar documentos críticos (simulado)
      const criticalDocuments = employees
        .filter(emp => emp.documentStatus === 'Crítico')
        .map(emp => ({
          employee_name: `${emp.first_name} ${emp.last_name}`,
          document_type: 'Documento Vencido',
          description: 'Documento requerido vencido o por vencer',
          required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          status: 'Vencido'
        }));

      const reportInfo = {
        departmentStats: departmentStatsArray,
        statusCounts,
        criticalDocuments,
        generatedAt: new Date(),
        totalEmployees: employees.length
      };

      setReportData(reportInfo);
      setShowReport(true);
      toast.success('Reporte generado exitosamente');

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Exportar reporte como PDF usando Canvas (sin CSS/HTML)
  const exportToPDF = async () => {
    if (!reportData) {
      toast.error('No hay reporte para exportar');
      return;
    }

    // Mostrar indicador de carga
    const toastId = toast.loading('🎨 Generando PDF con Canvas... Por favor espera');

    try {
      console.log('🔄 Iniciando exportación PDF con Canvas...');
      console.log('📊 Datos del reporte:', { employees: employees?.length, reportData });

      // Usar el generador basado en Canvas que no depende de CSS
      const result = await generatePDFFromData(employees, reportData, 'reporte_empleados_mineduc');

      toast.dismiss(toastId);

      if (result.success) {
        toast.success(`✅ PDF generado: ${result.fileName}`, { duration: 4000 });
        console.log('✅ PDF exportado exitosamente:', result.fileName);
      } else {
        toast.error(`❌ ${result.message}`, { duration: 6000 });
        console.error('❌ Error en resultado PDF:', result);
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(`❌ Error inesperado: ${error.message}`, { duration: 6000 });
      console.error('❌ Error en exportToPDF:', error);
    }
  };

  // Imprimir reporte
  const handlePrintReport = () => {
    if (!reportRef.current) {
      toast.error('No hay reporte para imprimir');
      return;
    }

    const result = printReport(reportRef);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  // Obtener badge de estado
  const getStatusBadge = (status) => {
    const statusConfig = {
      critical: { variant: 'destructive', label: 'Crítico' },
      attention: { variant: 'secondary', label: 'Atención' },
      normal: { variant: 'outline', label: 'Normal' },
      complete: { variant: 'default', label: 'Completo' }
    };

    const config = statusConfig[status] || statusConfig.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  useEffect(() => {
    loadEmployees();
  }, [filters]);

  // Inicializar ID automáticamente al cargar
  useEffect(() => {
    if (!newEmployee.employee_id) {
      resetEmployeeForm();
    }
  }, []);

  // Función para abrir perfil del empleado
  const handleViewEmployeeProfile = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeProfile(true);
    setActiveProfileTab('resumen'); // Reset to first tab
  };

  // Componente del perfil del empleado con pestañas
  const EmployeeProfileModal = () => {
    if (!selectedEmployee) return null;

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('es-GT');
    };

    // Datos simulados para documentos y actividades
    const documentStats = {
      completos: 3,
      pendientes: 1,
      vencidos: 1
    };

    const documents = [
      { id: 1, name: 'Contrato de Trabajo', status: 'Completo', uploadDate: '2024-01-15', type: 'PDF' },
      { id: 2, name: 'DPI Escaneado', status: 'Completo', uploadDate: '2024-01-15', type: 'PDF' },
      { id: 3, name: 'Certificado Médico', status: 'Completo', uploadDate: '2024-01-20', type: 'PDF' },
      { id: 4, name: 'Título Universitario', status: 'Pendiente', uploadDate: null, type: 'PDF' },
      { id: 5, name: 'Antecedentes Penales', status: 'Vencido', uploadDate: '2023-12-01', type: 'PDF' }
    ];

    const activities = [
      { id: 1, action: 'Subió documento', detail: 'Certificado Médico', date: '2024-01-20 10:30 AM', type: 'upload' },
      { id: 2, action: 'Subió documento', detail: 'DPI Escaneado', date: '2024-01-15 02:15 PM', type: 'upload' },
      { id: 3, action: 'Subió documento', detail: 'Contrato de Trabajo', date: '2024-01-15 09:00 AM', type: 'upload' },
      { id: 4, action: 'Perfil creado', detail: 'Cuenta de empleado activada', date: '2024-01-15 08:30 AM', type: 'system' }
    ];

    const getStatusIcon = (status) => {
      switch (status) {
        case 'Completo':
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'Pendiente':
          return <ClockIcon className="h-4 w-4 text-yellow-500" />;
        case 'Vencido':
          return <XCircle className="h-4 w-4 text-red-500" />;
        default:
          return <ClockIcon className="h-4 w-4 text-gray-500" />;
      }
    };

    const getActivityIcon = (type) => {
      switch (type) {
        case 'upload':
          return <Upload className="h-4 w-4 text-blue-500" />;
        case 'download':
          return <DownloadIcon className="h-4 w-4 text-green-500" />;
        case 'view':
          return <Eye className="h-4 w-4 text-gray-500" />;
        case 'system':
          return <Shield className="h-4 w-4 text-purple-500" />;
        default:
          return <Activity className="h-4 w-4 text-gray-500" />;
      }
    };

    // Memorizar contenido de pestañas para evitar re-render
    const tabContent = useMemo(() => {
      const resumenContent = (
        <div className="space-y-6">
          {/* Layout responsive mejorado */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Información Personal */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Información Personal
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Nombre Completo:</span>
                  <div className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-sm text-gray-600 dark:text-gray-400">ID Empleado:</span>
                  <div className="text-sm font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mt-1 inline-block">
                    {selectedEmployee.employee_id}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Email:</span>
                  <div className="text-sm text-gray-900 dark:text-white mt-1 break-all">{selectedEmployee.email}</div>
                </div>
                {selectedEmployee.phone && (
                  <div>
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Teléfono:</span>
                    <div className="text-sm text-gray-900 dark:text-white mt-1">{selectedEmployee.phone}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Información Laboral */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Información Laboral
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Departamento:</span>
                    <div className="text-sm text-gray-900 dark:text-white mt-1">{selectedEmployee.department}</div>
                  </div>
                  <div>
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Cargo:</span>
                    <div className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedEmployee.position || 'Especialista en Nómina'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Fecha de Ingreso:</span>
                    <div className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedEmployee.hire_date)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-sm text-gray-600 dark:text-gray-400">Estado:</span>
                    <div className="mt-1">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                        {selectedEmployee.documentStatus || 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Documentos */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
              Resumen de Documentos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{documentStats.completos}</div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">Completos</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{documentStats.pendientes}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Pendientes</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{documentStats.vencidos}</div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-1">Vencidos</div>
              </div>
            </div>
          </div>
        </div>
      );

      const documentosContent = (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documentos</h3>
            <Button size="sm" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </div>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{doc.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {doc.uploadDate ? `Subido: ${formatDate(doc.uploadDate)}` : 'No subido'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Badge
                      variant={doc.status === 'Completo' ? 'default' : doc.status === 'Pendiente' ? 'secondary' : 'destructive'}
                      className="flex-shrink-0"
                    >
                      {doc.status}
                    </Badge>
                    {doc.uploadDate && (
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      const actividadContent = (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actividad Reciente</h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <div className="mt-0.5 flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{activity.detail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      return { resumenContent, documentosContent, actividadContent };
    }, [selectedEmployee, documentStats, documents, activities, formatDate, getStatusIcon, getActivityIcon]);

    return (
      <Dialog open={showEmployeeProfile} onOpenChange={setShowEmployeeProfile}>
        <DialogContent className="max-w-[98vw] w-[95vw] sm:w-[85vw] h-[85vh] sm:h-[80vh] p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Perfil de {selectedEmployee.first_name} {selectedEmployee.last_name}
            </DialogTitle>
            <DialogDescription>
              Información detallada, documentos y actividad del empleado
            </DialogDescription>
          </DialogHeader>

          {/* Header fijo */}
          <div className="flex items-center gap-4 p-4 border-b bg-white dark:bg-gray-900">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {selectedEmployee.first_name?.charAt(0)}{selectedEmployee.last_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h2>
              <div className="text-sm text-gray-500 truncate">
                {selectedEmployee.position || 'Especialista en Nómina'}
              </div>
              <p className="text-sm text-gray-400 truncate">
                {selectedEmployee.email}
              </p>
            </div>
          </div>

          {/* Pestañas - Diseño mejorado */}
          <div className="flex border-b">
            {[
              { id: 'resumen', label: 'Resumen', icon: <User className="h-4 w-4" /> },
              { id: 'documentos', label: 'Documentos', icon: <FileText className="h-4 w-4" />, badge: 2 },
              { id: 'actividad', label: 'Actividad', icon: <Activity className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium relative whitespace-nowrap ${
                  activeProfileTab === tab.id
                    ? 'text-blue-600 bg-white dark:bg-gray-900 border-b-2 border-blue-500'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contenido optimizado - sin re-renderizado */}
          <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              {/* Tab: Resumen */}
              <div className={activeProfileTab === 'resumen' ? 'block' : 'hidden'}>
                {tabContent.resumenContent}
              </div>

              {/* Tab: Documentos */}
              <div className={activeProfileTab === 'documentos' ? 'block' : 'hidden'}>
                {tabContent.documentosContent}
              </div>

              {/* Tab: Actividad */}
              <div className={activeProfileTab === 'actividad' ? 'block' : 'hidden'}>
                {tabContent.actividadContent}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Debug del usuario
  console.log('🔍 EmployeeManagement user:', user);
  console.log('🔍 User role:', user?.role);

  // Solo administradores pueden acceder
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Acceso Restringido</h3>
              <p className="text-gray-600">Solo los administradores pueden gestionar empleados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <p className="text-gray-600">Administra empleados y documentos requeridos</p>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="register">
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lista de Empleados</CardTitle>
              <div className="flex gap-2">
                <Button onClick={generateReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reporte
                </Button>
                <Button onClick={sendTestUpdate} variant="outline">
                  🔄 Test Tiempo Real
                </Button>
                <Button onClick={loadEmployees} disabled={loading}>
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Buscar por nombre, email..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    placeholder="Filtrar por departamento"
                    value={filters.department}
                    onChange={(e) => setFilters({...filters, department: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="critical">Crítico</option>
                    <option value="attention">Atención</option>
                    <option value="normal">Normal</option>
                    <option value="complete">Completo</option>
                  </select>
                </div>
              </div>

              {/* Lista de empleados */}
              {loading ? (
                <div className="text-center py-8">Cargando empleados...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay empleados registrados
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleViewEmployeeProfile(employee)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            {getStatusBadge(employee.overall_status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {employee.email} • {employee.department}
                          </p>
                          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {employee.employee_id && (
                              <span>ID: {employee.employee_id}</span>
                            )}
                            {employee.position && (
                              <span>{employee.position}</span>
                            )}
                            {employee.hire_date && (
                              <span>Desde: {new Date(employee.hire_date).toLocaleDateString('es-ES')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{employee.document_status?.total || 0}</span>
                            </div>
                            {employee.document_status?.expiring_soon > 0 && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <Clock className="h-4 w-4" />
                                <span>{employee.document_status.expiring_soon}</span>
                              </div>
                            )}
                            {employee.document_status?.expired > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span>{employee.document_status.expired}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nuevo Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nombre *</Label>
                    <Input
                      id="first_name"
                      required
                      value={newEmployee.first_name}
                      onChange={(e) => setNewEmployee({...newEmployee, first_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Apellido *</Label>
                    <Input
                      id="last_name"
                      required
                      value={newEmployee.last_name}
                      onChange={(e) => setNewEmployee({...newEmployee, last_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee_id">ID Empleado (Automático)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="employee_id"
                        value={newEmployee.employee_id}
                        readOnly
                        placeholder="Se generará automáticamente..."
                        className="bg-gray-50 dark:bg-gray-700"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const nextId = await getNextEmployeeId();
                          setNewEmployee({...newEmployee, employee_id: nextId});
                        }}
                        className="whitespace-nowrap"
                      >
                        Generar
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Formato: MIN{new Date().getFullYear().toString().slice(-2)}XXX (ej: MIN25001)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="department">Departamento *</Label>
                    <Input
                      id="department"
                      required
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Posición</Label>
                    <Input
                      id="position"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hire_date">Fecha de Contratación *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      required
                      value={newEmployee.hire_date}
                      onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Información Personal */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={newEmployee.date_of_birth}
                        onChange={(e) => setNewEmployee({...newEmployee, date_of_birth: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="national_id">DPI/Cédula</Label>
                      <Input
                        id="national_id"
                        placeholder="1234567890123"
                        value={newEmployee.national_id}
                        onChange={(e) => setNewEmployee({...newEmployee, national_id: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        placeholder="Zona 10, Ciudad de Guatemala"
                        value={newEmployee.address}
                        onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto de Emergencia */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Contacto de Emergencia</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergency_contact_name">Nombre</Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Nombre completo"
                        value={newEmployee.emergency_contact_name}
                        onChange={(e) => setNewEmployee({...newEmployee, emergency_contact_name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_contact_phone">Teléfono</Label>
                      <Input
                        id="emergency_contact_phone"
                        placeholder="+502 5555-1234"
                        value={newEmployee.emergency_contact_phone}
                        onChange={(e) => setNewEmployee({...newEmployee, emergency_contact_phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_contact_relationship">Relación</Label>
                      <select
                        id="emergency_contact_relationship"
                        value={newEmployee.emergency_contact_relationship}
                        onChange={(e) => setNewEmployee({...newEmployee, emergency_contact_relationship: e.target.value})}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Padre">Padre</option>
                        <option value="Madre">Madre</option>
                        <option value="Esposo">Esposo</option>
                        <option value="Esposa">Esposa</option>
                        <option value="Hermano">Hermano</option>
                        <option value="Hermana">Hermana</option>
                        <option value="Hijo">Hijo</option>
                        <option value="Hija">Hija</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewEmployee({
                      email: '', first_name: '', last_name: '', department: '',
                      phone: '', employee_id: '', position: '', hire_date: new Date().toISOString().split('T')[0],
                      address: '', date_of_birth: '', national_id: '',
                      emergency_contact_name: '', emergency_contact_phone: '',
                      emergency_contact_relationship: '', required_documents: []
                    })}
                  >
                    Limpiar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrar Empleado'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Reporte */}
      {showReport && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Header del Modal */}
            <div className="p-6 border-b bg-blue-50 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-blue-800">📊 Reporte de Empleados</h2>
              <div className="flex gap-2">
                <Button onClick={exportToPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button onClick={handlePrintReport} variant="outline" size="sm">
                  🖨️ Imprimir
                </Button>
                <Button onClick={() => setShowReport(false)} variant="outline" size="sm">
                  ✕ Cerrar
                </Button>
              </div>
            </div>

            {/* Contenido del Reporte */}
            <div className="flex-1 overflow-auto">
              <EmployeeReportSimple
                ref={reportRef}
                employees={employees}
                reportData={reportData}
              />
            </div>
          </div>
        </div>
      )}

      {/* El PDF ahora se genera usando Canvas directamente, sin necesidad de componentes HTML */}

      {/* Modal del perfil del empleado */}
      <EmployeeProfileModal />
    </div>
  );
};

export default EmployeeManagement;