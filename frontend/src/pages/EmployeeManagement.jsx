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
  Clock as ClockIcon,
  Settings,
  Package,
  PlusCircle,
  Minus,
  Save,
  Check,
  MessageSquare
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

  // Estados para asignación de documentos requeridos
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedEmployeeForDocuments, setSelectedEmployeeForDocuments] = useState(null);
  const [documentItems, setDocumentItems] = useState([]);
  const [assignedDocuments, setAssignedDocuments] = useState([]);

  // Estados para crear nuevos tipos de documentos
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [customDocuments, setCustomDocuments] = useState([]);

  // Estados para plantillas de documentos
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    icon: 'template',
    documents: []
  });
  const [newDocumentForm, setNewDocumentForm] = useState({
    name: '',
    category: '',
    description: '',
    required: false,
    customCategory: '',
    hasExpiration: false,
    renewalPeriod: 12,
    renewalUnit: 'months'
  });
  const reportRef = useRef();
  const { generatePDFFromData } = useCanvasPDFGenerator();
  const { printReport } = usePDFGenerator(); // Solo para funcionalidad de impresión

  // Catálogo de documentos requeridos disponibles
  const availableDocuments = [
    { id: 1, name: 'Curriculum Vitae', category: 'Personal', description: 'CV actualizado del empleado', required: true, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 2, name: 'DPI (Documento Personal de Identificación)', category: 'Identificación', description: 'Copia de DPI vigente', required: true, hasExpiration: false },
    { id: 3, name: 'Fotografía Reciente', category: 'Personal', description: 'Fotografía tamaño cédula', required: true, hasExpiration: true, renewalPeriod: 24, renewalUnit: 'months' },
    { id: 4, name: 'Partida de Nacimiento', category: 'Identificación', description: 'Partida de nacimiento certificada', required: true, hasExpiration: false },
    { id: 5, name: 'Certificado de Antecedentes Penales', category: 'Legal', description: 'Certificado de antecedentes penales vigente', required: true, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 6, name: 'Certificado de Antecedentes Policíacos', category: 'Legal', description: 'Certificado de antecedentes policíacos vigente', required: true, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 7, name: 'Título Universitario', category: 'Académico', description: 'Título profesional universitario', required: false, hasExpiration: false },
    { id: 8, name: 'Diploma de Educación Media', category: 'Académico', description: 'Diploma de graduación de secundaria', required: true, hasExpiration: false },
    { id: 9, name: 'Certificaciones Profesionales', category: 'Académico', description: 'Certificaciones adicionales relevantes', required: false, hasExpiration: true, renewalPeriod: 36, renewalUnit: 'months' },
    { id: 10, name: 'Certificado Médico', category: 'Salud', description: 'Certificado médico de aptitud laboral', required: true, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 11, name: 'Constancia de Trabajo Anterior', category: 'Laboral', description: 'Constancias de empleos anteriores', required: false, hasExpiration: false },
    { id: 12, name: 'Referencias Laborales', category: 'Laboral', description: 'Cartas de referencia de empleadores anteriores', required: false, hasExpiration: false },
    { id: 13, name: 'Referencias Personales', category: 'Personal', description: 'Cartas de referencia personal', required: false, hasExpiration: false },
    { id: 14, name: 'Solvencia Fiscal (SAT)', category: 'Legal', description: 'Solvencia fiscal emitida por SAT', required: false, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 15, name: 'Solvencia Municipal', category: 'Legal', description: 'Solvencia municipal de residencia', required: false, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 16, name: 'Contrato de Trabajo', category: 'Laboral', description: 'Contrato de trabajo firmado', required: true, hasExpiration: false },
    { id: 17, name: 'Declaración Jurada de Ingresos', category: 'Legal', description: 'Declaración jurada de ingresos', required: false, hasExpiration: true, renewalPeriod: 12, renewalUnit: 'months' },
    { id: 18, name: 'Carné de IGSS', category: 'Salud', description: 'Carné del Instituto Guatemalteco de Seguridad Social', required: true, hasExpiration: false }
  ];

  // Plantillas de documentos por cargo/puesto
  const documentTemplates = [
    {
      id: 1,
      name: 'Médico General',
      description: 'Plantilla completa para médicos generales',
      category: 'Salud',
      icon: 'stethoscope',
      documents: [
        { documentId: 1, priority: 'urgente', hasCustomRenewal: false }, // CV
        { documentId: 2, priority: 'urgente', hasCustomRenewal: false }, // DPI
        { documentId: 3, priority: 'normal', hasCustomRenewal: false }, // Fotografía
        { documentId: 7, priority: 'urgente', hasCustomRenewal: false }, // Título Universitario
        { documentId: 10, priority: 'urgente', hasCustomRenewal: true, customRenewalPeriod: 6, customRenewalUnit: 'months' }, // Certificado Médico
        { documentId: 18, priority: 'alta', hasCustomRenewal: false } // Carné IGSS
      ]
    },
    {
      id: 2,
      name: 'Enfermera/o',
      description: 'Plantilla para personal de enfermería',
      category: 'Salud',
      icon: 'cross',
      documents: [
        { documentId: 1, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 2, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 3, priority: 'normal', hasCustomRenewal: false },
        { documentId: 7, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 9, priority: 'alta', hasCustomRenewal: true, customRenewalPeriod: 24, customRenewalUnit: 'months' }, // Certificaciones
        { documentId: 10, priority: 'urgente', hasCustomRenewal: true, customRenewalPeriod: 6, customRenewalUnit: 'months' },
        { documentId: 18, priority: 'alta', hasCustomRenewal: false }
      ]
    },
    {
      id: 3,
      name: 'Docente',
      description: 'Plantilla para personal docente',
      category: 'Educación',
      icon: 'graduationCap',
      documents: [
        { documentId: 1, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 2, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 3, priority: 'normal', hasCustomRenewal: false },
        { documentId: 7, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 8, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 9, priority: 'normal', hasCustomRenewal: true, customRenewalPeriod: 36, customRenewalUnit: 'months' },
        { documentId: 10, priority: 'alta', hasCustomRenewal: false },
        { documentId: 11, priority: 'normal', hasCustomRenewal: false }
      ]
    },
    {
      id: 4,
      name: 'Administrativo',
      description: 'Plantilla para personal administrativo',
      category: 'Administración',
      icon: 'briefcase',
      documents: [
        { documentId: 1, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 2, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 3, priority: 'normal', hasCustomRenewal: false },
        { documentId: 8, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 10, priority: 'alta', hasCustomRenewal: false },
        { documentId: 16, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 18, priority: 'alta', hasCustomRenewal: false }
      ]
    },
    {
      id: 5,
      name: 'Especialista en Nómina',
      description: 'Plantilla para especialistas en nómina y recursos humanos',
      category: 'Recursos Humanos',
      icon: 'calculator',
      documents: [
        { documentId: 1, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 2, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 3, priority: 'normal', hasCustomRenewal: false },
        { documentId: 7, priority: 'alta', hasCustomRenewal: false },
        { documentId: 8, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 9, priority: 'normal', hasCustomRenewal: false },
        { documentId: 10, priority: 'alta', hasCustomRenewal: false },
        { documentId: 14, priority: 'normal', hasCustomRenewal: true, customRenewalPeriod: 6, customRenewalUnit: 'months' },
        { documentId: 16, priority: 'urgente', hasCustomRenewal: false },
        { documentId: 17, priority: 'normal', hasCustomRenewal: true, customRenewalPeriod: 12, customRenewalUnit: 'months' }
      ]
    }
  ];

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

  const [_showRegistrationForm, setShowRegistrationForm] = useState(false);
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

  // Funciones para asignación de documentos requeridos
  const handleOpenDocumentsModal = (employee, e) => {
    e.stopPropagation(); // Evita que se abra el perfil del empleado
    setSelectedEmployeeForDocuments(employee);
    // Cargar documentos ya asignados al empleado (simulado)
    const existingAssignments = [
      {
        id: 1,
        documentId: 2, // DPI - no vence
        assignedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // hace 15 días
        status: 'asignado',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        uploadedFile: 'DPI_Juan_Perez.pdf',
        uploadStatus: 'subido',
        uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // subido hace 10 días
      },
      {
        id: 2,
        documentId: 10, // Certificado Médico - vence en 12 meses
        assignedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // hace 60 días
        status: 'asignado',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
        uploadedFile: 'Certificado_Medico_2024.pdf',
        uploadStatus: 'subido',
        uploadDate: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000) // subido hace 330 días (cerca del vencimiento)
      },
      {
        id: 3,
        documentId: 5, // Antecedentes Penales - vence en 12 meses
        assignedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // hace 30 días
        status: 'asignado',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días
        uploadedFile: null,
        uploadStatus: 'pendiente'
      }
    ];
    setAssignedDocuments(existingAssignments);
    setDocumentItems([]);
    setSelectedTemplate(null); // Limpiar plantilla seleccionada
    setShowDocumentsModal(true);
  };

  // Función para obtener iconos SVG
  const getTemplateIcon = (iconName, className = "h-5 w-5") => {
    const icons = {
      stethoscope: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26 2.22 2.577 2.637 3.892m0 0a3 3 0 01-2.220 2.220m0-2.220L14.5 14.5M8 4H6a2 2 0 00-2 2v6l.5.5 1.5-1.5L8 13V4z"/>
        </svg>
      ),
      cross: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
      ),
      graduationCap: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
        </svg>
      ),
      briefcase: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4a2 2 0 00-2-2H8a2 2 0 00-2 2v2M7 6h10l1 12H6L7 6z"/>
        </svg>
      ),
      calculator: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      ),
      template: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
      ),
      refresh: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      ),
      lightbulb: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      ),
      document: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      calendar: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      )
    };
    return icons[iconName] || icons.template;
  };

  // Función para aplicar una plantilla
  const handleApplyTemplate = (template) => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const templateItems = template.documents.map(templateDoc => ({
      id: Date.now() + Math.random(),
      documentId: templateDoc.documentId.toString(),
      assignedDate: today,
      dueDate: defaultDueDate,
      status: 'pendiente',
      priority: templateDoc.priority,
      notes: `Aplicado desde plantilla: ${template.name}`,
      hasCustomRenewal: templateDoc.hasCustomRenewal || false,
      customRenewalPeriod: templateDoc.customRenewalPeriod || 12,
      customRenewalUnit: templateDoc.customRenewalUnit || 'months'
    }));

    setDocumentItems(templateItems);
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  // Funciones para crear plantillas personalizadas
  const handleCreateTemplateFromCurrent = () => {
    if (documentItems.length === 0) {
      alert('Primero agrega algunos documentos antes de crear una plantilla');
      return;
    }

    // Pre-cargar el formulario con los documentos actuales
    const templateDocuments = documentItems
      .filter(item => item.documentId) // Solo documentos seleccionados
      .map(item => ({
        documentId: parseInt(item.documentId),
        priority: item.priority,
        hasCustomRenewal: item.hasCustomRenewal || false,
        customRenewalPeriod: item.customRenewalPeriod || 12,
        customRenewalUnit: item.customRenewalUnit || 'months'
      }));

    setNewTemplateForm({
      name: '',
      description: '',
      category: '',
      icon: 'template',
      documents: templateDocuments
    });
    setShowCreateTemplateModal(true);
  };

  const handleSaveCustomTemplate = () => {
    if (!newTemplateForm.name.trim() || !newTemplateForm.category.trim() || newTemplateForm.documents.length === 0) {
      alert('Por favor completa todos los campos requeridos y asegúrate de tener al menos un documento');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      name: newTemplateForm.name.trim(),
      description: newTemplateForm.description.trim(),
      category: newTemplateForm.category.trim(),
      icon: newTemplateForm.icon,
      documents: newTemplateForm.documents,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setCustomTemplates([...customTemplates, newTemplate]);
    setShowCreateTemplateModal(false);
    setNewTemplateForm({
      name: '',
      description: '',
      category: '',
      icon: 'template',
      documents: []
    });

    alert(`Plantilla "${newTemplate.name}" creada exitosamente!`);
  };

  const handleAddDocumentToTemplate = () => {
    const newDoc = {
      documentId: null,
      priority: 'normal',
      hasCustomRenewal: false,
      customRenewalPeriod: 12,
      customRenewalUnit: 'months'
    };
    setNewTemplateForm(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
  };

  const handleRemoveDocumentFromTemplate = (index) => {
    setNewTemplateForm(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTemplateDocument = (index, field, value) => {
    setNewTemplateForm(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) =>
        i === index ? { ...doc, [field]: value } : doc
      )
    }));
  };

  // Combinar plantillas predefinidas y personalizadas
  const allTemplates = [...documentTemplates, ...customTemplates];

  const handleAddDocumentItem = () => {
    const newItem = {
      id: Date.now(),
      documentId: '',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días por defecto
      status: 'pendiente',
      priority: 'normal',
      notes: '',
      // Campos editables de renovación
      hasCustomRenewal: false,
      customRenewalPeriod: 12,
      customRenewalUnit: 'months'
    };
    setDocumentItems([...documentItems, newItem]);
    // Si había una plantilla aplicada y ahora se añaden documentos manualmente, limpiar la selección
    if (selectedTemplate && documentItems.length > 0) {
      setSelectedTemplate(null);
    }
  };

  const handleUpdateDocumentItem = (id, field, value) => {
    setDocumentItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Si se cambió el documento seleccionado, inicializar configuración de renovación
          if (field === 'documentId' && value) {
            const selectedDocument = allAvailableDocuments.find(d => d.id === parseInt(value));
            if (selectedDocument) {
              // Inicializar con la configuración por defecto del documento
              updatedItem.hasCustomRenewal = selectedDocument.hasExpiration;
              updatedItem.customRenewalPeriod = selectedDocument.renewalPeriod || 12;
              updatedItem.customRenewalUnit = selectedDocument.renewalUnit || 'months';
            }
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleRemoveDocumentItem = (id) => {
    setDocumentItems(items => items.filter(item => item.id !== id));
  };

  const handleFileUpload = async (documentAssignmentId, file) => {
    if (!file) return;

    try {
      setLoading(true);

      // Simular subida de archivo
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', selectedEmployeeForDocuments.id);
      formData.append('documentAssignmentId', documentAssignmentId);

      // Aquí iría la llamada real a la API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Actualizar estado del documento asignado
      setAssignedDocuments(docs =>
        docs.map(doc =>
          doc.id === documentAssignmentId
            ? { ...doc, uploadedFile: file.name, uploadStatus: 'subido', uploadDate: new Date() }
            : doc
        )
      );

      toast.success(`Documento ${file.name} subido exitosamente`);
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir el documento');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocumentAssignment = async () => {
    if (!selectedEmployeeForDocuments || documentItems.length === 0) {
      toast.error('Debe agregar al menos un documento requerido');
      return;
    }

    // Validar que todos los items tengan documento seleccionado
    const invalidItems = documentItems.filter(item => !item.documentId);
    if (invalidItems.length > 0) {
      toast.error('Todos los elementos deben tener un documento seleccionado');
      return;
    }

    try {
      setLoading(true);

      // Aquí iría la llamada a la API para guardar la asignación
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Documentos requeridos asignados exitosamente a ${selectedEmployeeForDocuments.first_name} ${selectedEmployeeForDocuments.last_name}`);
      setShowDocumentsModal(false);
      setDocumentItems([]);
      setSelectedEmployeeForDocuments(null);
    } catch (error) {
      console.error('Error asignando documentos:', error);
      toast.error('Error al asignar documentos requeridos');
    } finally {
      setLoading(false);
    }
  };

  // Funciones para crear nuevos tipos de documentos
  const handleOpenNewDocumentModal = () => {
    setNewDocumentForm({
      name: '',
      category: '',
      description: '',
      required: false,
      customCategory: '',
      hasExpiration: false,
      renewalPeriod: 12,
      renewalUnit: 'months',
      defaultDueDays: 7
    });
    setShowNewDocumentModal(true);
  };

  const handleSaveNewDocument = async () => {
    // Validaciones
    if (!newDocumentForm.name.trim()) {
      toast.error('El nombre del documento es obligatorio');
      return;
    }

    if (!newDocumentForm.category && !newDocumentForm.customCategory.trim()) {
      toast.error('Debe seleccionar una categoría o crear una nueva');
      return;
    }

    if (!newDocumentForm.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    try {
      setLoading(true);

      // Determinar la categoría final
      const finalCategory = newDocumentForm.customCategory.trim() || newDocumentForm.category;

      // Crear el nuevo documento
      const newDocument = {
        id: Date.now(), // En producción sería generado por el backend
        name: newDocumentForm.name.trim(),
        category: finalCategory,
        description: newDocumentForm.description.trim(),
        required: newDocumentForm.required,
        hasExpiration: newDocumentForm.hasExpiration,
        renewalPeriod: newDocumentForm.hasExpiration ? newDocumentForm.renewalPeriod : null,
        renewalUnit: newDocumentForm.hasExpiration ? newDocumentForm.renewalUnit : null,
        defaultDueDays: newDocumentForm.defaultDueDays,
        isCustom: true // Marcador para documentos creados por el usuario
      };

      // Agregar a la lista de documentos personalizados
      setCustomDocuments(prev => [...prev, newDocument]);

      // Simular guardado en API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Nuevo tipo de documento "${newDocument.name}" creado exitosamente`);
      setShowNewDocumentModal(false);

      // Resetear formulario
      setNewDocumentForm({
        name: '',
        category: '',
        description: '',
        required: false,
        customCategory: '',
        hasExpiration: false,
        renewalPeriod: 12,
        renewalUnit: 'months',
        defaultDueDays: 7
      });

    } catch (error) {
      console.error('Error creando nuevo documento:', error);
      toast.error('Error al crear el nuevo tipo de documento');
    } finally {
      setLoading(false);
    }
  };

  // Combinar documentos predefinidos con documentos personalizados
  const allAvailableDocuments = [...availableDocuments, ...customDocuments];

  // Funciones para manejo de vencimientos
  const calculateExpirationDate = (uploadDate, document) => {
    if (!document.hasExpiration || !uploadDate) return null;

    const date = new Date(uploadDate);
    const { renewalPeriod, renewalUnit } = document;

    switch (renewalUnit) {
      case 'days':
        date.setDate(date.getDate() + renewalPeriod);
        break;
      case 'weeks':
        date.setDate(date.getDate() + (renewalPeriod * 7));
        break;
      case 'months':
        date.setMonth(date.getMonth() + renewalPeriod);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + renewalPeriod);
        break;
      default:
        return null;
    }

    return date;
  };

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return null;

    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return { status: 'expired', message: `Vencido hace ${Math.abs(daysDiff)} días`, color: 'red' };
    } else if (daysDiff <= 30) {
      return { status: 'expiring', message: `Vence en ${daysDiff} días`, color: 'orange' };
    } else {
      return { status: 'valid', message: `Válido por ${daysDiff} días más`, color: 'green' };
    }
  };

  const formatRenewalPeriod = (document) => {
    if (!document.hasExpiration) return null;

    const { renewalPeriod, renewalUnit } = document;
    const unitText = renewalUnit === 'days' ? 'días' :
                    renewalUnit === 'weeks' ? 'semanas' :
                    renewalUnit === 'months' ? 'meses' : 'años';

    return `${renewalPeriod} ${unitText}`;
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
      {
        id: 1,
        name: 'Contrato de Trabajo',
        status: 'Completo',
        uploadDate: '2024-01-15',
        type: 'PDF',
        approvalStatus: 'aprobado',
        comments: [{ user: 'Admin', text: 'Documento correcto' }]
      },
      {
        id: 2,
        name: 'DPI Escaneado',
        status: 'Completo',
        uploadDate: '2024-01-15',
        type: 'PDF',
        approvalStatus: 'pendiente',
        comments: []
      },
      {
        id: 3,
        name: 'Certificado Médico',
        status: 'Completo',
        uploadDate: '2024-01-20',
        type: 'PDF',
        approvalStatus: 'pendiente',
        comments: [{ user: 'RH', text: 'Revisar fecha de vencimiento' }]
      },
      {
        id: 4,
        name: 'Título Universitario',
        status: 'Pendiente',
        uploadDate: null,
        type: 'PDF',
        approvalStatus: 'pendiente',
        comments: []
      },
      {
        id: 5,
        name: 'Antecedentes Penales',
        status: 'Vencido',
        uploadDate: '2023-12-01',
        type: 'PDF',
        approvalStatus: 'rechazado',
        comments: [{ user: 'Admin', text: 'Documento vencido, favor actualizar' }]
      }
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
            {/* Informacion Personal */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Informacion Personal
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

            {/* Informacion Laboral */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Informacion Laboral
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
        <div className="space-y-5">
          {/* Header con filtros sticky */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Documentos del Empleado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión y revisión de documentación oficial</p>
              </div>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-[#1e40af] hover:bg-[#1e3a8a] text-white shadow-md hover:shadow-lg transition-all"
                aria-label="Subir nuevo documento"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
                aria-label="Filtrar todos los documentos"
              >
                Todos ({documents.length})
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-700"
                aria-label="Filtrar documentos pendientes"
              >
                Pendiente ({documents.filter(d => d.approvalStatus === 'pendiente').length})
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-700"
                aria-label="Filtrar documentos aprobados"
              >
                Aprobado ({documents.filter(d => d.approvalStatus === 'aprobado').length})
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-700"
                aria-label="Filtrar documentos rechazados"
              >
                Rechazado ({documents.filter(d => d.approvalStatus === 'rechazado').length})
              </button>
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group relative border-l-4 border-gray-200 dark:border-gray-700 rounded-r-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-l-[#1e40af] overflow-hidden"
                style={{
                  borderLeftColor: doc.approvalStatus === 'aprobado' ? '#10b981' :
                                  doc.approvalStatus === 'rechazado' ? '#ef4444' : '#eab308'
                }}
              >
                <div className="p-5">
                  {/* Header del documento */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icono del tipo de documento */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e40af] to-[#3b82f6] flex items-center justify-center shadow-md">
                        <FileText className="h-6 w-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1 truncate group-hover:text-[#1e40af] transition-colors">
                          {doc.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {doc.uploadDate ? formatDate(doc.uploadDate) : 'No subido'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {doc.uploadedBy || 'Sistema'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de estado con mejor diseño */}
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm ${
                          doc.approvalStatus === 'aprobado'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-2 border-green-300 dark:border-green-700' :
                          doc.approvalStatus === 'rechazado'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-2 border-red-300 dark:border-red-700' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-2 border-yellow-300 dark:border-yellow-700'
                        }`}
                        aria-label={`Estado: ${doc.approvalStatus}`}
                      >
                        {doc.approvalStatus === 'aprobado' && <CheckCircle className="h-3.5 w-3.5" />}
                        {doc.approvalStatus === 'rechazado' && <XCircle className="h-3.5 w-3.5" />}
                        {doc.approvalStatus === 'pendiente' && <Clock className="h-3.5 w-3.5" />}
                        <span className="capitalize">{doc.approvalStatus}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Acciones principales - Diseño mejorado */}
                  {doc.uploadDate && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {/* Ver documento */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 text-xs font-medium hover:bg-[#1e40af] hover:text-white hover:border-[#1e40af] transition-all"
                        aria-label={`Ver documento ${doc.name}`}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver documento
                      </Button>

                      {/* Aprobar/Rechazar solo si está pendiente */}
                      {doc.approvalStatus === 'pendiente' && (
                        <div className="flex gap-2 ml-auto">
                          <Button
                            size="sm"
                            className="h-9 px-4 text-xs font-medium bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all"
                            onClick={() => {/* Aprobar */}}
                            aria-label={`Aprobar documento ${doc.name}`}
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-9 px-4 text-xs font-medium shadow-sm hover:shadow-md transition-all"
                            onClick={() => {/* Rechazar */}}
                            aria-label={`Rechazar documento ${doc.name}`}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Rechazar
                          </Button>
                        </div>
                      )}

                      {/* Botón comentar */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 px-4 text-xs font-medium transition-all ${
                          doc.approvalStatus !== 'pendiente' ? 'ml-auto' : ''
                        }`}
                        onClick={() => {/* Agregar comentario */}}
                        aria-label={`Agregar comentario a ${doc.name}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Comentar
                      </Button>
                    </div>
                  )}

                  {/* Sección de comentarios mejorada */}
                  {doc.comments && doc.comments.length > 0 && (
                    <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Comentarios ({doc.comments.length})
                      </div>
                      <div className="space-y-2">
                        {doc.comments.slice(-2).map((comment, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-white/60 dark:bg-gray-800/40 p-2 rounded border border-blue-100 dark:border-blue-900"
                          >
                            <span className="font-semibold text-blue-800 dark:text-blue-300">{comment.user}:</span>{' '}
                            <span className="text-gray-700 dark:text-gray-300">{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Indicador visual de hover */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e40af] to-[#3b82f6] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
            ))}
          </div>

          {/* Footer con información adicional */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Total de documentos: <span className="font-semibold">{documents.length}</span> |
              Pendientes de revisión: <span className="font-semibold text-yellow-600">{documents.filter(d => d.approvalStatus === 'pendiente').length}</span>
            </p>
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
              Informacion detallada, documentos y actividad del empleado
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
                  {getTemplateIcon('refresh', 'h-4 w-4 inline mr-1')}
                  Test Tiempo Real
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
                            {/* Botón de configuración/documentos requeridos */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleOpenDocumentsModal(employee, e)}
                              className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                              title="Asignar documentos requeridos"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
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

                {/* Informacion Personal */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Informacion Personal</h3>
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
              <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                {getTemplateIcon('briefcase', 'h-6 w-6')}
                Reporte de Empleados
              </h2>
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

      {/* Modal de Asignación de Documentos Requeridos */}
      {showDocumentsModal && selectedEmployeeForDocuments && (
        <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Asignar Documentos Requeridos a {selectedEmployeeForDocuments.first_name} {selectedEmployeeForDocuments.last_name}
              </DialogTitle>
              <DialogDescription>
                Gestiona los documentos requeridos para el empleado. Puedes ver los documentos ya asignados, agregar nuevos requisitos y gestionar la subida de archivos.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Informacion del Empleado */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">Empleado:</span>
                    <div className="text-gray-900 dark:text-white">
                      {selectedEmployeeForDocuments.first_name} {selectedEmployeeForDocuments.last_name}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">Departamento:</span>
                    <div className="text-gray-900 dark:text-white">{selectedEmployeeForDocuments.department}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">ID:</span>
                    <div className="text-gray-900 dark:text-white font-mono">{selectedEmployeeForDocuments.employee_id}</div>
                  </div>
                </div>
              </div>

              {/* Documentos ya Asignados */}
              {assignedDocuments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Documentos Actualmente Asignados
                  </h3>
                  <div className="space-y-3">
                    {assignedDocuments.map((assignment) => {
                      const document = allAvailableDocuments.find(d => d.id === assignment.documentId);
                      const isOverdue = new Date(assignment.dueDate) < new Date();
                      const daysLeft = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));

                      // Calcular fecha de vencimiento del documento si está subido
                      const expirationDate = assignment.uploadDate ? calculateExpirationDate(assignment.uploadDate, document) : null;
                      const expirationStatus = getExpirationStatus(expirationDate);

                      return (
                        <div key={assignment.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {document?.name || 'Documento no encontrado'}
                                </div>
                                {document?.required && (
                                  <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
                                )}
                                {document?.hasExpiration && (
                                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                    Renovacion: {formatRenewalPeriod(document)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {document?.description}
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-4 text-gray-500">
                                  <span>Asignado: {assignment.assignedDate.toLocaleDateString('es-GT')}</span>
                                  <span className={isOverdue ? 'text-red-600 font-medium' : daysLeft <= 7 ? 'text-orange-600 font-medium' : ''}>
                                    Vence: {new Date(assignment.dueDate).toLocaleDateString('es-GT')}
                                    {!isOverdue && ` (${daysLeft} días)`}
                                  </span>
                                </div>
                                {/* Informacion de vencimiento del documento */}
                                {expirationDate && expirationStatus && (
                                  <div className={`flex items-center gap-1 font-medium ${
                                    expirationStatus.color === 'red' ? 'text-red-600' :
                                    expirationStatus.color === 'orange' ? 'text-orange-600' : 'text-green-600'
                                  }`}>
                                    <span className="flex items-center gap-1">
                                      {getTemplateIcon('document', 'h-3 w-3')}
                                      Documento: {expirationStatus.message}
                                    </span>
                                    <span className="text-gray-500 font-normal">
                                      (Vence: {expirationDate.toLocaleDateString('es-GT')})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={assignment.uploadStatus === 'subido' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {assignment.uploadStatus === 'subido' ? 'Subido' : isOverdue ? 'Vencido' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>

                          {/* Área de subida de documentos */}
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                            {assignment.uploadStatus === 'subido' ? (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Archivo: {assignment.uploadedFile}</span>
                                <span className="text-gray-500">
                                  • Subido: {assignment.uploadDate?.toLocaleDateString('es-GT')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor={`file-upload-${assignment.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-md cursor-pointer transition-colors"
                                >
                                  <Upload className="h-4 w-4" />
                                  Subir Documento
                                </label>
                                <input
                                  id={`file-upload-${assignment.id}`}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      handleFileUpload(assignment.id, file);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <span className="text-xs text-gray-500">
                                  PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nuevos Documentos Requeridos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-blue-600" />
                    Asignar Nuevos Documentos Requeridos
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowTemplateSelector(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      {getTemplateIcon('template', 'h-4 w-4')}
                      Usar Plantilla
                    </Button>
                    <Button
                      onClick={handleAddDocumentItem}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Agregar Documento
                    </Button>
                  </div>
                </div>

                {documentItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay documentos agregados</p>
                    <p className="text-sm">Haz clic en "Agregar Documento" o "Usar Plantilla" para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Indicador de plantilla aplicada */}
                    {selectedTemplate && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getTemplateIcon(selectedTemplate.icon, 'h-5 w-5 text-purple-600')}
                          <span className="font-medium text-purple-800 dark:text-purple-200">
                            Plantilla aplicada: {selectedTemplate.name}
                          </span>
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                            {selectedTemplate.documents.length} documentos
                          </Badge>
                        </div>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                          {selectedTemplate.description}. Puedes editar individualmente cada documento si es necesario.
                        </p>
                      </div>
                    )}
                    {documentItems.map((item, index) => {
                      const selectedDoc = allAvailableDocuments.find(d => d.id === parseInt(item.documentId));
                      const isDocumentSelected = !!item.documentId;

                      return (
                        <div key={item.id} className="relative p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Header del documento con indicador de estado */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isDocumentSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {selectedDoc ? selectedDoc.name : 'Documento sin configurar'}
                              </h4>
                              {selectedDoc && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {selectedDoc.category} • {selectedDoc.required ? 'Obligatorio' : 'Opcional'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDocumentSelected && (
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.priority === 'urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                item.priority === 'alta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                Prioridad {item.priority}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDocumentItem(item.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* Configuracion principal en grid responsivo */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Seleccionar Documento
                            </Label>
                            <select
                              value={item.documentId}
                              onChange={(e) => {
                                if (e.target.value === 'create_new') {
                                  handleOpenNewDocumentModal();
                                } else if (e.target.value === 'create_template') {
                                  setShowCreateTemplateModal(true);
                                } else if (e.target.value === 'save_as_template') {
                                  if (documentItems.length > 0) {
                                    handleCreateTemplateFromCurrent();
                                  }
                                } else if (e.target.value.startsWith('template-')) {
                                  // Selección de plantilla
                                  const templateId = parseInt(e.target.value.replace('template-', ''));
                                  const template = allTemplates.find(t => t.id === templateId);
                                  if (template) {
                                    handleApplyTemplate(template);
                                  }
                                } else {
                                  handleUpdateDocumentItem(item.id, 'documentId', e.target.value);
                                }
                                // Resetear el selector después de las acciones
                                if (['create_new', 'create_template', 'save_as_template'].includes(e.target.value)) {
                                  e.target.value = '';
                                }
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500"
                            >
                                <option value="">Seleccionar documento...</option>

                                {/* Plantillas de documentos */}
                                <optgroup label="PLANTILLAS POR CARGO">
                                  {allTemplates.map((template) => (
                                    <option key={`template-${template.id}`} value={`template-${template.id}`}>
                                      {template.isCustom ? '[Personalizada] ' : ''}Plantilla: {template.name} ({template.documents.length} documentos)
                                    </option>
                                  ))}
                                </optgroup>

                                {/* Documentos predefinidos */}
                                <optgroup label="DOCUMENTOS INDIVIDUALES">
                                  {availableDocuments.map((document) => (
                                    <option key={document.id} value={document.id}>
                                      {document.name} {document.required ? '(Obligatorio)' : '(Opcional)'}
                                    </option>
                                  ))}
                                </optgroup>

                                {/* Documentos personalizados */}
                                {customDocuments.length > 0 && (
                                  <optgroup label="DOCUMENTOS PERSONALIZADOS">
                                    {customDocuments.map((document) => (
                                      <option key={document.id} value={document.id}>
                                        {document.name} {document.required ? '(Obligatorio)' : '(Opcional)'} [Personalizado]
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {/* Opciones de creación */}
                                <optgroup label="ACCIONES">
                                  <option value="create_new">+ Crear nuevo tipo de documento...</option>
                                  <option value="create_template">+ Crear mi plantilla personalizada...</option>
                                </optgroup>
                              </select>
                            </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nivel de Prioridad
                            </Label>
                            <div className="space-y-2">
                              {['normal', 'alta', 'urgente'].map((priority) => (
                                <label key={priority} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm">
                                  <input
                                    type="radio"
                                    name={`priority-${item.id}`}
                                    value={priority}
                                    checked={item.priority === priority}
                                    onChange={(e) => handleUpdateDocumentItem(item.id, 'priority', e.target.value)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                  />
                                  <span className={`text-sm font-medium flex-1 ${
                                    priority === 'urgente' ? 'text-red-600 dark:text-red-400' :
                                    priority === 'alta' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                  </span>
                                  {item.priority === priority && (
                                    <div className={`w-2 h-2 rounded-full ${
                                      priority === 'urgente' ? 'bg-red-500' :
                                      priority === 'alta' ? 'bg-orange-500' : 'bg-green-500'
                                    }`}></div>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Informacion adicional del documento seleccionado */}
                        {selectedDoc && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-sm">
                              {getTemplateIcon('lightbulb', 'h-4 w-4')}
                              <strong>Informacion del documento:</strong>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              {selectedDoc.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
                              <span>Categoría: <strong>{selectedDoc.category}</strong></span>
                              <span>Tipo: <strong>{selectedDoc.required ? 'Obligatorio' : 'Opcional'}</strong></span>
                              {selectedDoc.hasExpiration && (
                                <span>Renovacion: <strong>Cada {selectedDoc.renewalPeriod} {
                                  selectedDoc.renewalUnit === 'days' ? 'días' :
                                  selectedDoc.renewalUnit === 'weeks' ? 'semanas' :
                                  selectedDoc.renewalUnit === 'months' ? 'meses' : 'años'
                                }</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Configuracion de fechas y notas */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fecha de Asignación
                              </Label>
                              <input
                                type="date"
                                value={item.assignedDate}
                                onChange={(e) => handleUpdateDocumentItem(item.id, 'assignedDate', e.target.value)}
                                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fecha Límite
                              </Label>
                              <input
                                type="date"
                                value={item.dueDate}
                                onChange={(e) => handleUpdateDocumentItem(item.id, 'dueDate', e.target.value)}
                                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Notas adicionales (opcional)
                            </Label>
                            <Input
                              placeholder="Instrucciones específicas o comentarios..."
                              value={item.notes}
                              onChange={(e) => handleUpdateDocumentItem(item.id, 'notes', e.target.value)}
                              className="mt-1 !h-auto px-4 py-3 border-2 border-gray-200 dark:border-gray-600 !bg-white dark:!bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm"
                            />
                          </div>
                        </div>

                        {/* Tercera sección: Configuracion de renovación */}
                        {item.documentId && (() => {
                        const selectedDoc = allAvailableDocuments.find(d => d.id === parseInt(item.documentId));
                        if (selectedDoc?.hasExpiration) {
                          return (
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                              <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                                {getTemplateIcon('refresh', 'h-4 w-4')}
                                Configuracion de Renovacion para este Empleado
                              </h4>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`renewal-${item.id}`}
                                    checked={item.hasCustomRenewal}
                                    onChange={(e) => handleUpdateDocumentItem(item.id, 'hasCustomRenewal', e.target.checked)}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`renewal-${item.id}`} className="text-sm">
                                    Este documento requiere renovación periódica para este empleado
                                  </Label>
                                </div>

                                {item.hasCustomRenewal && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                                    <div>
                                      <Label className="text-sm font-medium">Período de Renovacion</Label>
                                      <div className="flex gap-2 mt-1">
                                        <Input
                                          type="number"
                                          min="1"
                                          max="120"
                                          value={item.customRenewalPeriod}
                                          onChange={(e) => handleUpdateDocumentItem(item.id, 'customRenewalPeriod', parseInt(e.target.value) || 1)}
                                          className="flex-1"
                                        />
                                        <select
                                          value={item.customRenewalUnit}
                                          onChange={(e) => handleUpdateDocumentItem(item.id, 'customRenewalUnit', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="days">Días</option>
                                          <option value="weeks">Semanas</option>
                                          <option value="months">Meses</option>
                                          <option value="years">Años</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex items-end">
                                      <div className="text-sm text-orange-700 dark:text-orange-300 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                                        <strong>Renovacion personalizada:</strong> Cada {item.customRenewalPeriod} {
                                          item.customRenewalUnit === 'days' ? 'días' :
                                          item.customRenewalUnit === 'weeks' ? 'semanas' :
                                          item.customRenewalUnit === 'months' ? 'meses' : 'años'
                                        }
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="text-xs text-orange-600 dark:text-orange-400 flex items-start gap-1">
                                  {getTemplateIcon('lightbulb', 'h-3 w-3 mt-0.5 flex-shrink-0')}
                                  <span><strong>Por defecto:</strong> {selectedDoc.name} se renueva cada {selectedDoc.renewalPeriod} {
                                    selectedDoc.renewalUnit === 'days' ? 'días' :
                                    selectedDoc.renewalUnit === 'weeks' ? 'semanas' :
                                    selectedDoc.renewalUnit === 'months' ? 'meses' : 'años'
                                  }. Puedes personalizar el período para este empleado específico.</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDocumentsModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveDocumentAssignment}
                disabled={loading || documentItems.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Guardando...' : 'Asignar Documentos'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal para Crear Nuevo Tipo de Documento */}
      {showNewDocumentModal && (
        <Dialog open={showNewDocumentModal} onOpenChange={setShowNewDocumentModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Crear Nuevo Tipo de Documento
              </DialogTitle>
              <DialogDescription>
                Define un nuevo tipo de documento que podrás asignar a los empleados. Esta información se guardará en el sistema para uso futuro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Nombre del documento */}
              <div>
                <Label htmlFor="document-name" className="text-sm font-medium">
                  Nombre del Documento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document-name"
                  placeholder="Ej: Certificado de Vacunación COVID-19"
                  value={newDocumentForm.name}
                  onChange={(e) => setNewDocumentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="document-category" className="text-sm font-medium">
                    Categoría <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="document-category"
                    value={newDocumentForm.category}
                    onChange={(e) => {
                      setNewDocumentForm(prev => ({
                        ...prev,
                        category: e.target.value,
                        customCategory: e.target.value === 'custom' ? prev.customCategory : ''
                      }));
                    }}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar categoría...</option>
                    <option value="Personal">Personal</option>
                    <option value="Identificación">Identificación</option>
                    <option value="Legal">Legal</option>
                    <option value="Académico">Académico</option>
                    <option value="Salud">Salud</option>
                    <option value="Laboral">Laboral</option>
                    <option value="custom">+ Crear nueva categoría</option>
                  </select>
                </div>

                {/* Categoría personalizada */}
                {newDocumentForm.category === 'custom' && (
                  <div>
                    <Label htmlFor="custom-category" className="text-sm font-medium">
                      Nueva Categoría <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="custom-category"
                      placeholder="Ej: Administrativo"
                      value={newDocumentForm.customCategory}
                      onChange={(e) => setNewDocumentForm(prev => ({ ...prev, customCategory: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Tipo obligatorio/opcional */}
                <div className={newDocumentForm.category !== 'custom' ? 'md:col-span-1' : ''}>
                  <Label className="text-sm font-medium">Tipo de Documento</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="required"
                        checked={newDocumentForm.required === true}
                        onChange={() => setNewDocumentForm(prev => ({ ...prev, required: true }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Obligatorio</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="required"
                        checked={newDocumentForm.required === false}
                        onChange={() => setNewDocumentForm(prev => ({ ...prev, required: false }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Opcional</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label htmlFor="document-description" className="text-sm font-medium">
                  Descripción <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="document-description"
                  placeholder="Describe qué tipo de documento es y cuál es su propósito..."
                  value={newDocumentForm.description}
                  onChange={(e) => setNewDocumentForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Fecha límite por defecto */}
              <div>
                <Label htmlFor="default-due-days" className="text-sm font-medium">
                  Fecha Límite por Defecto
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="default-due-days"
                    type="number"
                    min="1"
                    max="365"
                    value={newDocumentForm.defaultDueDays}
                    onChange={(e) => setNewDocumentForm(prev => ({
                      ...prev,
                      defaultDueDays: parseInt(e.target.value) || 1
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    días desde la asignación
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Cuando se asigne este documento, la fecha límite se establecerá automáticamente a {newDocumentForm.defaultDueDays} días desde hoy. Esta fecha será editable.
                </p>
              </div>

              {/* Configuracion de Vencimiento */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Configuracion de Vencimiento y Renovacion
                </h4>

                {/* ¿Tiene vencimiento? */}
                <div className="mb-4">
                  <Label className="text-sm font-medium">¿Este documento tiene vencimiento?</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasExpiration"
                        checked={newDocumentForm.hasExpiration === false}
                        onChange={() => setNewDocumentForm(prev => ({ ...prev, hasExpiration: false }))}
                        className="mr-2"
                      />
                      <span className="text-sm">No, es un documento permanente</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasExpiration"
                        checked={newDocumentForm.hasExpiration === true}
                        onChange={() => setNewDocumentForm(prev => ({ ...prev, hasExpiration: true }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Sí, requiere renovación periódica</span>
                    </label>
                  </div>
                </div>

                {/* Configuracion de renovación */}
                {newDocumentForm.hasExpiration && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <Label className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3 block">
                      Configuracion de Renovacion Automática
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="renewal-period" className="text-sm font-medium">
                          Período de Renovacion
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="renewal-period"
                            type="number"
                            min="1"
                            max="120"
                            value={newDocumentForm.renewalPeriod}
                            onChange={(e) => setNewDocumentForm(prev => ({
                              ...prev,
                              renewalPeriod: parseInt(e.target.value) || 1
                            }))}
                            className="flex-1"
                          />
                          <select
                            value={newDocumentForm.renewalUnit}
                            onChange={(e) => setNewDocumentForm(prev => ({ ...prev, renewalUnit: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="days">Días</option>
                            <option value="weeks">Semanas</option>
                            <option value="months">Meses</option>
                            <option value="years">Años</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-orange-700 dark:text-orange-300 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <strong>Renovacion automática:</strong> Cada {newDocumentForm.renewalPeriod} {
                            newDocumentForm.renewalUnit === 'days' ? 'días' :
                            newDocumentForm.renewalUnit === 'weeks' ? 'semanas' :
                            newDocumentForm.renewalUnit === 'months' ? 'meses' : 'años'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                      <span className="flex items-start gap-2">
                        {getTemplateIcon('lightbulb', 'h-4 w-4 mt-0.5 flex-shrink-0')}
                        <span>El sistema enviará alertas 30 días antes del vencimiento y creará automáticamente nuevas solicitudes de renovación.</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Vista previa */}
              {newDocumentForm.name && newDocumentForm.description && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Vista Previa:</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Nombre:</strong> {newDocumentForm.name}
                      {newDocumentForm.required ? (
                        <Badge variant="destructive" className="ml-2 text-xs">Obligatorio</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2 text-xs">Opcional</Badge>
                      )}
                      {newDocumentForm.hasExpiration && (
                        <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-800 border-orange-300">
                          Renovacion Automática
                        </Badge>
                      )}
                    </div>
                    <div>
                      <strong>Categoría:</strong> {newDocumentForm.customCategory || newDocumentForm.category}
                    </div>
                    <div>
                      <strong>Descripción:</strong> {newDocumentForm.description}
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-blue-800 dark:text-blue-200">
                      <strong>Fecha límite:</strong> {newDocumentForm.defaultDueDays} días después de la asignación (editable)
                    </div>
                    {newDocumentForm.hasExpiration && (
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded text-orange-800 dark:text-orange-200">
                        <strong>Vencimiento:</strong> Se renueva automáticamente cada {newDocumentForm.renewalPeriod} {
                          newDocumentForm.renewalUnit === 'days' ? 'días' :
                          newDocumentForm.renewalUnit === 'weeks' ? 'semanas' :
                          newDocumentForm.renewalUnit === 'months' ? 'meses' : 'años'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowNewDocumentModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNewDocument}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creando...' : 'Crear Documento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Selector de Plantillas */}
      {showTemplateSelector && (
        <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTemplateIcon('template', 'h-5 w-5 text-purple-600')}
                Seleccionar Plantilla de Documentos
              </DialogTitle>
              <DialogDescription>
                Selecciona una plantilla predefinida para aplicar automáticamente un conjunto de documentos requeridos según el cargo o función del empleado.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[60vh]">
              {/* Botón para crear plantilla personalizada */}
              <div className="mb-6 p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    {getTemplateIcon('template', 'h-8 w-8 text-purple-600')}
                  </div>
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    ¿No encuentras la plantilla que necesitas?
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                    Crea tu propia plantilla personalizada con los documentos específicos que requieres
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setShowCreateTemplateModal(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-100"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Crear Mi Plantilla
                    </Button>
                    {documentItems.length > 0 && (
                      <Button
                        onClick={handleCreateTemplateFromCurrent}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Save className="h-4 w-4" />
                        Guardar Como Plantilla
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Plantillas disponibles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800 hover:border-purple-300"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        {getTemplateIcon(template.icon, 'h-6 w-6 text-purple-600')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.isCustom && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
                              Personalizada
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {template.documents.length} documentos
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Documentos incluidos:
                          </p>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {template.documents.slice(0, 4).map((templateDoc) => {
                              const doc = allAvailableDocuments.find(d => d.id === templateDoc.documentId);
                              return (
                                <div key={templateDoc.documentId} className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    templateDoc.priority === 'urgente' ? 'bg-red-500' :
                                    templateDoc.priority === 'alta' ? 'bg-orange-500' : 'bg-green-500'
                                  }`}></div>
                                  <span className="truncate">{doc?.name || 'Documento no encontrado'}</span>
                                </div>
                              );
                            })}
                            {template.documents.length > 4 && (
                              <div className="text-xs text-gray-500 italic">
                                ... y {template.documents.length - 4} más
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowTemplateSelector(false)}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Crear Plantilla Personalizada */}
      {showCreateTemplateModal && (
        <Dialog open={showCreateTemplateModal} onOpenChange={setShowCreateTemplateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTemplateIcon('template', 'h-5 w-5 text-purple-600')}
                Crear Plantilla Personalizada
              </DialogTitle>
              <DialogDescription>
                Crea tu propia plantilla de documentos para reutilizar en futuros empleados con roles similares.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[70vh] space-y-6">
              {/* Informacion básica de la plantilla */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name" className="text-sm font-medium">
                    Nombre de la Plantilla
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="ej. Técnico en Sistemas"
                    value={newTemplateForm.name}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category" className="text-sm font-medium">
                    Categoría
                  </Label>
                  <Input
                    id="template-category"
                    placeholder="ej. Tecnología"
                    value={newTemplateForm.category}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="template-description" className="text-sm font-medium">
                  Descripción
                </Label>
                <Input
                  id="template-description"
                  placeholder="Describe para qué tipo de empleado es esta plantilla..."
                  value={newTemplateForm.description}
                  onChange={(e) => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Icono</Label>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {['template', 'briefcase', 'calculator', 'graduationCap', 'stethoscope', 'cross'].map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewTemplateForm(prev => ({ ...prev, icon: iconName }))}
                      className={`p-2 rounded border-2 transition-all ${
                        newTemplateForm.icon === iconName
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {getTemplateIcon(iconName, 'h-5 w-5 text-purple-600')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documentos de la plantilla */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">Documentos de la Plantilla</Label>
                  <Button
                    onClick={handleAddDocumentToTemplate}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Agregar Documento
                  </Button>
                </div>

                {newTemplateForm.documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay documentos en la plantilla</p>
                    <p className="text-sm">Haz clic en "Agregar Documento" para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newTemplateForm.documents.map((templateDoc, index) => {
                      const selectedDoc = allAvailableDocuments.find(d => d.id === templateDoc.documentId);
                      const isDocumentSelected = !!templateDoc.documentId;

                      return (
                        <div key={index} className="relative p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Header del documento con indicador de estado */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isDocumentSelected ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {selectedDoc ? selectedDoc.name : 'Documento sin configurar'}
                              </h4>
                              {selectedDoc && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {selectedDoc.category} • {selectedDoc.required ? 'Obligatorio' : 'Opcional'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDocumentSelected && (
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                templateDoc.priority === 'urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                templateDoc.priority === 'alta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                Prioridad {templateDoc.priority}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDocumentFromTemplate(index)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Configuracion principal en grid responsivo */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Seleccionar Documento
                            </Label>
                            <select
                              value={templateDoc.documentId || ''}
                              onChange={(e) => {
                                if (e.target.value === 'create_new') {
                                  handleOpenNewDocumentModal();
                                } else if (e.target.value.startsWith('template-')) {
                                  // Selección de plantilla existente para aplicar a este documento
                                  const templateId = parseInt(e.target.value.replace('template-', ''));
                                  const template = allTemplates.find(t => t.id === templateId);
                                  if (template && template.documents.length > 0) {
                                    // Tomar el primer documento de la plantilla como referencia
                                    const firstDoc = template.documents[0];
                                    handleUpdateTemplateDocument(index, 'documentId', firstDoc.documentId);
                                    handleUpdateTemplateDocument(index, 'priority', firstDoc.priority);
                                    if (firstDoc.hasCustomRenewal) {
                                      handleUpdateTemplateDocument(index, 'hasCustomRenewal', true);
                                      handleUpdateTemplateDocument(index, 'customRenewalPeriod', firstDoc.customRenewalPeriod);
                                      handleUpdateTemplateDocument(index, 'customRenewalUnit', firstDoc.customRenewalUnit);
                                    }
                                  }
                                } else {
                                  handleUpdateTemplateDocument(index, 'documentId', parseInt(e.target.value));
                                }
                                // Resetear el selector después de las acciones
                                if (['create_new'].includes(e.target.value) || e.target.value.startsWith('template-')) {
                                  setTimeout(() => {
                                    e.target.value = templateDoc.documentId || '';
                                  }, 100);
                                }
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500"
                            >
                              <option value="">Seleccionar documento...</option>

                              {/* Plantillas existentes para referencia */}
                              {allTemplates.length > 0 && (
                                <optgroup label="PLANTILLAS COMO REFERENCIA">
                                  {allTemplates.map((template) => (
                                    <option key={`template-${template.id}`} value={`template-${template.id}`}>
                                      {template.isCustom ? '[Personalizada] ' : ''}Usar config. de: {template.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {/* Documentos predefinidos */}
                              <optgroup label="DOCUMENTOS INDIVIDUALES">
                                {availableDocuments.map((document) => (
                                  <option key={document.id} value={document.id}>
                                    {document.name} {document.required ? '(Obligatorio)' : '(Opcional)'}
                                  </option>
                                ))}
                              </optgroup>

                              {/* Documentos personalizados */}
                              {customDocuments.length > 0 && (
                                <optgroup label="DOCUMENTOS PERSONALIZADOS">
                                  {customDocuments.map((document) => (
                                    <option key={document.id} value={document.id}>
                                      {document.name} {document.required ? '(Obligatorio)' : '(Opcional)'} [Personalizado]
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {/* Opciones de creación */}
                              <optgroup label="ACCIONES">
                                <option value="create_new">+ Crear nuevo tipo de documento...</option>
                              </optgroup>
                            </select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nivel de Prioridad
                            </Label>
                            <div className="space-y-2">
                              {['normal', 'alta', 'urgente'].map((priority) => (
                                <label key={priority} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm">
                                  <input
                                    type="radio"
                                    name={`priority-${index}`}
                                    value={priority}
                                    checked={templateDoc.priority === priority}
                                    onChange={(e) => handleUpdateTemplateDocument(index, 'priority', e.target.value)}
                                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 focus:ring-2"
                                  />
                                  <span className={`text-sm font-medium flex-1 ${
                                    priority === 'urgente' ? 'text-red-600 dark:text-red-400' :
                                    priority === 'alta' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                  </span>
                                  {templateDoc.priority === priority && (
                                    <div className={`w-2 h-2 rounded-full ${
                                      priority === 'urgente' ? 'bg-red-500' :
                                      priority === 'alta' ? 'bg-orange-500' : 'bg-green-500'
                                    }`}></div>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Configuracion de fechas */}
                        <div className="space-y-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fecha de Asignación
                              </Label>
                              <input
                                type="date"
                                value={templateDoc.assignedDate || ''}
                                onChange={(e) => handleUpdateTemplateDocument(index, 'assignedDate', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fecha Límite
                              </Label>
                              <input
                                type="date"
                                value={templateDoc.dueDate || ''}
                                onChange={(e) => handleUpdateTemplateDocument(index, 'dueDate', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Notas adicionales (opcional)
                            </Label>
                            <Input
                              placeholder="Instrucciones específicas o comentarios..."
                              value={templateDoc.notes || ''}
                              onChange={(e) => handleUpdateTemplateDocument(index, 'notes', e.target.value)}
                              className="!h-auto px-4 py-3 border-2 border-gray-200 dark:border-gray-600 !bg-white dark:!bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm"
                            />
                          </div>
                        </div>

                        {/* Informacion adicional del documento seleccionado */}
                        {selectedDoc && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-sm">
                              {getTemplateIcon('lightbulb', 'h-4 w-4')}
                              <strong>Informacion del documento:</strong>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              {selectedDoc.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
                              <span>Categoría: <strong>{selectedDoc.category}</strong></span>
                              <span>Tipo: <strong>{selectedDoc.required ? 'Obligatorio' : 'Opcional'}</strong></span>
                              {selectedDoc.hasExpiration && (
                                <span>Renovacion: <strong>Cada {selectedDoc.renewalPeriod} {
                                  selectedDoc.renewalUnit === 'days' ? 'días' :
                                  selectedDoc.renewalUnit === 'weeks' ? 'semanas' :
                                  selectedDoc.renewalUnit === 'months' ? 'meses' : 'años'
                                }</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Configuracion de renovación para el documento en la plantilla */}
                        {selectedDoc?.hasExpiration && (
                          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-2 mb-3">
                              {getTemplateIcon('refresh', 'h-4 w-4 text-orange-600')}
                              <h5 className="font-medium text-orange-800 dark:text-orange-200">
                                Configuracion de Renovacion
                              </h5>
                            </div>

                            <div className="space-y-3">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={templateDoc.hasCustomRenewal}
                                  onChange={(e) => handleUpdateTemplateDocument(index, 'hasCustomRenewal', e.target.checked)}
                                  className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500 focus:ring-2 mt-0.5"
                                />
                                <div>
                                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                    Personalizar período de renovación
                                  </span>
                                  <p className="text-xs text-orange-600 dark:text-orange-400">
                                    Por defecto: cada {selectedDoc.renewalPeriod} {
                                      selectedDoc.renewalUnit === 'days' ? 'días' :
                                      selectedDoc.renewalUnit === 'weeks' ? 'semanas' :
                                      selectedDoc.renewalUnit === 'months' ? 'meses' : 'años'
                                    }
                                  </p>
                                </div>
                              </label>

                              {templateDoc.hasCustomRenewal && (
                                <div className="grid grid-cols-2 gap-3 ml-7 p-3 bg-white dark:bg-orange-900/10 rounded border border-orange-200 dark:border-orange-600">
                                  <div>
                                    <Label className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                      Cada
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="120"
                                      value={templateDoc.customRenewalPeriod}
                                      onChange={(e) => handleUpdateTemplateDocument(index, 'customRenewalPeriod', parseInt(e.target.value) || 1)}
                                      className="mt-1 text-center font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                      Período
                                    </Label>
                                    <select
                                      value={templateDoc.customRenewalUnit}
                                      onChange={(e) => handleUpdateTemplateDocument(index, 'customRenewalUnit', e.target.value)}
                                      className="mt-1 w-full px-3 py-2 border border-orange-300 dark:border-orange-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                    >
                                      <option value="days">Días</option>
                                      <option value="weeks">Semanas</option>
                                      <option value="months">Meses</option>
                                      <option value="years">Años</option>
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="text-xs text-center text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                                      Renovacion: <strong>Cada {templateDoc.customRenewalPeriod} {
                                        templateDoc.customRenewalUnit === 'days' ? 'días' :
                                        templateDoc.customRenewalUnit === 'weeks' ? 'semanas' :
                                        templateDoc.customRenewalUnit === 'months' ? 'meses' : 'años'
                                      }</strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen de la plantilla */}
              {newTemplateForm.name && newTemplateForm.documents.length > 0 && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                    Vista Previa de la Plantilla
                  </h4>
                  <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                    <div><strong>Nombre:</strong> {newTemplateForm.name}</div>
                    <div><strong>Categoría:</strong> {newTemplateForm.category}</div>
                    <div><strong>Documentos:</strong> {newTemplateForm.documents.filter(d => d.documentId).length}</div>
                    {newTemplateForm.description && (
                      <div><strong>Descripción:</strong> {newTemplateForm.description}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreateTemplateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCustomTemplate}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4" />
                Crear Plantilla
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmployeeManagement;