import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  RefreshCw,
  Calendar,
  User as UserIcon,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react';
import api from '../../lib/api';

/**
 * Monitor de logs de emails enviados
 * Muestra historial y estadísticas de envíos
 */
export default function EmailLogsMonitor() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });

  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadLogs();
  }, [filter, limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = { limit };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await api.get('/automated-notifications/email-logs', { params });

      if (response.data.success) {
        setLogs(response.data.data || []);
        setSummary(response.data.summary || {});
      }
    } catch (error) {
      console.error('Error cargando logs de email:', error);
      toast.error('No se pudieron cargar los logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: {
        label: 'Enviado',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="w-3 h-3" />
      },
      failed: {
        label: 'Fallido',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="w-3 h-3" />
      },
      pending: {
        label: 'Pendiente',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Clock className="w-3 h-3" />
      }
    };

    return badges[status] || badges.pending;
  };

  const getTypeBadge = (type) => {
    const types = {
      document_expiration: 'Vencimiento',
      document_required: 'Requerido',
      organizational_change: 'Cambio Org.',
      daily_summary: 'Resumen Diario'
    };

    return types[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSuccessRate = () => {
    if (summary.total === 0) return 0;
    return ((summary.sent / summary.total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Monitor de Envíos</h3>
          <p className="text-sm text-gray-500 mt-1">
            Historial y estado de emails enviados via Resend
          </p>
        </div>
        <Button onClick={loadLogs} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{summary.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-purple-600">{calculateSuccessRate()}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filtrar por estado</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Límite de resultados</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 registros</SelectItem>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="200">200 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de logs */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Envíos ({logs.length})</CardTitle>
          <CardDescription>
            Registro detallado de todos los emails procesados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay registros de envíos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const statusBadge = getStatusBadge(log.status);

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${statusBadge.color}`}>
                      {statusBadge.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{log.subject}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeBadge(log.type)}
                          </Badge>
                          <Badge className={statusBadge.color}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span className="text-xs truncate">{log.recipient}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">{formatDate(log.sent_at)}</span>
                        </div>

                        {log.metadata?.ai_generated && (
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600">Generado con IA</span>
                          </div>
                        )}

                        {log.metadata?.employee_id && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-4 h-4" />
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {log.metadata.employee_id}
                            </span>
                          </div>
                        )}

                        {log.metadata?.days_until_expiration !== undefined && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">
                              {log.metadata.days_until_expiration} días hasta vencer
                            </span>
                          </div>
                        )}

                        {log.metadata?.bulk_send && (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              Envío masivo
                            </Badge>
                          </div>
                        )}
                      </div>

                      {log.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Error:</strong> {log.error_message}
                        </div>
                      )}

                      {log.metadata?.email_id && (
                        <div className="mt-2 text-xs text-gray-400">
                          ID Resend: {log.metadata.email_id}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
