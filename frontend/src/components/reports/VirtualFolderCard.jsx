import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Folder,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Building2
} from 'lucide-react';

/**
 * Componente que representa un folder virtual de un empleado
 * Similar a la visualización de carpetas en sistemas de archivos
 *
 * @param {Object} props
 * @param {Object} props.folder - Objeto con datos del folder (employee, documents, stats)
 * @param {Function} props.onOpenFolder - Callback cuando se abre el folder
 * @param {Function} props.onDownloadPDF - Callback para descargar PDF del folder
 */
const VirtualFolderCard = ({ folder, onOpenFolder, onDownloadPDF }) => {
  const { employee, stats, total_size, has_approved_documents } = folder;

  // Formatear tamaño de archivos
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determinar el color del folder basado en el estado de documentos
  const getFolderColor = () => {
    if (stats.approved === stats.total && stats.total > 0) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'border-green-300',
        label: 'Completo'
      };
    } else if (stats.rejected > 0) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-600',
        border: 'border-red-300',
        label: 'Con rechazos'
      };
    } else if (stats.expired > 0) {
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-300',
        label: 'Con vencidos'
      };
    } else if (stats.pending > 0 || stats.submitted > 0) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-600',
        border: 'border-yellow-300',
        label: 'En proceso'
      };
    } else {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'border-blue-300',
        label: 'Nuevo'
      };
    }
  };

  const folderStyle = getFolderColor();

  return (
    <Card
      className={`hover:shadow-lg transition-all cursor-pointer border-2 ${folderStyle.border} group`}
      onClick={() => onOpenFolder(folder)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Icono de folder con badge de cantidad */}
          <div className="flex items-start justify-between">
            <div className="relative">
              <div className={`p-4 rounded-lg ${folderStyle.bg}`}>
                <Folder className={`h-12 w-12 ${folderStyle.text}`} />
              </div>
              {stats.total > 0 && (
                <Badge
                  className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0"
                  variant="default"
                >
                  {stats.total}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={`${folderStyle.text} border-current`}>
              {folderStyle.label}
            </Badge>
          </div>

          {/* Información del empleado */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg line-clamp-1">
              {employee.full_name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs font-mono">
                {employee.employee_id}
              </Badge>
            </div>
            {employee.department && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="line-clamp-1">{employee.department}</span>
              </div>
            )}
          </div>

          {/* Estadísticas de documentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Documentos requeridos:</span>
              <span className="font-semibold">{stats.total}</span>
            </div>

            {/* Mini indicadores de status */}
            <div className="grid grid-cols-5 gap-1 text-xs">
              <div className="flex flex-col items-center p-2 rounded bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
                <span className="font-semibold text-green-600">{stats.approved}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600 mb-1" />
                <span className="font-semibold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-blue-50">
                <FileText className="h-4 w-4 text-blue-600 mb-1" />
                <span className="font-semibold text-blue-600">{stats.submitted}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-red-50">
                <XCircle className="h-4 w-4 text-red-600 mb-1" />
                <span className="font-semibold text-red-600">{stats.rejected}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-gray-50">
                <AlertTriangle className="h-4 w-4 text-gray-600 mb-1" />
                <span className="font-semibold text-gray-600">{stats.expired}</span>
              </div>
            </div>
          </div>

          {/* Tamaño total */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Tamaño de documentos aprobados</span>
            <span className="font-semibold">{formatFileSize(total_size)}</span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFolder(folder);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Folder
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              disabled={!has_approved_documents}
              onClick={(e) => {
                e.stopPropagation();
                if (has_approved_documents) {
                  onDownloadPDF(folder);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VirtualFolderCard;
