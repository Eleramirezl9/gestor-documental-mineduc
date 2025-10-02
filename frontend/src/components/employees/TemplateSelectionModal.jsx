/**
 * Modal para seleccionar plantillas de documentos
 * Diseño visual profesional con cards
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Package, X, FileText, Users, Briefcase, GraduationCap, Heart, Calculator, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import employeeDocumentService from '../../services/employeeDocumentService';
import EditTemplateModal from './EditTemplateModal';

const TemplateSelectionModal = ({ open, onOpenChange, templates, onSelectTemplate, onCreateNew, onTemplateDeleted, onTemplateUpdated, allAvailableDocuments }) => {
  const [deletingId, setDeletingId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Manejar eliminación de plantilla
  const handleDelete = async (e, templateId, templateName) => {
    e.stopPropagation(); // Evitar que se dispare el onClick del card

    if (!window.confirm(`¿Estás seguro de eliminar la plantilla "${templateName}"?`)) {
      return;
    }

    try {
      setDeletingId(templateId);
      await employeeDocumentService.deleteTemplate(templateId);
      toast.success('Plantilla eliminada correctamente');
      onTemplateDeleted?.(templateId);
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      toast.error('Error al eliminar la plantilla');
    } finally {
      setDeletingId(null);
    }
  };

  // Manejar edición de plantilla
  const handleEdit = (e, template) => {
    e.stopPropagation(); // Evitar que se dispare el onClick del card
    setEditingTemplate(template);
    setShowEditModal(true);
  };

  // Obtener icono según el tipo (más grande)
  const getTemplateIcon = (iconName) => {
    const icons = {
      stethoscope: <Heart className="h-6 w-6 text-purple-600" />,
      cross: <Heart className="h-6 w-6 text-purple-600" />,
      graduationCap: <GraduationCap className="h-6 w-6 text-purple-600" />,
      briefcase: <Briefcase className="h-6 w-6 text-purple-600" />,
      calculator: <Calculator className="h-6 w-6 text-purple-600" />,
      users: <Users className="h-6 w-6 text-purple-600" />,
      template: <Package className="h-6 w-6 text-purple-600" />
    };
    return icons[iconName] || icons.template;
  };

  // Obtener color de categoría
  const getCategoryColor = (category) => {
    const colors = {
      'Salud': 'bg-red-100 text-red-700 border-red-300',
      'Educación': 'bg-blue-100 text-blue-700 border-blue-300',
      'Docentes': 'bg-green-100 text-green-700 border-green-300',
      'Administrativo': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Contratación': 'bg-purple-100 text-purple-700 border-purple-300',
      'Personalizada': 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return colors[category] || colors['Personalizada'];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton={true} className="max-w-4xl p-0 gap-0 bg-purple-50/50 dark:bg-gray-900">
        {/* Header más grande */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-purple-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-purple-600" />
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Seleccionar Plantilla de Documentos
            </DialogTitle>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-purple-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Descripción más grande */}
        <div className="px-8 pt-4 pb-2">
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Selecciona una plantilla predefinida para aplicar automáticamente un conjunto de documentos requeridos según el cargo o función del empleado.
          </DialogDescription>
        </div>

        {/* Contenido principal con fondo morado claro */}
        <div className="px-8 py-5 max-h-[65vh] overflow-y-auto">
          {templates.length === 0 ? (
            // Estado vacío con diseño centrado
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                <Package className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-base font-semibold text-purple-900 dark:text-white mb-2">
                ¿No encuentras la plantilla que necesitas?
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-6 max-w-md">
                Crea tu propia plantilla personalizada con los documentos específicos que requieres
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={onCreateNew}
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Crear Mi Plantilla
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Guardar Como Plantilla
                </Button>
              </div>
            </div>
          ) : (
            // Grid de plantillas - más grande y legible
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:border-purple-400 hover:shadow-lg transition-all"
                >
                  {/* Header con icono a la izquierda y botones de acción */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl shrink-0">
                        {getTemplateIcon(template.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {template.description || `Plantilla para personal de ${template.category?.toLowerCase()}`}
                        </p>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEdit(e, template)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Editar plantilla"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, template.id, template.name)}
                        disabled={deletingId === template.id}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar plantilla"
                      >
                        {deletingId === template.id ? (
                          <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Badge de categoría y documentos - más grandes */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-md text-sm font-medium ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {template.documents?.length || 0} documentos
                    </span>
                  </div>

                  {/* Lista de documentos incluidos - texto más grande */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Documentos incluidos:
                    </p>
                    <div className="space-y-1.5">
                      {template.documents?.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                          <span className="truncate">{doc.document_type?.name || doc.name || 'Documento'}</span>
                        </div>
                      ))}
                      {template.documents?.length > 5 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic pl-3.5">
                          ...y {template.documents.length - 5} más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con botón Cancelar más grande */}
        <div className="px-8 py-4 flex justify-end border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-gray-300 hover:bg-gray-100 px-6 py-2 text-base"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>

      {/* Modal de edición */}
      <EditTemplateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        template={editingTemplate}
        allAvailableDocuments={allAvailableDocuments}
        onSuccess={async (updatedTemplate) => {
          toast.success('Plantilla actualizada correctamente');
          await onTemplateUpdated?.(updatedTemplate);
          setShowEditModal(false);
          setEditingTemplate(null);
        }}
      />
    </Dialog>
  );
};

export default TemplateSelectionModal;
