/**
 * Modal para crear plantilla personalizada
 * Conectado con API real de Supabase
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Package, Save, X, PlusCircle, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import employeeDocumentService from '../../services/employeeDocumentService';

const CreateTemplateModal = ({ open, onOpenChange, allAvailableDocuments, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Personalizada',
    icon: 'template',
    documents: []
  });
  const [loading, setLoading] = useState(false);

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

  const handleUpdateDocument = (id, field, value) => {
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

      // Llamar API para crear plantilla
      const newTemplate = await employeeDocumentService.createTemplate(templateData);

      toast.success(`Plantilla "${formData.name}" creada correctamente`);

      // Resetear formulario
      setFormData({
        name: '',
        description: '',
        category: 'Personalizada',
        icon: 'template',
        documents: []
      });

      // Notificar éxito y cerrar
      onSuccess?.(newTemplate);
      onOpenChange(false);

    } catch (error) {
      console.error('Error creando plantilla:', error);
      toast.error(error.message || 'Error al crear plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Resetear formulario
    setFormData({
      name: '',
      description: '',
      category: 'Personalizada',
      icon: 'template',
      documents: []
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Crear Plantilla Personalizada
          </DialogTitle>
          <DialogDescription>
            Crea una plantilla reutilizable con varios documentos que podrás aplicar rápidamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Información de la Plantilla</h3>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Nombre de la Plantilla *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Documentos para Docentes"
                required
                disabled={loading}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Descripción
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe para qué sirve esta plantilla..."
                className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[60px]"
                disabled={loading}
              />
            </div>

            {/* Grid: Categoría e Icono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold">
                  Categoría
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                >
                  <option value="Personalizada">Personalizada</option>
                  <option value="Docentes">Docentes</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Contratación">Contratación</option>
                  <option value="Salud">Salud</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon" className="text-sm font-semibold">
                  Icono
                </Label>
                <select
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                >
                  <option value="template">Plantilla</option>
                  <option value="graduationCap">Gorro de Graduación</option>
                  <option value="briefcase">Maletín</option>
                  <option value="stethoscope">Estetoscopio</option>
                  <option value="calculator">Calculadora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documentos de la plantilla */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Documentos de la Plantilla</h3>
              <Button
                type="button"
                onClick={handleAddDocument}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar Documento
              </Button>
            </div>

            {formData.documents.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No hay documentos en esta plantilla</p>
                <p className="text-sm text-gray-400 mt-1">Haz clic en "Agregar Documento" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.documents.map((doc, index) => (
                  <div key={doc.id} className="p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50/30 dark:bg-purple-900/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-purple-800 dark:text-purple-300">
                        Documento #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Tipo de documento */}
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-semibold">Tipo de Documento *</Label>
                        <select
                          value={doc.document_type_id}
                          onChange={(e) => handleUpdateDocument(doc.id, 'document_type_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm"
                          disabled={loading}
                        >
                          <option value="">Seleccionar...</option>
                          {allAvailableDocuments.map((docType) => (
                            <option key={docType.id} value={docType.id}>
                              {docType.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Prioridad */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Prioridad</Label>
                        <select
                          value={doc.priority}
                          onChange={(e) => handleUpdateDocument(doc.id, 'priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm"
                          disabled={loading}
                        >
                          <option value="baja">Baja</option>
                          <option value="normal">Normal</option>
                          <option value="alta">Alta</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </div>
                    </div>

                    {/* Obligatorio */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${doc.id}`}
                        checked={doc.is_required}
                        onChange={(e) => handleUpdateDocument(doc.id, 'is_required', e.target.checked)}
                        className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                        disabled={loading}
                      />
                      <Label htmlFor={`required-${doc.id}`} className="text-sm cursor-pointer">
                        Documento obligatorio
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white dark:bg-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || formData.documents.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                'Creando...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Plantilla ({formData.documents.length} docs)
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateModal;
