/**
 * Modal de Asignación de Documentos Requeridos - Conectado con API Real
 * Mantiene el diseño exacto del original pero con funcionalidad completa
 */

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  FileText,
  CheckCircle,
  PlusCircle,
  Minus,
  Save,
  Package,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useEmployeeDocumentAssignment } from '../../hooks/useEmployeeDocumentAssignment';
import { toast } from 'react-hot-toast';
import CreateDocumentTypeModal from './CreateDocumentTypeModal';
import CreateTemplateModal from './CreateTemplateModal';
import TemplateSelectionModal from './TemplateSelectionModal';
import EditAssignedDocumentModal from './EditAssignedDocumentModal';

const EmployeeDocumentModal = ({ open, onOpenChange, employee, onSuccess }) => {
  const {
    allAvailableDocuments,
    documentTemplates,
    assignedDocuments,
    documentItems,
    loading,
    loadingTemplates,
    handleAddDocumentItem,
    handleUpdateDocumentItem,
    handleRemoveDocumentItem,
    handleApplyTemplate,
    handleSaveDocumentAssignment,
    handleUpdateAssignedDocument,
    handleDeleteAssignedDocument,
    loadTemplates,
    loadDocumentTypes,
    loadAssignedDocuments
  } = useEmployeeDocumentAssignment(employee?.employee_id);

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Estados para los modals de creación
  const [showCreateDocumentTypeModal, setShowCreateDocumentTypeModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [currentEditingItemId, setCurrentEditingItemId] = useState(null);

  // Estado para el modal visual de plantillas
  const [showTemplateSelectionModal, setShowTemplateSelectionModal] = useState(false);

  // Estado para el modal de edición de documento asignado
  const [showEditAssignedModal, setShowEditAssignedModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Calcular fecha de vencimiento por defecto (30 días desde hoy)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  // Obtener icono de plantilla
  const getTemplateIcon = (iconName) => {
    const icons = {
      stethoscope: <Package className="h-5 w-5" />,
      cross: <Package className="h-5 w-5" />,
      graduationCap: <Package className="h-5 w-5" />,
      briefcase: <Package className="h-5 w-5" />,
      calculator: <Package className="h-5 w-5" />,
      template: <Package className="h-5 w-5" />
    };
    return icons[iconName] || icons.template;
  };

  // Calcular fecha de expiración
  const calculateExpirationDate = (uploadDate, document) => {
    if (!document?.has_expiration || !uploadDate) return null;

    const date = new Date(uploadDate);
    const period = document.renewal_period || 12;
    const unit = document.renewal_unit || 'months';

    if (unit === 'months') {
      date.setMonth(date.getMonth() + period);
    } else if (unit === 'years') {
      date.setFullYear(date.getFullYear() + period);
    }

    return date.toISOString().split('T')[0];
  };

  // Obtener estado de expiración
  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return null;

    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { status: 'expired', color: 'red', text: 'Vencido' };
    } else if (daysUntilExpiration <= 30) {
      return { status: 'expiring', color: 'orange', text: `Vence en ${daysUntilExpiration} días` };
    }
    return { status: 'valid', color: 'green', text: `Vigente` };
  };

  // Formatear período de renovación
  const formatRenewalPeriod = (document) => {
    if (!document?.has_expiration) return null;
    const period = document.renewal_period || 12;
    const unit = document.renewal_unit === 'years' ? 'años' : 'meses';
    return `cada ${period} ${unit}`;
  };

  // Manejar guardado
  const handleSave = async () => {
    const success = await handleSaveDocumentAssignment();
    if (success) {
      setSelectedTemplate(null);
      onSuccess?.();
      onOpenChange(false);
    }
  };

  // Manejar aplicación de plantilla
  const handleTemplateSelect = (template) => {
    handleApplyTemplate(template);
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    toast.success(`Plantilla "${template.name}" aplicada`);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Asignar Documentos Requeridos a {employee.first_name} {employee.last_name}
          </DialogTitle>
          <DialogDescription>
            Gestiona los documentos requeridos para el empleado. Puedes ver los documentos ya asignados, agregar nuevos requisitos y gestionar la subida de archivos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-6 overflow-y-auto flex-1 px-1">
          {/* Información del Empleado */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">Empleado:</span>
                <div className="text-gray-900 dark:text-white">
                  {employee.first_name} {employee.last_name}
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">Departamento:</span>
                <div className="text-gray-900 dark:text-white">{employee.department}</div>
              </div>
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">ID:</span>
                <div className="text-gray-900 dark:text-white font-mono">{employee.employee_id}</div>
              </div>
            </div>
          </div>

          {/* Documentos ya Asignados */}
          {assignedDocuments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Documentos Actualmente Asignados ({assignedDocuments.length})
              </h3>
              <div className="space-y-3">
                {assignedDocuments.map((assignment) => {
                  const document = allAvailableDocuments.find(d => d.id === assignment.documentId);
                  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
                  const daysLeft = assignment.dueDate
                    ? Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;

                  const expirationDate = assignment.uploadDate
                    ? calculateExpirationDate(assignment.uploadDate, document)
                    : null;
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
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {document?.description || 'Sin descripción'}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-4 text-gray-500">
                              <span>Prioridad: <span className={`font-medium ${
                                assignment.priority === 'urgente' ? 'text-red-600' :
                                assignment.priority === 'alta' ? 'text-orange-600' :
                                'text-green-600'
                              }`}>{
                                assignment.priority === 'urgente' ? 'Urgente' :
                                assignment.priority === 'alta' ? 'Alta' :
                                assignment.priority === 'baja' ? 'Baja' :
                                'Normal'
                              }</span></span>
                              {assignment.dueDate && (
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                  Vence: {new Date(assignment.dueDate).toLocaleDateString('es-GT', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                  {daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft} días` : 'Vencido'})`}
                                </span>
                              )}
                              <span>Estado: <span className={`font-medium ${
                                assignment.status === 'aprobado' ? 'text-green-600' :
                                assignment.status === 'rechazado' ? 'text-red-600' :
                                assignment.status === 'subido' ? 'text-blue-600' :
                                'text-yellow-600'
                              }`}>{
                                assignment.status === 'aprobado' ? 'Aprobado' :
                                assignment.status === 'rechazado' ? 'Rechazado' :
                                assignment.status === 'subido' ? 'Subido' :
                                assignment.status === 'pending' ? 'Pendiente' :
                                assignment.status
                              }</span></span>
                            </div>
                            {/* Renovación */}
                            {assignment.has_custom_renewal && assignment.custom_renewal_period ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium">
                                  <RefreshCw className="h-3 w-3" />
                                  Renovación personalizada: cada {assignment.custom_renewal_period} {
                                    assignment.custom_renewal_unit === 'years' ? 'años' :
                                    assignment.custom_renewal_unit === 'days' ? 'días' :
                                    'meses'
                                  }
                                </span>
                              </div>
                            ) : assignment.has_expiration && assignment.renewal_period ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium">
                                  <RefreshCw className="h-3 w-3" />
                                  Renovación: cada {assignment.renewal_period} {
                                    assignment.renewal_unit === 'years' ? 'años' :
                                    assignment.renewal_unit === 'days' ? 'días' :
                                    'meses'
                                  }
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAssignment(assignment);
                              setShowEditAssignedModal(true);
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Editar documento"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (window.confirm(`¿Estás seguro de eliminar la asignación de "${document?.name}"?`)) {
                                try {
                                  await handleDeleteAssignedDocument(assignment.id);
                                } catch (error) {
                                  console.error('Error eliminando documento:', error);
                                }
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar documento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                  onClick={() => setShowTemplateSelectionModal(true)}
                  variant="outline"
                  size="sm"
                  className="justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 rounded-md px-3 has-[>svg]:px-2.5 flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  disabled={loadingTemplates}
                >
                  {getTemplateIcon('template')}
                  Usar Plantilla
                </Button>
                <Button
                  onClick={handleAddDocumentItem}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <PlusCircle className="h-4 w-4" />
                  Agregar Documento
                </Button>
              </div>
            </div>

            {/* Selector de Plantillas */}
            {showTemplateSelector && (
              <div className="p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50/50 dark:bg-purple-900/20">
                <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-3">Seleccionar Plantilla</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documentTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-3 border border-purple-300 dark:border-purple-600 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getTemplateIcon(template.icon)}
                        <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.documents?.length || 0} docs
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indicador de plantilla aplicada */}
            {selectedTemplate && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                <div className="flex items-center gap-2">
                  {getTemplateIcon(selectedTemplate.icon)}
                  <span className="font-medium text-purple-800 dark:text-purple-200">
                    Plantilla aplicada: {selectedTemplate.name}
                  </span>
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                    {selectedTemplate.documents?.length || 0} documentos
                  </Badge>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  {selectedTemplate.description}. Puedes editar individualmente cada documento si es necesario.
                </p>
              </div>
            )}

            {/* Lista de documentos a asignar */}
            {documentItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay documentos agregados</p>
                <p className="text-sm">Haz clic en "Agregar Documento" o "Usar Plantilla" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documentItems.map((item, index) => {
                  const selectedDoc = allAvailableDocuments.find(d => d.id === item.documentId);
                  const isDocumentSelected = !!item.documentId;

                  return (
                    <div key={item.id} className="relative p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Header del documento */}
                      <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-semibold shrink-0 ${
                            isDocumentSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                              {selectedDoc ? selectedDoc.name : 'Documento sin configurar'}
                            </h4>
                            {selectedDoc && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {selectedDoc.category} • {selectedDoc.required ? 'Obligatorio' : 'Opcional'}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocumentItem(item.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Configuración del documento */}
                      <div className="space-y-4">
                        {/* Selector de documento */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            Seleccionar Documento
                          </Label>
                          <select
                            value={item.documentId}
                            onChange={(e) => {
                              if (e.target.value === 'create_new_type') {
                                setShowCreateDocumentTypeModal(true);
                                setCurrentEditingItemId(item.id);
                              } else if (e.target.value === 'create_new_template') {
                                setShowCreateTemplateModal(true);
                              } else {
                                handleUpdateDocumentItem(item.id, 'documentId', e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option value="">Seleccionar documento...</option>

                            {/* Opciones especiales */}
                            <option value="create_new_type">+ Crear nuevo tipo de documento...</option>
                            <option value="create_new_template">+ Crear mi plantilla personalizada...</option>

                            {/* Separador visual */}
                            <option disabled>──────────────────────</option>

                            {/* Documentos existentes */}
                            {allAvailableDocuments.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.name} - {doc.category} {doc.required ? '(Obligatorio)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Grid con 2 columnas para Nivel de Prioridad y Fechas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nivel de Prioridad */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                              Nivel de Prioridad
                            </Label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <input
                                  type="radio"
                                  name={`priority-${item.id}`}
                                  value="normal"
                                  checked={item.priority === 'normal'}
                                  onChange={(e) => handleUpdateDocumentItem(item.id, 'priority', e.target.value)}
                                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                />
                                <span className="flex-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Normal</span>
                                </span>
                              </label>
                              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <input
                                  type="radio"
                                  name={`priority-${item.id}`}
                                  value="alta"
                                  checked={item.priority === 'alta'}
                                  onChange={(e) => handleUpdateDocumentItem(item.id, 'priority', e.target.value)}
                                  className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                                />
                                <span className="flex-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Alta</span>
                                </span>
                              </label>
                              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <input
                                  type="radio"
                                  name={`priority-${item.id}`}
                                  value="urgente"
                                  checked={item.priority === 'urgente'}
                                  onChange={(e) => handleUpdateDocumentItem(item.id, 'priority', e.target.value)}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="flex-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Urgente</span>
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Columna derecha con fechas */}
                          <div className="space-y-4">
                            {/* Fecha de Asignación */}
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Fecha de Asignación
                              </Label>
                              <input
                                type="date"
                                value={new Date().toISOString().split('T')[0]}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg"
                              />
                            </div>

                            {/* Fecha Límite */}
                            <div>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Fecha Límite
                              </Label>
                              <input
                                type="date"
                                value={item.dueDate || ''}
                                onChange={(e) => handleUpdateDocumentItem(item.id, 'dueDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Notas adicionales */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            Notas adicionales (opcional)
                          </Label>
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateDocumentItem(item.id, 'notes', e.target.value)}
                            placeholder="Instrucciones específicas o comentarios..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {documentItems.length > 0 && (
              <span className="font-medium">
                {documentItems.length} documento(s) para asignar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || documentItems.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Asignar {documentItems.length} Documento(s)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal para crear nuevo tipo de documento */}
      <CreateDocumentTypeModal
        open={showCreateDocumentTypeModal}
        onOpenChange={setShowCreateDocumentTypeModal}
        onSuccess={async (newDocType) => {
          toast.success('Tipo de documento creado correctamente');

          // Recargar tipos de documentos desde la API
          await loadDocumentTypes();

          // Si hay un item siendo editado, asignar el nuevo tipo
          if (currentEditingItemId && newDocType?.id) {
            handleUpdateDocumentItem(currentEditingItemId, 'documentId', newDocType.id);
            setCurrentEditingItemId(null);
          }

          setShowCreateDocumentTypeModal(false);
        }}
      />

      {/* Modal para crear plantilla personalizada */}
      <CreateTemplateModal
        open={showCreateTemplateModal}
        onOpenChange={setShowCreateTemplateModal}
        allAvailableDocuments={allAvailableDocuments}
        onSuccess={async (newTemplate) => {
          toast.success('Plantilla creada correctamente');

          // Recargar plantillas desde la API
          await loadTemplates();

          setShowCreateTemplateModal(false);
        }}
      />

      {/* Modal de selección de plantillas con diseño visual */}
      <TemplateSelectionModal
        open={showTemplateSelectionModal}
        onOpenChange={setShowTemplateSelectionModal}
        templates={documentTemplates}
        allAvailableDocuments={allAvailableDocuments}
        onSelectTemplate={(template) => {
          handleApplyTemplate(template);
          setSelectedTemplate(template);
          setShowTemplateSelectionModal(false);
          toast.success(`Plantilla "${template.name}" aplicada correctamente`);
        }}
        onCreateNew={() => {
          setShowTemplateSelectionModal(false);
          setShowCreateTemplateModal(true);
        }}
        onTemplateDeleted={async (templateId) => {
          // Recargar plantillas después de eliminar
          await loadTemplates();
        }}
        onTemplateUpdated={async (updatedTemplate) => {
          // Recargar plantillas después de actualizar
          await loadTemplates();
        }}
      />

      {/* Modal de edición de documento asignado */}
      <EditAssignedDocumentModal
        open={showEditAssignedModal}
        onOpenChange={setShowEditAssignedModal}
        assignment={editingAssignment}
        onSuccess={async () => {
          await loadAssignedDocuments();
          setShowEditAssignedModal(false);
          setEditingAssignment(null);
        }}
      />
    </Dialog>
  );
};

export default EmployeeDocumentModal;
