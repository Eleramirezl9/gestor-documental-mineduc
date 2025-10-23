import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import toast from 'react-hot-toast';
import {
  Mail,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Clock,
  User as UserIcon,
  FileText,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import api from '../../lib/api';

/**
 * Gestor de emails para renovaciones de documentos
 * Integra GPT-5 Nano + Resend con datos reales de documentos por vencer
 */
export default function RenewalEmailsManager() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Datos de documentos
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    expired: 0,
    urgent: 0,
    high: 0,
    medium: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    urgency: 'all',
    days: 30,
    search: ''
  });

  // Selección de documentos
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  // Preview de email
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Estado de envío
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [filters.days, filters.urgency]);

  useEffect(() => {
    applyFilters();
  }, [documents, filters.search]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/automated-notifications/renewals/pending`, {
        params: {
          days: filters.days,
          urgency: filters.urgency
        }
      });

      if (response.data.success) {
        setDocuments(response.data.data || []);
        setSummary(response.data.summary || {});
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast.error('No se pudieron cargar los documentos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = documents;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.employee_name?.toLowerCase().includes(searchLower) ||
        doc.employee_code?.toLowerCase().includes(searchLower) ||
        doc.document_type_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDocuments(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const selectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  const generatePreview = async (documentId) => {
    try {
      setLoadingPreview(true);
      setPreviewOpen(true);

      // Aumentar timeout para generación de contenido con IA
      const response = await api.post('/automated-notifications/generate-email-content', {
        documentId,
        preview: true
      }, {
        timeout: 30000 // 30 segundos
      });

      if (response.data.success) {
        setPreviewData(response.data);
        toast.success('Vista previa generada con IA');
      }
    } catch (error) {
      console.error('Error generando preview:', error);
      toast.error('Error al generar vista previa');
      setPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendSingleEmail = async (documentId) => {
    try {
      setSending(true);

      // Aumentar timeout para envío de email (generación IA + envío puede tardar)
      const response = await api.post('/automated-notifications/send-renewal-email', {
        documentId
      }, {
        timeout: 60000 // 60 segundos
      });

      if (response.data.success) {
        toast.success(`Email enviado a ${response.data.email.to}`);
        // Remover de selección
        setSelectedDocuments(prev => prev.filter(id => id !== documentId));
        // Recargar lista de documentos
        loadDocuments();
      }
    } catch (error) {
      console.error('Error enviando email:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('El envío está tardando más de lo esperado. El email puede haberse enviado correctamente.');
      } else {
        toast.error('Error al enviar email');
      }
    } finally {
      setSending(false);
    }
  };

  const sendBulkEmails = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Selecciona al menos un documento');
      return;
    }

    const confirmSend = window.confirm(
      `¿Estás seguro de enviar ${selectedDocuments.length} email(s) con contenido generado por IA?`
    );

    if (!confirmSend) return;

    try {
      setSending(true);

      // Aumentar timeout para envío masivo (1 minuto)
      const response = await api.post('/automated-notifications/bulk-send', {
        documentIds: selectedDocuments
      }, {
        timeout: 60000 // 60 segundos
      });

      if (response.data.success) {
        setSendResults(response.data);
        toast.success(response.data.message);
        setSelectedDocuments([]);
        loadDocuments(); // Recargar datos
      }
    } catch (error) {
      console.error('Error en envío masivo:', error);
      toast.error('Error en envío masivo');
    } finally {
      setSending(false);
    }
  };

  const getUrgencyBadge = (urgencyLevel, daysUntilExpiration) => {
    const badges = {
      expired: {
        label: 'Vencido',
        color: 'bg-gray-600 text-white',
        icon: <XCircle className="w-3 h-3" />
      },
      urgent: {
        label: `Urgente (${daysUntilExpiration}d)`,
        color: 'bg-red-600 text-white',
        icon: <AlertTriangle className="w-3 h-3" />
      },
      high: {
        label: `Alta (${daysUntilExpiration}d)`,
        color: 'bg-orange-500 text-white',
        icon: <Clock className="w-3 h-3" />
      },
      medium: {
        label: `Media (${daysUntilExpiration}d)`,
        color: 'bg-yellow-500 text-white',
        icon: <Clock className="w-3 h-3" />
      }
    };

    return badges[urgencyLevel] || badges.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <h2 className="text-2xl font-bold text-gray-900">Envío de Emails de Renovación</h2>
          <p className="text-sm text-gray-500 mt-1">
            Emails personalizados generados con GPT-5 Nano y enviados via Resend
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {selectedDocuments.length > 0 && (
            <Button
              onClick={sendBulkEmails}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar {selectedDocuments.length} Email{selectedDocuments.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-gray-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-gray-600">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Vencidos</div>
            <div className="text-2xl font-bold text-gray-900">{summary.expired}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-600">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Urgente</div>
            <div className="text-2xl font-bold text-red-600">{summary.urgent}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Alta</div>
            <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-yellow-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Media</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.medium}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rango de días</label>
              <Select value={filters.days.toString()} onValueChange={(value) => setFilters(prev => ({ ...prev, days: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Próximos 7 días</SelectItem>
                  <SelectItem value="15">Próximos 15 días</SelectItem>
                  <SelectItem value="30">Próximos 30 días</SelectItem>
                  <SelectItem value="60">Próximos 60 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Nivel de urgencia</label>
              <Select value={filters.urgency} onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="expired">Vencidos</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta prioridad</SelectItem>
                  <SelectItem value="medium">Media prioridad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Empleado, código, documento..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documentos por Renovar ({filteredDocuments.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedDocuments.length === filteredDocuments.length ? 'Deseleccionar' : 'Seleccionar'} todo
            </Button>
          </div>
          <CardDescription>
            Documentos próximos a vencer con información del empleado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">No hay documentos que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const badge = getUrgencyBadge(doc.urgency_level, doc.days_until_expiration);
                const isSelected = selectedDocuments.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                      isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{doc.document_type_name}</h4>
                        <Badge className={badge.color}>
                          {badge.icon}
                          <span className="ml-1">{badge.label}</span>
                        </Badge>
                        {!doc.employee_email && (
                          <Badge variant="destructive" className="text-xs">
                            Sin email
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          <span>{doc.employee_name}</span>
                        </div>
                        {doc.employee_code && (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {doc.employee_code}
                            </span>
                          </div>
                        )}
                        {doc.employee_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span className="text-xs">{doc.employee_email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Vence: {new Date(doc.required_date).toLocaleDateString('es-GT')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePreview(doc.id)}
                        disabled={loadingPreview || !doc.employee_email}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Vista previa
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => sendSingleEmail(doc.id)}
                        disabled={sending || !doc.employee_email}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado de envío masivo */}
      {sendResults && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Envío masivo completado:</strong> {sendResults.summary.successful} exitosos de {sendResults.summary.total} total
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Vista Previa del Email - Generado con GPT-5 Nano
            </DialogTitle>
            <DialogDescription>
              Contenido personalizado generado automáticamente
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              {/* Información del documento */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Información del Documento</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Empleado:</span>{' '}
                      <span className="font-medium">{previewData.document.employee.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Código:</span>{' '}
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">{previewData.document.employee.code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>{' '}
                      <span className="text-xs">{previewData.document.employee.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Días hasta vencer:</span>{' '}
                      <Badge className={getUrgencyBadge(previewData.document.urgency_level, previewData.document.days_until_expiration).color}>
                        {previewData.document.days_until_expiration} días
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email generado */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Asunto del Email</label>
                <Input value={previewData.email.subject} readOnly className="font-medium" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Cuerpo del Email</label>
                <Textarea
                  value={previewData.email.body}
                  readOnly
                  rows={12}
                  className="font-sans"
                />
              </div>

              {/* Metadata */}
              {previewData.email.metadata && (
                <div className="text-xs text-gray-500 space-y-1">
                  {previewData.email.metadata.model && (
                    <p>
                      <strong>Modelo:</strong> {previewData.email.metadata.model}
                    </p>
                  )}
                  {previewData.email.metadata.tokens && (
                    <p>
                      <strong>Tokens utilizados:</strong> {previewData.email.metadata.tokens}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    sendSingleEmail(previewData.document.id);
                    setPreviewOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay datos de preview
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
