import { useState, useCallback, useEffect } from 'react';
import {
  getDocumentTypes,
  getDocumentTemplates,
  assignDocumentsToEmployee,
  assignTemplateToEmployee,
  getEmployeeRequiredDocuments,
  updateRequiredDocument,
  deleteRequiredDocument,
  uploadEmployeeDocument,
  getDocumentStatistics
} from '../services/employeeDocumentService';
import toast from 'react-hot-toast';

/**
 * Custom Hook para gestión de documentos de empleados
 * Arquitectura limpia: encapsular lógica de estado y efectos
 *
 * @param {string} employeeId - ID del empleado (opcional)
 * @returns {Object} Estado y funciones para gestionar documentos
 */
export const useEmployeeDocuments = (employeeId = null) => {
  // Estados
  const [documentTypes, setDocumentTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ==================== CARGAR CATÁLOGOS ====================

  /**
   * Cargar tipos de documentos disponibles
   */
  const loadDocumentTypes = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const types = await getDocumentTypes(filters);
      setDocumentTypes(types);
      return types;
    } catch (error) {
      console.error('Error cargando tipos de documentos:', error);
      toast.error('Error al cargar tipos de documentos');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar plantillas de documentos
   */
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const templateList = await getDocumentTemplates();
      setTemplates(templateList);
      return templateList;
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar plantillas');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar documentos de un empleado específico
   */
  const loadEmployeeDocuments = useCallback(async (empId = employeeId) => {
    if (!empId) {
      console.warn('No se proporcionó ID de empleado');
      return [];
    }

    try {
      setLoading(true);
      const docs = await getEmployeeRequiredDocuments(empId);
      setEmployeeDocuments(docs);
      return docs;
    } catch (error) {
      console.error('Error cargando documentos del empleado:', error);
      toast.error('Error al cargar documentos del empleado');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  /**
   * Cargar estadísticas generales
   */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await getDocumentStatistics();
      setStatistics(stats);
      return stats;
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      throw error;
    }
  }, []);

  // ==================== ASIGNACIÓN DE DOCUMENTOS ====================

  /**
   * Asignar documentos individuales a un empleado
   */
  const assignDocuments = useCallback(async (empId, documents) => {
    try {
      setLoading(true);
      const assigned = await assignDocumentsToEmployee(empId, documents);

      toast.success(`${assigned.length} documento(s) asignado(s) correctamente`);

      // Recargar documentos del empleado si es el actual
      if (empId === employeeId) {
        await loadEmployeeDocuments(empId);
      }

      return assigned;
    } catch (error) {
      console.error('Error asignando documentos:', error);
      toast.error('Error al asignar documentos');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [employeeId, loadEmployeeDocuments]);

  /**
   * Asignar plantilla completa a un empleado
   */
  const assignTemplate = useCallback(async (empId, template, options = {}) => {
    try {
      setLoading(true);
      const assigned = await assignTemplateToEmployee(empId, template, options);

      toast.success(`Plantilla "${template.name}" asignada correctamente`);

      // Recargar documentos del empleado
      if (empId === employeeId) {
        await loadEmployeeDocuments(empId);
      }

      return assigned;
    } catch (error) {
      console.error('Error asignando plantilla:', error);
      toast.error('Error al asignar plantilla');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [employeeId, loadEmployeeDocuments]);

  // ==================== GESTIÓN DE DOCUMENTOS ====================

  /**
   * Actualizar documento requerido
   */
  const updateDocument = useCallback(async (requirementId, updates) => {
    try {
      setLoading(true);
      const updated = await updateRequiredDocument(requirementId, updates);

      toast.success('Documento actualizado correctamente');

      // Actualizar en el estado local
      setEmployeeDocuments(prev =>
        prev.map(doc => (doc.id === requirementId ? { ...doc, ...updated } : doc))
      );

      return updated;
    } catch (error) {
      console.error('Error actualizando documento:', error);
      toast.error('Error al actualizar documento');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar documento requerido
   */
  const deleteDocument = useCallback(async (requirementId) => {
    try {
      setLoading(true);
      await deleteRequiredDocument(requirementId);

      toast.success('Documento eliminado correctamente');

      // Eliminar del estado local
      setEmployeeDocuments(prev => prev.filter(doc => doc.id !== requirementId));
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar documento');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== SUBIDA DE ARCHIVOS ====================

  /**
   * Subir documento de empleado
   */
  const uploadDocument = useCallback(async (params) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const uploaded = await uploadEmployeeDocument(params, (progress) => {
        setUploadProgress(progress);
      });

      toast.success('Documento subido correctamente');

      // Recargar documentos del empleado
      if (params.employeeId === employeeId) {
        await loadEmployeeDocuments(params.employeeId);
      }

      return uploaded;
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error('Error al subir documento');
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [employeeId, loadEmployeeDocuments]);

  // ==================== FILTROS Y BÚSQUEDAS ====================

  /**
   * Filtrar documentos por estado
   */
  const filterByStatus = useCallback((status) => {
    return employeeDocuments.filter(doc => doc.status === status);
  }, [employeeDocuments]);

  /**
   * Filtrar documentos por prioridad
   */
  const filterByPriority = useCallback((priority) => {
    return employeeDocuments.filter(doc => doc.priority === priority);
  }, [employeeDocuments]);

  /**
   * Obtener documentos vencidos
   */
  const getExpiredDocuments = useCallback(() => {
    const today = new Date();
    return employeeDocuments.filter(doc => {
      if (!doc.due_date) return false;
      return new Date(doc.due_date) < today && doc.status !== 'aprobado';
    });
  }, [employeeDocuments]);

  /**
   * Obtener documentos por vencer (próximos N días)
   */
  const getExpiringDocuments = useCallback((days = 30) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return employeeDocuments.filter(doc => {
      if (!doc.due_date) return false;
      const dueDate = new Date(doc.due_date);
      return dueDate >= today && dueDate <= futureDate && doc.status !== 'aprobado';
    });
  }, [employeeDocuments]);

  // ==================== ESTADÍSTICAS DEL EMPLEADO ====================

  /**
   * Calcular estadísticas de documentos del empleado
   */
  const getEmployeeStatistics = useCallback(() => {
    const total = employeeDocuments.length;
    const pendiente = employeeDocuments.filter(d => d.status === 'pendiente').length;
    const subido = employeeDocuments.filter(d => d.status === 'subido').length;
    const aprobado = employeeDocuments.filter(d => d.status === 'aprobado').length;
    const rechazado = employeeDocuments.filter(d => d.status === 'rechazado').length;
    const vencido = getExpiredDocuments().length;

    const completionRate = total > 0 ? Math.round((aprobado / total) * 100) : 0;

    return {
      total,
      pendiente,
      subido,
      aprobado,
      rechazado,
      vencido,
      completionRate
    };
  }, [employeeDocuments, getExpiredDocuments]);

  // ==================== EFECTOS ====================

  // Cargar catálogos al montar el componente
  useEffect(() => {
    loadDocumentTypes();
    loadTemplates();
  }, [loadDocumentTypes, loadTemplates]);

  // Cargar documentos del empleado si se proporciona ID
  useEffect(() => {
    if (employeeId) {
      loadEmployeeDocuments(employeeId);
    }
  }, [employeeId, loadEmployeeDocuments]);

  // ==================== RETURN ====================

  return {
    // Estados
    documentTypes,
    templates,
    employeeDocuments,
    statistics,
    loading,
    uploading,
    uploadProgress,

    // Funciones de carga
    loadDocumentTypes,
    loadTemplates,
    loadEmployeeDocuments,
    loadStatistics,

    // Asignación
    assignDocuments,
    assignTemplate,

    // Gestión
    updateDocument,
    deleteDocument,

    // Subida de archivos
    uploadDocument,

    // Filtros
    filterByStatus,
    filterByPriority,
    getExpiredDocuments,
    getExpiringDocuments,

    // Estadísticas
    getEmployeeStatistics
  };
};

export default useEmployeeDocuments;
