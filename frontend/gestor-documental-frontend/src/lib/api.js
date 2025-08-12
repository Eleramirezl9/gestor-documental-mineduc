import axios from 'axios'
import { supabase } from './supabase'

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Crear instancia de axios
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
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

// Usuarios
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
}

// Documentos
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (documentData) => api.post('/documents', documentData),
  update: (id, documentData) => api.put(`/documents/${id}`, documentData),
  delete: (id) => api.delete(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  getStats: () => api.get('/documents/stats/overview'),
}

// Flujos de trabajo
export const workflowsAPI = {
  getAll: (params) => api.get('/workflows', { params }),
  getById: (id) => api.get(`/workflows/${id}`),
  create: (workflowData) => api.post('/workflows', workflowData),
  update: (id, workflowData) => api.put(`/workflows/${id}`, workflowData),
  approve: (id, approvalData) => api.post(`/workflows/${id}/approve`, approvalData),
  reject: (id, rejectionData) => api.post(`/workflows/${id}/reject`, rejectionData),
  getStats: () => api.get('/workflows/stats/overview'),
}

// Notificaciones
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
}

// Reportes
export const reportsAPI = {
  getDocumentStats: (params) => api.get('/reports/documents', { params }),
  getUserActivity: (params) => api.get('/reports/user-activity', { params }),
  getWorkflowStats: (params) => api.get('/reports/workflows', { params }),
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

export default api

