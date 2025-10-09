import api from '../lib/api';

/**
 * Servicio para gestión de renovaciones y vencimientos de documentos
 */

/**
 * Obtener documentos que vencen en X días
 * @param {number} days - Días de anticipación (default: 30)
 * @returns {Promise<Array>} Documentos próximos a vencer
 */
export const getDocumentsExpiringIn = async (days = 30) => {
  try {
    const response = await api.get(`/employee-document-requirements/renewals/expiring?days=${days}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error obteniendo documentos próximos a vencer:', error);
    throw error;
  }
};

/**
 * Obtener documentos ya vencidos
 * @returns {Promise<Array>} Documentos vencidos
 */
export const getExpiredDocuments = async () => {
  try {
    const response = await api.get('/employee-document-requirements/renewals/expired');
    return response.data.data || [];
  } catch (error) {
    console.error('Error obteniendo documentos vencidos:', error);
    throw error;
  }
};

/**
 * Obtener resumen de renovaciones de un empleado
 * @param {string} employeeId - ID del empleado
 * @returns {Promise<Object>} Resumen de renovaciones
 */
export const getEmployeeRenewalSummary = async (employeeId) => {
  try {
    const response = await api.get(`/employee-document-requirements/renewals/summary/${employeeId}`);
    return response.data.data || {};
  } catch (error) {
    console.error('Error obteniendo resumen de renovaciones:', error);
    throw error;
  }
};

/**
 * Crear notificación de renovación
 * @param {Object} notificationData - Datos de la notificación
 * @returns {Promise<Object>} Notificación creada
 */
export const createRenewalNotification = async (notificationData) => {
  try {
    const response = await api.post('/employee-document-requirements/renewals/notify', notificationData);
    return response.data.data;
  } catch (error) {
    console.error('Error creando notificación de renovación:', error);
    throw error;
  }
};

/**
 * Obtener badge de urgencia
 * @param {number} daysUntilExpiration - Días hasta vencimiento
 * @returns {Object} { label, color, urgency }
 */
export const getUrgencyBadge = (daysUntilExpiration) => {
  if (daysUntilExpiration <= 7) {
    return {
      label: 'Urgente',
      color: 'bg-red-100 text-red-800 border-red-300',
      urgency: 'urgent',
      icon: '🔴'
    };
  } else if (daysUntilExpiration <= 15) {
    return {
      label: 'Alta prioridad',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      urgency: 'high',
      icon: '🟠'
    };
  } else {
    return {
      label: 'Próximo a vencer',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      urgency: 'medium',
      icon: '🟡'
    };
  }
};

/**
 * Formatear fecha de vencimiento
 * @param {Date|string} expirationDate - Fecha de vencimiento
 * @returns {string} Fecha formateada
 */
export const formatExpirationDate = (expirationDate) => {
  if (!expirationDate) return 'Sin fecha';

  const date = new Date(expirationDate);
  return date.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default {
  getDocumentsExpiringIn,
  getExpiredDocuments,
  getEmployeeRenewalSummary,
  createRenewalNotification,
  getUrgencyBadge,
  formatExpirationDate
};
