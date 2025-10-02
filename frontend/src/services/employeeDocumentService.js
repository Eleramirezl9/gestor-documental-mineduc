import api from '../lib/api';

/**
 * Servicio para gestión de documentos requeridos de empleados
 * Arquitectura limpia: separación de lógica de negocio de componentes
 */

// ==================== TIPOS DE DOCUMENTOS ====================

/**
 * Obtener catálogo de tipos de documentos
 * @param {Object} filters - Filtros opcionales (category, required)
 * @returns {Promise<Array>} Lista de tipos de documentos
 */
export const getDocumentTypes = async (filters = {}) => {
  try {
    const response = await api.get('/employee-document-requirements/document-types', {
      params: filters
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error obteniendo tipos de documentos:', error);
    throw error;
  }
};

/**
 * Crear nuevo tipo de documento
 * @param {Object} documentType - Datos del tipo de documento
 * @returns {Promise<Object>} Tipo de documento creado
 */
export const createDocumentType = async (documentType) => {
  try {
    const response = await api.post('/employee-document-requirements/document-types', documentType);
    return response.data.data;
  } catch (error) {
    console.error('Error creando tipo de documento:', error);
    throw error;
  }
};

// ==================== PLANTILLAS ====================

/**
 * Obtener plantillas de documentos
 * @returns {Promise<Array>} Lista de plantillas
 */
export const getDocumentTemplates = async () => {
  try {
    const response = await api.get('/employee-document-requirements/templates');
    const templates = response.data.data || [];

    // Transformar estructura: template_documents -> documents con formato correcto
    return templates.map(template => ({
      ...template,
      documents: (template.template_documents || []).map(td => ({
        id: td.document_type?.id,
        documentId: td.document_type?.id,
        document_type_id: td.document_type?.id,
        name: td.document_type?.name,
        category: td.document_type?.category,
        priority: td.priority || 'normal',
        // Mantener toda la info del document_type
        ...td.document_type
      }))
    }));
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    throw error;
  }
};

/**
 * Crear nueva plantilla de documentos
 * @param {Object} template - Datos de la plantilla
 * @returns {Promise<Object>} Plantilla creada
 */
export const createDocumentTemplate = async (template) => {
  try {
    const response = await api.post('/employee-document-requirements/templates', template);
    const newTemplate = response.data.data;

    // Transformar estructura igual que en getDocumentTemplates
    if (newTemplate.template_documents) {
      newTemplate.documents = newTemplate.template_documents.map(td => ({
        id: td.document_type?.id,
        documentId: td.document_type?.id,
        document_type_id: td.document_type?.id,
        name: td.document_type?.name,
        category: td.document_type?.category,
        priority: td.priority || 'normal',
        ...td.document_type
      }));
    }

    return newTemplate;
  } catch (error) {
    console.error('Error creando plantilla:', error);
    throw error;
  }
};

// ==================== ASIGNACIÓN DE DOCUMENTOS ====================

/**
 * Asignar documentos requeridos a un empleado
 * @param {string} employeeId - ID del empleado
 * @param {Array} documents - Lista de documentos a asignar
 * @returns {Promise<Array>} Documentos asignados
 */
export const assignDocumentsToEmployee = async (employeeId, documents) => {
  try {
    const response = await api.post('/employee-document-requirements/assign', {
      employee_id: employeeId,
      documents: documents.map(doc => ({
        document_type_id: doc.documentId || doc.document_type_id || doc.id,
        priority: doc.priority || 'normal',
        due_date: doc.dueDate || doc.due_date || null,
        notes: doc.notes || null
      }))
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error asignando documentos:', error);
    throw error;
  }
};

/**
 * Asignar plantilla completa a un empleado
 * @param {string} employeeId - ID del empleado
 * @param {Object} template - Plantilla con documentos
 * @param {Object} options - Opciones adicionales (due_date, etc)
 * @returns {Promise<Array>} Documentos asignados
 */
export const assignTemplateToEmployee = async (employeeId, template, options = {}) => {
  try {
    // Extraer documentos de la plantilla
    const documents = template.template_documents || template.documents || [];

    const documentsToAssign = documents.map(doc => ({
      document_type_id: doc.document_type?.id || doc.document_type_id || doc.documentId,
      priority: doc.priority || 'normal',
      due_date: options.due_date || null,
      notes: options.notes || `Asignado desde plantilla: ${template.name}`
    }));

    return await assignDocumentsToEmployee(employeeId, documentsToAssign);
  } catch (error) {
    console.error('Error asignando plantilla:', error);
    throw error;
  }
};

// ==================== DOCUMENTOS DEL EMPLEADO ====================

/**
 * Obtener documentos requeridos de un empleado
 * @param {string} employeeId - ID del empleado
 * @returns {Promise<Array>} Lista de documentos requeridos
 */
export const getEmployeeRequiredDocuments = async (employeeId) => {
  try {
    const response = await api.get(`/employee-document-requirements/employee/${employeeId}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error obteniendo documentos del empleado:', error);
    throw error;
  }
};

/**
 * Actualizar documento requerido
 * @param {string} requirementId - ID del requerimiento
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} Documento actualizado
 */
export const updateRequiredDocument = async (requirementId, updates) => {
  try {
    const response = await api.put(`/employee-document-requirements/${requirementId}`, updates);
    return response.data.data;
  } catch (error) {
    console.error('Error actualizando documento:', error);
    throw error;
  }
};

/**
 * Eliminar documento requerido
 * @param {string} requirementId - ID del requerimiento
 * @returns {Promise<void>}
 */
export const deleteRequiredDocument = async (requirementId) => {
  try {
    await api.delete(`/employee-document-requirements/${requirementId}`);
  } catch (error) {
    console.error('Error eliminando documento:', error);
    throw error;
  }
};

// ==================== SUBIDA DE DOCUMENTOS ====================

/**
 * Subir documento de empleado
 * @param {Object} params - Parámetros de subida
 * @param {string} params.employeeId - ID del empleado
 * @param {string} params.requirementId - ID del requerimiento
 * @param {string} params.documentTypeId - ID del tipo de documento
 * @param {File} params.file - Archivo a subir
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise<Object>} Documento subido
 */
export const uploadEmployeeDocument = async ({ employeeId, requirementId, documentTypeId, file }, onProgress) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employee_id', employeeId);
    formData.append('requirement_id', requirementId);
    formData.append('document_type_id', documentTypeId);

    const response = await api.post('/employee-document-requirements/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error subiendo documento:', error);
    throw error;
  }
};

// ==================== ESTADÍSTICAS ====================

/**
 * Obtener estadísticas de documentos requeridos
 * @returns {Promise<Object>} Estadísticas generales
 */
export const getDocumentStatistics = async () => {
  try {
    const response = await api.get('/employee-document-requirements/statistics');
    return response.data.data || {};
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
};

// ==================== UTILIDADES ====================

/**
 * Validar archivo antes de subir
 * @param {File} file - Archivo a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB por defecto
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  } = options;

  // Validar tamaño
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  // Validar tipo
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Formatos permitidos: PDF, JPG, PNG, DOC, DOCX'
    };
  }

  return { valid: true };
};

/**
 * Calcular fecha de vencimiento basado en renovación
 * @param {Object} documentType - Tipo de documento
 * @param {Date} startDate - Fecha de inicio (opcional)
 * @returns {Date|null} Fecha de vencimiento
 */
export const calculateDueDate = (documentType, startDate = new Date()) => {
  if (!documentType.has_expiration || !documentType.renewal_period) {
    return null;
  }

  const date = new Date(startDate);
  const period = documentType.renewal_period;
  const unit = documentType.renewal_unit || 'months';

  if (unit === 'months') {
    date.setMonth(date.getMonth() + period);
  } else if (unit === 'years') {
    date.setFullYear(date.getFullYear() + period);
  } else if (unit === 'days') {
    date.setDate(date.getDate() + period);
  }

  return date;
};

/**
 * Obtener badge de prioridad
 * @param {string} priority - Nivel de prioridad
 * @returns {Object} { label, color, variant }
 */
export const getPriorityBadge = (priority) => {
  const badges = {
    'baja': { label: 'Baja', color: 'bg-gray-100 text-gray-800', variant: 'secondary' },
    'normal': { label: 'Normal', color: 'bg-blue-100 text-blue-800', variant: 'default' },
    'alta': { label: 'Alta', color: 'bg-orange-100 text-orange-800', variant: 'warning' },
    'urgente': { label: 'Urgente', color: 'bg-red-100 text-red-800', variant: 'destructive' }
  };

  return badges[priority] || badges['normal'];
};

/**
 * Obtener badge de estado
 * @param {string} status - Estado del documento
 * @returns {Object} { label, color, icon }
 */
export const getStatusBadge = (status) => {
  const badges = {
    'pendiente': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: 'Clock' },
    'subido': { label: 'Subido', color: 'bg-blue-100 text-blue-800', icon: 'Upload' },
    'aprobado': { label: 'Aprobado', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' },
    'rechazado': { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: 'XCircle' },
    'vencido': { label: 'Vencido', color: 'bg-gray-100 text-gray-800', icon: 'AlertTriangle' }
  };

  return badges[status] || badges['pendiente'];
};

export default {
  // Tipos de documentos
  getDocumentTypes,
  createDocumentType,

  // Plantillas
  getDocumentTemplates,
  createDocumentTemplate,

  // Asignación
  assignDocumentsToEmployee,
  assignTemplateToEmployee,

  // Documentos del empleado
  getEmployeeRequiredDocuments,
  updateRequiredDocument,
  deleteRequiredDocument,

  // Subida de archivos
  uploadEmployeeDocument,

  // Estadísticas
  getDocumentStatistics,

  // Crear nuevos tipos y plantillas
  createDocumentType,
  createTemplate: createDocumentTemplate,

  // Utilidades
  validateFile,
  calculateDueDate,
  getPriorityBadge,
  getStatusBadge
};
