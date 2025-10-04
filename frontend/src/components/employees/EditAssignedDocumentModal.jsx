/**
 * Modal para editar documento asignado a empleado
 * Permite modificar prioridad, fecha límite, notas y renovación personalizada
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Pencil, Save, X, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import employeeDocumentService from '../../services/employeeDocumentService';

const EditAssignedDocumentModal = ({ open, onOpenChange, assignment, onSuccess }) => {
  const [formData, setFormData] = useState({
    priority: 'normal',
    dueDate: '',
    notes: '',
    hasCustomRenewal: false,
    customRenewalPeriod: null,
    customRenewalUnit: 'months'
  });
  const [loading, setLoading] = useState(false);

  // Cargar datos del documento asignado
  useEffect(() => {
    if (assignment && open) {
      setFormData({
        priority: assignment.priority || 'normal',
        dueDate: assignment.dueDate
          ? new Date(assignment.dueDate).toISOString().split('T')[0]
          : '',
        notes: assignment.notes || '',
        hasCustomRenewal: assignment.has_custom_renewal || false,
        customRenewalPeriod: assignment.custom_renewal_period || null,
        customRenewalUnit: assignment.custom_renewal_unit || 'months'
      });
    }
  }, [assignment, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.priority) {
      toast.error('La prioridad es requerida');
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        priority: formData.priority,
        notes: formData.notes || null,
        hasCustomRenewal: formData.hasCustomRenewal,
        customRenewalPeriod: formData.hasCustomRenewal ? formData.customRenewalPeriod : null,
        customRenewalUnit: formData.hasCustomRenewal ? formData.customRenewalUnit : null
      };

      // Solo incluir dueDate si tiene valor
      if (formData.dueDate) {
        updateData.dueDate = formData.dueDate;
      }

      await employeeDocumentService.updateAssignedDocument(assignment.id, updateData);

      toast.success('Documento actualizado correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando documento:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar el documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton={true} className="max-w-2xl p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-semibold">Editar Documento Asignado</DialogTitle>
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
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <DialogDescription className="text-sm text-gray-600">
            Edita la información del documento: <strong>{assignment?.document_type?.name || 'Documento'}</strong>
          </DialogDescription>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-semibold">
              Prioridad *
            </Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {/* Separador visual */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Fecha Límite */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label htmlFor="dueDate" className="text-sm font-semibold">
                Fecha Límite de Entrega
              </Label>
            </div>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Fecha en la que el documento debe ser entregado
            </p>
          </div>

          {/* Separador visual */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Renovación Personalizada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="hasCustomRenewal" className="text-sm font-semibold">
                Configuración de Renovación Personalizada
              </Label>
            </div>

            {/* Mostrar renovación por defecto si existe */}
            {assignment?.has_expiration && !formData.hasCustomRenewal && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  📋 Renovación por defecto: cada {assignment.renewal_period} {
                    assignment.renewal_unit === 'years' ? 'años' :
                    assignment.renewal_unit === 'days' ? 'días' :
                    'meses'
                  }
                </p>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasCustomRenewal}
                onChange={(e) => handleChange('hasCustomRenewal', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Habilitar renovación personalizada para este documento
              </span>
            </label>

            {formData.hasCustomRenewal && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Período de Renovación Personalizado
                  </span>
                </div>

                <div className="flex gap-3">
                  <Input
                    type="number"
                    value={formData.customRenewalPeriod || ''}
                    onChange={(e) => handleChange('customRenewalPeriod', parseInt(e.target.value) || null)}
                    placeholder="Ej: 6"
                    min="1"
                    className="w-32 border-2"
                    disabled={loading}
                  />
                  <select
                    value={formData.customRenewalUnit}
                    onChange={(e) => handleChange('customRenewalUnit', e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  >
                    <option value="days">Días</option>
                    <option value="months">Meses</option>
                    <option value="years">Años</option>
                  </select>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Este documento vencerá cada {formData.customRenewalPeriod || '___'} {
                    formData.customRenewalUnit === 'days' ? 'días' :
                    formData.customRenewalUnit === 'months' ? 'meses' :
                    'años'
                  } después de ser renovado.
                </p>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Notas Adicionales
            </Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Agrega notas o comentarios sobre este documento..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
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
                  Actualizar Documento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAssignedDocumentModal;
