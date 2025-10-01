import axios from 'axios'
import { supabase } from './supabase'

// Configuración base de la API
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL_PRODUCTION || 'https://gestor-documental-mineduc-backend.onrender.com')
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')

// Debug para verificar la URL en producción
console.log('🔧 API Configuration:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE
})

// Sistema de caché simple en memoria
const cache = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos

// Función para obtener datos del caché
const getCachedData = (key) => {
  const cached = cache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }

  return cached.data
}

// Función para guardar en caché
const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

// Crear instancia de axios
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000, // Reducido de 30s a 10s para respuestas más rápidas
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, cerrar sesión
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Funciones de la API

// Autenticación
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
}

// Usuarios con caché
export const usersAPI = {
  getAll: async (params) => {
    const cacheKey = `users_${JSON.stringify(params || {})}`
    const cached = getCachedData(cacheKey)
    if (cached) return { data: cached }

    const response = await api.get('/users', { params })
    setCachedData(cacheKey, response.data)
    return response
  },
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => {
    cache.clear() // Limpiar caché al crear
    return api.post('/users', userData)
  },
  update: (id, userData) => {
    cache.clear() // Limpiar caché al actualizar
    return api.put(`/users/${id}`, userData)
  },
  delete: (id) => {
    cache.clear() // Limpiar caché al eliminar
    return api.delete(`/users/${id}`)
  },
  toggleStatus: (id) => {
    cache.clear()
    return api.put(`/users/${id}/toggle-status`)
  },
  invite: (inviteData) => api.post('/users/invite', inviteData),
  getStats: async () => {
    const cacheKey = 'users_stats'
    const cached = getCachedData(cacheKey)
    if (cached) return { data: cached }

    const response = await api.get('/users/stats/overview')
    setCachedData(cacheKey, response.data)
    return response
  },
}

// Documentos con caché
export const documentsAPI = {
  getAll: async (params) => {
    const cacheKey = `documents_${JSON.stringify(params || {})}`
    const cached = getCachedData(cacheKey)
    if (cached) return { data: cached }

    const response = await api.get('/documents', { params })
    setCachedData(cacheKey, response.data)
    return response
  },
  getById: (id) => api.get(`/documents/${id}`),
  getByUser: (userId) => api.get(`/documents/user/${userId}`),
  create: (documentData) => {
    cache.clear()
    return api.post('/documents', documentData)
  },
  update: (id, documentData) => {
    cache.clear()
    return api.put(`/documents/${id}`, documentData)
  },
  delete: (id) => {
    cache.clear()
    return api.delete(`/documents/${id}`)
  },
  upload: (formData) => {
    cache.clear()
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadToDocument: (id, formData) => {
    cache.clear()
    return api.post(`/documents/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  download: (id) => api.get(`/documents/${id}/download`),
  getDownloadUrl: (id) => api.get(`/documents/${id}/download`),
  getStats: async () => {
    const cacheKey = 'documents_stats'
    const cached = getCachedData(cacheKey)
    if (cached) return { data: cached }

    const response = await api.get('/documents/stats/overview')
    setCachedData(cacheKey, response.data)
    return response
  },
}

// Flujos de trabajo con caché
export const workflowsAPI = {
  getAll: (params) => api.get('/workflows', { params }),
  getById: (id) => api.get(`/workflows/${id}`),
  create: (workflowData) => {
    cache.clear()
    return api.post('/workflows', workflowData)
  },
  update: (id, workflowData) => {
    cache.clear()
    return api.put(`/workflows/${id}`, workflowData)
  },
  approve: (id, approvalData) => {
    cache.clear()
    return api.post(`/workflows/${id}/approve`, approvalData)
  },
  reject: (id, rejectionData) => {
    cache.clear()
    return api.post(`/workflows/${id}/reject`, rejectionData)
  },
  getStats: async () => {
    const cacheKey = 'workflows_stats'
    const cached = getCachedData(cacheKey)
    if (cached) return { data: cached }

    const response = await api.get('/workflows/stats/overview')
    setCachedData(cacheKey, response.data)
    return response
  },
}


// Reportes
export const reportsAPI = {
  getDocumentStats: (period) => api.get('/reports/documents', { params: { period } }),
  getUserStats: (period) => api.get('/reports/users', { params: { period } }),
  getActivityStats: (period) => api.get('/reports/activity', { params: { period } }),
  getWorkflowStats: (period) => api.get('/reports/workflows', { params: { period } }),
  getUserActivity: (params) => api.get('/reports/user-activity', { params }),
  exportDocuments: (params) => api.get('/reports/export/documents', { 
    params, 
    responseType: 'blob' 
  }),
  exportAudit: (params) => api.get('/reports/export/audit', { 
    params, 
    responseType: 'blob' 
  }),
}

// Auditoría
export const auditAPI = {
  getLogs: (params) => api.get('/audit', { params }),
  getStats: (params) => api.get('/audit/stats', { params }),
  export: (params) => api.get('/audit/export', { 
    params, 
    responseType: 'blob' 
  }),
}

// Configuración
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (settings) => api.put('/settings', settings),
  reset: () => api.post('/settings/reset'),
  getSystemStatus: () => api.get('/settings/system-status'),
}

// Notificaciones
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  create: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getStats: () => api.get('/notifications/stats'),
  
  // Funciones de aprobación (solo admins)
  getPendingApproval: () => api.get('/notifications/pending-approval'),
  approve: (id) => api.put(`/notifications/${id}/approve`),
  reject: (id, reason) => api.put(`/notifications/${id}/reject`, { reason }),
  getAdminStats: () => api.get('/notifications/admin/stats'),
}

// Gestión de Documentos Requeridos
export const documentRequirementsAPI = {
  // Para usuarios regulares
  getMyRequirements: () => api.get('/document-requirements/my-requirements'),
  getPendingDocuments: () => api.get('/document-requirements/pending'),
  getExpiringDocuments: () => api.get('/document-requirements/expiring'),
  uploadDocument: (requirementId, formData) => api.post(`/document-requirements/${requirementId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Para administradores
  getDocumentTypes: () => api.get('/document-requirements/types'),
  createDocumentType: (typeData) => api.post('/document-requirements/types', typeData),
  updateDocumentType: (id, typeData) => api.put(`/document-requirements/types/${id}`, typeData),
  deleteDocumentType: (id) => api.delete(`/document-requirements/types/${id}`),
  
  getGlobalSummary: () => api.get('/document-requirements/summary/global'),
  getDepartmentSummary: (department) => api.get(`/document-requirements/summary/department/${department}`),
  getAllDepartmentSummaries: () => api.get('/document-requirements/summary/departments'),
  getAllUserRequirements: (params) => api.get('/document-requirements/all', { params }),
  
  // Asignar documentos a usuarios
  assignDocumentToUser: (assignmentData) => api.post('/document-requirements/assign', assignmentData),
  assignDocumentToDepartment: (assignmentData) => api.post('/document-requirements/assign-department', assignmentData),
  
  // Recordatorios
  sendReminder: (requirementId) => api.post(`/document-requirements/${requirementId}/reminder`),
  processAllReminders: () => api.post('/document-requirements/process-reminders'),
}

// Gestión de Empleados
export const employeesAPI = {
  // Obtener próximo ID disponible
  getNextId: () => api.get('/employee-documents/next-id'),

  // Registrar nuevo empleado
  register: (employeeData) => api.post('/employee-documents/register', employeeData),

  // Obtener lista de empleados
  getAll: (filters) => api.get('/employee-documents/employees', { params: filters }),

  // Obtener estadísticas
  getStats: () => api.get('/employee-documents/stats'),

  // Obtener documentos por vencer
  getExpiringDocuments: (days) => api.get(`/employee-documents/expiring?days=${days || 30}`),
}

export default api

