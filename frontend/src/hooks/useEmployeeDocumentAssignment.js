/**
 * Hook personalizado para gestionar asignación de documentos a empleados
 * Conecta con API real y maneja estado local
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  getDocumentTypes,
  getDocumentTemplates,
  getEmployeeRequiredDocuments,
  assignDocumentsToEmployee,
  assignTemplateToEmployee,
  updateRequiredDocument,
  deleteRequiredDocument
} from '../services/employeeDocumentService';

export const useEmployeeDocumentAssignment = (employeeId) => {
  // Estado para tipos de documentos disponibles
  const [allAvailableDocuments, setAllAvailableDocuments] = useState([]);

  // Estado para plantillas disponibles
  const [documentTemplates, setDocumentTemplates] = useState([]);

  // Estado para documentos ya asignados al empleado
  const [assignedDocuments, setAssignedDocuments] = useState([]);

  // Estado para items de documentos en construcción (antes de guardar)
  const [documentItems, setDocumentItems] = useState([]);

  // Estado de carga
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  /**
   * Cargar tipos de documentos disponibles desde API
   */
  const loadDocumentTypes = useCallback(async () => {
    try {
      setLoading(true);
      const types = await getDocumentTypes();
      setAllAvailableDocuments(types);
    } catch (error) {
      console.error('Error cargando tipos de documentos:', error);
      toast.error('Error al cargar tipos de documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar plantillas disponibles desde API
   */
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const templates = await getDocumentTemplates();
      setDocumentTemplates(templates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  /**
   * Cargar documentos ya asignados al empleado desde API
   */
  const loadAssignedDocuments = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoadingAssigned(true);
      const docs = await getEmployeeRequiredDocuments(employeeId);

      // Cargar los document types si no están cargados
      if (allAvailableDocuments.length === 0) {
        await loadDocumentTypes();
      }

      // Transformar formato de API a formato usado en el componente
      // La tabla usa 'document_type' (string) no 'document_type_id' (UUID)
      const transformed = docs.map(doc => {
        // Buscar el documento type por nombre
        const docType = allAvailableDocuments.find(
          dt => dt.name === doc.document_type
        );

        // Mapear prioridad del backend (high/medium/low) al frontend (urgente/alta/normal/baja)
        const priorityMap = {
          'high': 'urgente',
          'medium': 'normal',
          'low': 'baja'
        };

        return {
          id: doc.id,
          documentId: docType?.id || '', // Usar el ID del documento type encontrado
          documentName: doc.document_type, // Guardar el nombre también
          priority: priorityMap[doc.priority] || 'normal',
          dueDate: doc.required_date, // La tabla usa 'required_date' no 'due_date'
          status: doc.status || 'pending',
          notes: doc.description || '', // La tabla usa 'description' no 'notes'
          assignedAt: doc.created_at,
          uploadDate: doc.upload_date,
          fileName: doc.file_name,
          fileUrl: doc.file_url,
          // Campos de renovación personalizada del assignment
          has_custom_renewal: doc.has_custom_renewal,
          custom_renewal_period: doc.custom_renewal_period,
          custom_renewal_unit: doc.custom_renewal_unit,
          // Campos de renovación del tipo de documento
          has_expiration: docType?.has_expiration,
          renewal_period: docType?.renewal_period,
          renewal_unit: docType?.renewal_unit
        };
      });

      setAssignedDocuments(transformed);
    } catch (error) {
      console.error('Error cargando documentos asignados:', error);
      toast.error('Error al cargar documentos asignados');
    } finally {
      setLoadingAssigned(false);
    }
  }, [employeeId, allAvailableDocuments, loadDocumentTypes]);

  /**
   * Agregar un nuevo item de documento (local, no guarda)
   */
  const handleAddDocumentItem = useCallback(() => {
    const newItem = {
      id: Date.now().toString(),
      documentId: '',
      priority: 'normal',
      dueDate: '',
      notes: ''
    };
    setDocumentItems(prev => [...prev, newItem]);
  }, []);

  /**
   * Actualizar un item de documento (local, no guarda)
   */
  const handleUpdateDocumentItem = useCallback((id, field, value) => {
    setDocumentItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, []);

  /**
   * Eliminar un item de documento (local, no guarda)
   */
  const handleRemoveDocumentItem = useCallback((id) => {
    setDocumentItems(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Aplicar una plantilla (carga los documentos de la plantilla en documentItems)
   */
  const handleApplyTemplate = useCallback((template) => {
    if (!template || !template.documents) {
      toast.error('Plantilla inválida');
      return;
    }

    const templateItems = template.documents.map((doc, index) => ({
      id: `template-${Date.now()}-${index}`,
      documentId: doc.id || doc.documentId || doc.document_type_id,
      priority: doc.priority || 'normal',
      dueDate: doc.dueDate || doc.due_date || '',
      notes: doc.notes || ''
    }));

    setDocumentItems(templateItems);
    toast.success(`Plantilla "${template.name}" aplicada`);
  }, []);

  /**
   * Asignar directamente una plantilla completa al empleado (API)
   */
  const handleAssignTemplateDirectly = useCallback(async (templateId) => {
    if (!employeeId) {
      toast.error('No hay empleado seleccionado');
      return false;
    }

    try {
      setLoading(true);
      await assignTemplateToEmployee(employeeId, templateId);
      toast.success('Plantilla asignada correctamente');

      // Recargar documentos asignados
      await loadAssignedDocuments();

      return true;
    } catch (error) {
      console.error('Error asignando plantilla:', error);
      toast.error(error.response?.data?.message || 'Error al asignar plantilla');
      return false;
    } finally {
      setLoading(false);
    }
  }, [employeeId, loadAssignedDocuments]);

  /**
   * Guardar asignación de documentos (API)
   */
  const handleSaveDocumentAssignment = useCallback(async () => {
    if (!employeeId) {
      toast.error('No hay empleado seleccionado');
      return false;
    }

    if (documentItems.length === 0) {
      toast.error('No hay documentos para asignar');
      return false;
    }

    // Validar que todos los items tengan un documento seleccionado
    const invalidItems = documentItems.filter(item => !item.documentId);
    if (invalidItems.length > 0) {
      toast.error('Todos los documentos deben tener un tipo seleccionado');
      return false;
    }

    try {
      setLoading(true);

      // Transformar formato para la API
      const documents = documentItems.map(item => ({
        document_type_id: item.documentId,
        priority: item.priority || 'normal',
        due_date: item.dueDate || null,
        notes: item.notes || null
      }));

      await assignDocumentsToEmployee(employeeId, documents);

      toast.success(`${documentItems.length} documento(s) asignado(s) correctamente`);

      // Limpiar items locales
      setDocumentItems([]);

      // Recargar documentos asignados
      await loadAssignedDocuments();

      return true;
    } catch (error) {
      console.error('Error asignando documentos:', error);
      toast.error(error.response?.data?.message || 'Error al asignar documentos');
      return false;
    } finally {
      setLoading(false);
    }
  }, [employeeId, documentItems, loadAssignedDocuments]);

  /**
   * Actualizar un documento ya asignado (API)
   */
  const handleUpdateAssignedDocument = useCallback(async (documentId, updates) => {
    try {
      await updateRequiredDocument(documentId, updates);
      toast.success('Documento actualizado correctamente');

      // Recargar documentos asignados
      await loadAssignedDocuments();

      return true;
    } catch (error) {
      console.error('Error actualizando documento:', error);
      toast.error('Error al actualizar documento');
      return false;
    }
  }, [loadAssignedDocuments]);

  /**
   * Eliminar un documento asignado (API)
   */
  const handleDeleteAssignedDocument = useCallback(async (documentId) => {
    try {
      await deleteRequiredDocument(documentId);
      toast.success('Documento eliminado correctamente');

      // Recargar documentos asignados
      await loadAssignedDocuments();

      return true;
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar documento');
      return false;
    }
  }, [loadAssignedDocuments]);

  /**
   * Auto-cargar datos al montar o cuando cambia employeeId
   */
  useEffect(() => {
    loadDocumentTypes();
    loadTemplates();
  }, [loadDocumentTypes, loadTemplates]);

  useEffect(() => {
    if (employeeId) {
      loadAssignedDocuments();
    }
  }, [employeeId, loadAssignedDocuments]);

  return {
    // Estado
    allAvailableDocuments,
    documentTemplates,
    assignedDocuments,
    documentItems,
    loading,
    loadingTemplates,
    loadingAssigned,

    // Funciones para tipos de documentos
    loadDocumentTypes,

    // Funciones para plantillas
    loadTemplates,
    handleApplyTemplate,
    handleAssignTemplateDirectly,

    // Funciones para items locales (antes de guardar)
    handleAddDocumentItem,
    handleUpdateDocumentItem,
    handleRemoveDocumentItem,
    setDocumentItems,

    // Funciones para asignación (API)
    handleSaveDocumentAssignment,

    // Funciones para documentos asignados
    loadAssignedDocuments,
    handleUpdateAssignedDocument,
    handleDeleteAssignedDocument
  };
};
