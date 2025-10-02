/**
 * Modal para crear nuevo tipo de documento
 * Conectado con API real de Supabase
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { FileText, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import employeeDocumentService from '../../services/employeeDocumentService';

const CreateDocumentTypeModal = ({ open, onOpenChange, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    requirement_type: 'optional', // 'required' o 'optional'
    default_due_days: 7,
    has_renewal: false,
    renewal_period: null,
    renewal_unit: 'months'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      toast.error('El nombre del documento es requerido');
      return;
    }

    try {
      setLoading(true);

      // Llamar API para crear tipo de documento
      const newDocType = await employeeDocumentService.createDocumentType(formData);

      toast.success(`Tipo de documento "${formData.name}" creado correctamente`);

      // Resetear formulario
      setFormData({
        name: '',
        description: '',
        category: '',
        requirement_type: 'optional',
        default_due_days: 7,
        has_renewal: false,
        renewal_period: null,
        renewal_unit: 'months'
      });

      // Notificar éxito y cerrar
      onSuccess?.(newDocType);
      onOpenChange(false);

    } catch (error) {
      console.error('Error creando tipo de documento:', error);
      toast.error(error.message || 'Error al crear tipo de documento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Resetear formulario
    setFormData({
      name: '',
      description: '',
      category: '',
      requirement_type: 'optional',
      default_due_days: 7,
      has_renewal: false,
      renewal_period: null,
      renewal_unit: 'months'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Crear Nuevo Tipo de Documento
          </DialogTitle>
          <DialogDescription>
            Define un nuevo tipo de documento que podrás asignar a los empleados. Esta información se guardará en el sistema para uso futuro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Nombre del Documento *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Certificado de Vacunación COVID-19"
              required
              disabled={loading}
              className="border-2"
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Categoría *
            </Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            >
              <option value="">Seleccionar categoría...</option>
              <option value="General">General</option>
              <option value="Académico">Académico</option>
              <option value="Salud">Salud</option>
              <option value="Legal">Legal</option>
              <option value="Laboral">Laboral</option>
              <option value="Identidad">Identidad</option>
            </select>
          </div>

          {/* Tipo de Requisito */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Tipo de Requisito
            </Label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                formData.requirement_type === 'required'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="requirement_type"
                  value="required"
                  checked={formData.requirement_type === 'required'}
                  onChange={(e) => handleChange('requirement_type', e.target.value)}
                  className="h-4 w-4 text-blue-600"
                  disabled={loading}
                />
                <span className="font-medium">Obligatorio</span>
              </label>

              <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                formData.requirement_type === 'optional'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="requirement_type"
                  value="optional"
                  checked={formData.requirement_type === 'optional'}
                  onChange={(e) => handleChange('requirement_type', e.target.value)}
                  className="h-4 w-4 text-blue-600"
                  disabled={loading}
                />
                <span className="font-medium">Opcional</span>
              </label>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Descripción del Documento
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe qué tipo de documento es y cuál es su propósito..."
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              disabled={loading}
            />
          </div>

          {/* Días de vencimiento por defecto */}
          <div className="space-y-2">
            <Label htmlFor="default_due_days" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Fecha límite por defecto
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="default_due_days"
                type="number"
                value={formData.default_due_days}
                onChange={(e) => handleChange('default_due_days', parseInt(e.target.value) || 7)}
                min="1"
                className="w-32 border-2"
                disabled={loading}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                días desde la asignación
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cuando se asigne este documento, la fecha límite se establecerá automáticamente a {formData.default_due_days} días desde hoy. Esta fecha será editable.
            </p>
          </div>

          {/* Configuración de Vencimiento y Renovación */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Configuración de Vencimiento y Renovación
            </h3>

            {/* ¿Requiere renovación? */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  !formData.has_renewal
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="has_renewal"
                    checked={!formData.has_renewal}
                    onChange={() => handleChange('has_renewal', false)}
                    className="h-4 w-4 text-green-600"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">No, es un documento permanente</span>
                </label>

                <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.has_renewal
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="has_renewal"
                    checked={formData.has_renewal}
                    onChange={() => handleChange('has_renewal', true)}
                    className="h-4 w-4 text-orange-600"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">Sí, requiere renovación periódica</span>
                </label>
              </div>
            </div>

            {/* Si requiere renovación, mostrar opciones */}
            {formData.has_renewal && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-lg space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Período de renovación
                </Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    value={formData.renewal_period || ''}
                    onChange={(e) => handleChange('renewal_period', parseInt(e.target.value) || null)}
                    placeholder="Ej: 12"
                    min="1"
                    className="w-32 border-2"
                    disabled={loading}
                  />
                  <select
                    value={formData.renewal_unit}
                    onChange={(e) => handleChange('renewal_unit', e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={loading}
                  >
                    <option value="days">Días</option>
                    <option value="months">Meses</option>
                    <option value="years">Años</option>
                  </select>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  El documento vencerá {formData.renewal_period || '___'} {formData.renewal_unit === 'days' ? 'días' : formData.renewal_unit === 'months' ? 'meses' : 'años'} después de ser aprobado.
                </p>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
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
              disabled={loading || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                'Creando...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Tipo de Documento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDocumentTypeModal;
