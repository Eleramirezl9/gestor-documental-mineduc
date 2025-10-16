import { api } from '../../../lib/api';

export const notificationService = {
  async startService() {
    try {
      const response = await api.post('/api/automated-notifications/start');
      return response.data;
    } catch (error) {
      console.error('Error starting service:', error);
      throw new Error('Error al iniciar el servicio');
    }
  },

  async stopService() {
    try {
      const response = await api.post('/api/automated-notifications/stop');
      return response.data;
    } catch (error) {
      console.error('Error stopping service:', error);
      throw new Error('Error al detener el servicio');
    }
  },

  async getStatus() {
    try {
      const response = await api.get('/api/automated-notifications/status');
      return response.data;
    } catch (error) {
      console.error('Error getting status:', error);
      throw new Error('Error al obtener estado del servicio');
    }
  },

  async sendTestEmail(data) {
    try {
      const response = await api.post('/api/automated-notifications/test-email', data);
      return response.data;
    } catch (error) {
      console.error('Error sending test email:', error);
      throw new Error('Error al enviar email de prueba');
    }
  },

  async getEmailLogs(params = {}) {
    try {
      const response = await api.get('/api/automated-notifications/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting email logs:', error);
      throw new Error('Error al obtener logs de emails');
    }
  }
};