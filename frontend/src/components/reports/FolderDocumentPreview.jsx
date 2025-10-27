import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  User,
  Mail,
  Building2,
  Briefcase,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente de diálogo para previsualizar el contenido de un folder virtual
 * Muestra todos los documentos del empleado organizados por estado
 *
 * @param {Object} props
 * @param {boolean} props.open - Si el diálogo está abierto
 * @param {Function} props.onClose - Callback para cerrar
 * @param {Object} props.folder - Objeto del folder con employee y documents
 * @param {Function} props.onDownloadPDF - Callback para descargar PDF
 */
const FolderDocumentPreview = ({ open, onClose, folder, onDownloadPDF }) => {
  // Agrupar documentos por estado
  const documentsByStatus = useMemo(() => {
    if (!folder || !folder.documents) {
      return {
        approved: [],
        submitted: [],
        pending: [],
        rejected: [],
        expired: []
      };
    }

    const { documents } = folder;
    return {
      approved: documents.filter(d => d.status === 'approved'),
      submitted: documents.filter(d => d.status === 'submitted'),
      pending: documents.filter(d => d.status === 'pending'),
      rejected: documents.filter(d => d.status === 'rejected'),
      expired: documents.filter(d => d.status === 'expired')
    };
  }, [folder]);

  if (!folder) return null;

  const { employee, documents, stats } = folder;

  // Configuración de estados para visualización
  const statusConfig = {
    approved: {
      label: 'Aprobados',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    submitted: {
      label: 'Subidos (Pendiente revisión)',
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    pending: {
      label: 'Pendientes',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    rejected: {
      label: 'Rechazados',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    expired: {
      label: 'Vencidos',
      icon: AlertTriangle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'No especificada';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Renderizar documento individual
  const DocumentItem = ({ doc, config }) => {
    const Icon = config.icon;

    return (
      <div className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}>
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm">{doc.document_type}</h4>
              <Badge variant="outline" className={`${config.color} border-current text-xs`}>
                {config.label}
              </Badge>
            </div>

            {doc.description && (
              <p className="text-xs text-muted-foreground">{doc.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {doc.required_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Requerido: {formatDate(doc.required_date)}</span>
                </div>
              )}
              {doc.approved_at && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Aprobado: {formatDate(doc.approved_at)}</span>
                </div>
              )}
            </div>

            {doc.rejection_reason && (
              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                <strong>Motivo de rechazo:</strong> {doc.rejection_reason}
              </div>
            )}

            {doc.notes && (
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <strong>Notas:</strong> {doc.notes}
              </div>
            )}

            {doc.documents && (
              <div className="mt-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 inline mr-1" />
                Archivo: {doc.documents.title || 'Sin título'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Folder Virtual - {employee.full_name}
          </DialogTitle>
          <DialogDescription>
            Vista completa de documentos requeridos y su estado actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del empleado */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nombre completo</p>
                      <p className="font-semibold">{employee.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {employee.employee_id}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  {employee.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{employee.email}</p>
                      </div>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Departamento</p>
                        <p className="text-sm">{employee.department}</p>
                      </div>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Puesto</p>
                        <p className="text-sm">{employee.position}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de documentos */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Resumen de Documentos</h3>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const count = stats[key] || 0;
                  return (
                    <div key={key} className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                      <Icon className={`h-5 w-5 ${config.color} mb-1`} />
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Documentos aprobados */}
          {documentsByStatus.approved.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Documentos Aprobados ({documentsByStatus.approved.length})
                </h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onDownloadPDF(folder)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Folder Completo (PDF)
                </Button>
              </div>
              <div className="space-y-2">
                {documentsByStatus.approved.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} config={statusConfig.approved} />
                ))}
              </div>
            </div>
          )}

          {/* Documentos subidos */}
          {documentsByStatus.submitted.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Documentos Subidos - Pendiente Revisión ({documentsByStatus.submitted.length})
              </h3>
              <div className="space-y-2">
                {documentsByStatus.submitted.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} config={statusConfig.submitted} />
                ))}
              </div>
            </div>
          )}

          {/* Documentos pendientes */}
          {documentsByStatus.pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-yellow-700 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Documentos Pendientes ({documentsByStatus.pending.length})
              </h3>
              <div className="space-y-2">
                {documentsByStatus.pending.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} config={statusConfig.pending} />
                ))}
              </div>
            </div>
          )}

          {/* Documentos rechazados */}
          {documentsByStatus.rejected.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Documentos Rechazados ({documentsByStatus.rejected.length})
              </h3>
              <div className="space-y-2">
                {documentsByStatus.rejected.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} config={statusConfig.rejected} />
                ))}
              </div>
            </div>
          )}

          {/* Documentos vencidos */}
          {documentsByStatus.expired.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Documentos Vencidos ({documentsByStatus.expired.length})
              </h3>
              <div className="space-y-2">
                {documentsByStatus.expired.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} config={statusConfig.expired} />
                ))}
              </div>
            </div>
          )}

          {/* Sin documentos */}
          {documents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay documentos asignados a este empleado</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDocumentPreview;
