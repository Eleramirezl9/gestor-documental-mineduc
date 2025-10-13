import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import {
  getDocumentsExpiringIn,
  getExpiredDocuments,
  getUrgencyBadge,
  formatExpirationDate
} from '../../services/renewalService';
import { RefreshCw, AlertTriangle, Clock, XCircle, User as UserIcon } from 'lucide-react';
import { employeesAPI } from '../../lib/api';

/**
 * Dashboard para monitorear documentos próximos a vencer y vencidos
 */
export default function RenewalDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para documentos por urgencia
  const [urgentDocuments, setUrgentDocuments] = useState([]);
  const [highPriorityDocuments, setHighPriorityDocuments] = useState([]);
  const [mediumPriorityDocuments, setMediumPriorityDocuments] = useState([]);
  const [expiredDocuments, setExpiredDocuments] = useState([]);

  // Map de empleados (employee_id -> employee data)
  const [employeesMap, setEmployeesMap] = useState({});

  // Resumen de totales
  const [summary, setSummary] = useState({
    urgent: 0,
    high: 0,
    medium: 0,
    expired: 0,
    total: 0
  });

  // Cargar datos
  const loadRenewalData = async () => {
    try {
      setLoading(true);

      // Cargar documentos por diferentes rangos de días y empleados
      const [expiring7, expiring15, expiring30, expired, employeesResponse] = await Promise.all([
        getDocumentsExpiringIn(7),
        getDocumentsExpiringIn(15),
        getDocumentsExpiringIn(30),
        getExpiredDocuments(),
        employeesAPI.getAll().catch(() => ({ data: { data: [] } }))
      ]);

      // Crear mapa de empleados para lookup rápido
      const employees = employeesResponse?.data?.data || [];
      const empMap = {};
      employees.forEach(emp => {
        empMap[emp.id] = emp;
      });
      setEmployeesMap(empMap);

      // Clasificar por urgencia
      const urgent = expiring7.filter(d => d.days_until_expiration <= 7);
      const high = expiring15.filter(d => d.days_until_expiration > 7 && d.days_until_expiration <= 15);
      const medium = expiring30.filter(d => d.days_until_expiration > 15 && d.days_until_expiration <= 30);

      setUrgentDocuments(urgent);
      setHighPriorityDocuments(high);
      setMediumPriorityDocuments(medium);
      setExpiredDocuments(expired);

      setSummary({
        urgent: urgent.length,
        high: high.length,
        medium: medium.length,
        expired: expired.length,
        total: urgent.length + high.length + medium.length + expired.length
      });

    } catch (error) {
      console.error('Error cargando datos de renovación:', error);
      toast.error('No se pudieron cargar los documentos próximos a vencer');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRenewalData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRenewalData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard de Renovaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo de documentos próximos a vencer y vencidos
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Urgente (&lt;7 días)</p>
              <p className="text-3xl font-bold text-red-600">{summary.urgent}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alta (7-15 días)</p>
              <p className="text-3xl font-bold text-orange-600">{summary.high}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Media (15-30 días)</p>
              <p className="text-3xl font-bold text-yellow-600">{summary.medium}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidos</p>
              <p className="text-3xl font-bold text-gray-600">{summary.expired}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-3xl font-bold text-blue-600">{summary.total}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Documentos vencidos */}
      {expiredDocuments.length > 0 && (
        <DocumentSection
          employeesMap={employeesMap}
          navigate={navigate}
          title="Documentos Vencidos"
          documents={expiredDocuments}
          isExpired={true}
          emptyMessage="No hay documentos vencidos"
        />
      )}

      {/* Documentos urgentes (< 7 días) */}
      {urgentDocuments.length > 0 && (
        <DocumentSection
          employeesMap={employeesMap}
          navigate={navigate}
          title="🔴 Urgente - Vencen en menos de 7 días"
          documents={urgentDocuments}
          emptyMessage="No hay documentos urgentes"
        />
      )}

      {/* Documentos alta prioridad (7-15 días) */}
      {highPriorityDocuments.length > 0 && (
        <DocumentSection
          employeesMap={employeesMap}
          navigate={navigate}
          title="🟠 Alta Prioridad - Vencen en 7-15 días"
          documents={highPriorityDocuments}
          emptyMessage="No hay documentos de alta prioridad"
        />
      )}

      {/* Documentos prioridad media (15-30 días) */}
      {mediumPriorityDocuments.length > 0 && (
        <DocumentSection
          employeesMap={employeesMap}
          navigate={navigate}
          title="🟡 Prioridad Media - Vencen en 15-30 días"
          documents={mediumPriorityDocuments}
          emptyMessage="No hay documentos de prioridad media"
        />
      )}

      {/* Mensaje cuando no hay documentos */}
      {summary.total === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Todo al día!
            </h3>
            <p className="text-gray-500">
              No hay documentos próximos a vencer ni vencidos en este momento
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Sección de documentos agrupados
 */
function DocumentSection({ title, documents, isExpired = false, emptyMessage, employeesMap, navigate }) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} isExpired={isExpired} employeesMap={employeesMap} navigate={navigate} />
        ))}
      </div>
    </Card>
  );
}

/**
 * Tarjeta individual de documento
 */
function DocumentCard({ document, isExpired, employeesMap, navigate }) {
  const urgencyBadge = isExpired
    ? { label: 'Vencido', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⚫' }
    : getUrgencyBadge(document.days_until_expiration);

  // Obtener información del empleado - puede venir del objeto employees anidado o del map
  // El documento tiene employee_id (UUID), y employees es un objeto anidado de Supabase
  const employeeFromDoc = document.employees || employeesMap?.[document.employee_id];

  const employeeName = employeeFromDoc
    ? `${employeeFromDoc.first_name || ''} ${employeeFromDoc.last_name || ''}`.trim() ||
      (employeeFromDoc.employee_id ? `Código: ${employeeFromDoc.employee_id}` : 'Sin nombre')
    : 'Empleado desconocido';

  const employeeCode = employeeFromDoc?.employee_id || null;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">
            {document.document_type}
          </h3>
          <Badge className={urgencyBadge.color}>
            {urgencyBadge.icon} {urgencyBadge.label}
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <strong>Empleado:</strong> {employeeName}
          </span>
          {employeeCode && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Código: {employeeCode}
            </span>
          )}
          <span>
            <strong>Fecha vencimiento:</strong> {formatExpirationDate(document.expiration_date)}
          </span>
          {isExpired ? (
            <span className="text-red-600 font-medium">
              Vencido hace {document.days_expired} días
            </span>
          ) : (
            <span className="font-medium">
              Vence en {document.days_until_expiration} días
            </span>
          )}
        </div>

        {document.document_type_info && (
          <div className="mt-1 text-xs text-gray-400">
            Categoría: {document.document_type_info.category || 'General'}
          </div>
        )}

        {document.description && (
          <div className="mt-1 text-xs text-gray-500">
            Nota: {document.description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // employeeCode es el employee_id (código como MIN25001) que se usa en la ruta
            if (employeeCode) {
              navigate(`/employees/${employeeCode}`);
            } else {
              toast.error('No se pudo obtener el código del empleado');
            }
          }}
        >
          <UserIcon className="w-4 h-4 mr-1" />
          Ver empleado
        </Button>
      </div>
    </div>
  );
}
