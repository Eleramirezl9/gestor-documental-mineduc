/**
 * Modal para editar plantilla existente
 * Conectado con API real de Supabase
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Pencil, Save, X, PlusCircle, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import employeeDocumentService from '../../services/employeeDocumentService';

const EditTemplateModal = ({ open, onOpenChange, template, allAvailableDocuments, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Personalizada',
    icon: 'template',
    documents: []
  });
  const [loading, setLoading] = useState(false);

  // Cargar datos de la plantilla cuando se abre el modal
  useEffect(() => {
    if (template && open) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'Personalizada',
        icon: template.icon || 'template',
        documents: (template.documents || []).map(doc => ({
          id: doc.id || Date.now() + Math.random(),
          document_type_id: doc.document_type_id || doc.id,
          priority: doc.priority || 'normal',
          is_required: doc.is_required !== undefined ? doc.is_required : true
        }))
      });
    }
  }, [template, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDocument = () => {
    setFormData(prev => ({
      ...prev,
      documents: [
        ...prev.documents,
        {
          id: Date.now(),
          document_type_id: '',
          priority: 'normal',
          is_required: true
        }
      ]
    }));
  };

  const handleRemoveDocument = (id) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const handleDocumentChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    if (formData.documents.length === 0) {
      toast.error('Debes agregar al menos un documento a la plantilla');
      return;
    }

    const invalidDocs = formData.documents.filter(doc => !doc.document_type_id);
    if (invalidDocs.length > 0) {
      toast.error('Todos los documentos deben tener un tipo seleccionado');
      return;
    }

    // Validar que no haya documentos duplicados
    const documentTypeIds = formData.documents.map(doc => doc.document_type_id);
    const uniqueIds = new Set(documentTypeIds);
    if (uniqueIds.size < documentTypeIds.length) {
      toast.error('No puedes agregar el mismo tipo de documento más de una vez en una plantilla');
      return;
    }

    try {
      setLoading(true);

      // Preparar datos para API
      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        documents: formData.documents.map(doc => ({
          document_type_id: doc.document_type_id,
          priority: doc.priority,
          is_required: doc.is_required
        }))
      };

      // Llamar API para actualizar plantilla
      const updatedTemplate = await employeeDocumentService.updateTemplate(template.id, templateData);

      toast.success(`Plantilla "${formData.name}" actualizada correctamente`);

      // Notificar éxito y cerrar
      onSuccess?.(updatedTemplate);
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton={true} className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-semibold">Editar Plantilla de Documentos</DialogTitle>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <DialogDescription className="text-sm text-gray-600 mb-6">
              Edita la información de la plantilla y los documentos incluidos.
            </DialogDescription>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nombre de la Plantilla *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Plantilla para Docentes"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Categoría</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Salud">Salud</option>
                    <option value="Educación">Educación</option>
                    <option value="Docentes">Docentes</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Contratación">Contratación</option>
                    <option value="Personalizada">Personalizada</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Descripción</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descripción de la plantilla..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Documentos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Documentos Incluidos *</Label>
                  <Button
                    type="button"
                    onClick={handleAddDocument}
                    size="sm"
                    variant="outline"
                    className="text-blue-600"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Agregar Documento
                  </Button>
                </div>

                {formData.documents.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                    No hay documentos agregados. Haz clic en "Agregar Documento" para comenzar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.documents.map((doc, index) => (
                      <div key={doc.id} className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs">Tipo de Documento</Label>
                            <select
                              value={doc.document_type_id}
                              onChange={(e) => handleDocumentChange(doc.id, 'document_type_id', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {allAvailableDocuments?.map(dt => (
                                <option key={dt.id} value={dt.id}>
                                  {dt.name} - {dt.category}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Prioridad</Label>
                            <select
                              value={doc.priority}
                              onChange={(e) => handleDocumentChange(doc.id, 'priority', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="baja">Baja</option>
                              <option value="normal">Normal</option>
                              <option value="alta">Alta</option>
                              <option value="urgente">Urgente</option>
                            </select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 mt-5"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 bg-white dark:bg-gray-800">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Actualizar Plantilla
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateModal;
