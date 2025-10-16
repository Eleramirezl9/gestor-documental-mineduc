import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { notificationService } from '../services/notificationService';

export const useNotificationAutomation = () => {
  const [systemStatus, setSystemStatus] = useState({
    serviceActive: false,
    aiAvailable: true,
    emailConfigured: true,
    processCount: 0,
    aiProvider: 'Groq',
    emailProvider: 'Resend'
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: new Date(),
      recipient: 'juan.perez@mineduc.gob.gt',
      subject: 'Recordatorio: Documento por vencer',
      type: 'reminder',
      status: 'delivered'
    },
    {
      id: 2,
      timestamp: new Date(),
      recipient: 'maria.garcia@mineduc.gob.gt',
      subject: 'Bienvenido al sistema',
      type: 'welcome',
      status: 'opened'
    }
  ]);

  const handleToggleService = useCallback(async () => {
    setIsLoading(true);
    try {
      if (systemStatus.serviceActive) {
        await notificationService.stopService();
      } else {
        await notificationService.startService();
      }

      setSystemStatus(prev => ({
        ...prev,
        serviceActive: !prev.serviceActive
      }));
      
      toast.success(
        systemStatus.serviceActive 
          ? 'Servicio detenido correctamente' 
          : 'Servicio iniciado correctamente'
      );
    } catch (error) {
      console.error('Error toggling service:', error);
      toast.error('Error al cambiar el estado del servicio');
    } finally {
      setIsLoading(false);
    }
  }, [systemStatus.serviceActive]);

  const handleRefreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await notificationService.getStatus();
      setSystemStatus(data);
      toast.success('Estado actualizado correctamente');
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateMessage = useCallback(async ({ messageType, messageStyle }) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para generar el mensaje con IA
      toast.success('Mensaje generado correctamente');
    } catch (error) {
      console.error('Error generating message:', error);
      toast.error('Error al generar el mensaje');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePreviewMessage = useCallback(async ({ messageType, messageStyle }) => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para previsualizar el mensaje
      toast.success('Vista previa generada');
    } catch (error) {
      console.error('Error previewing message:', error);
      toast.error('Error al generar la vista previa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSendTest = useCallback(async ({ messageType, messageStyle, recipient }) => {
    setIsLoading(true);
    try {
      const result = await notificationService.sendTestEmail({
        to: recipient,
        messageType,
        messageStyle
      });

      setLogs(prev => ([{
        id: Date.now(),
        timestamp: new Date(),
        recipient,
        subject: 'Email de prueba',
        type: messageType,
        status: 'delivered'
      }, ...prev]));

      toast.success('Email de prueba enviado correctamente');
      return result;
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Error al enviar el email de prueba');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para obtener los logs actualizados
      toast.success('Logs actualizados correctamente');
    } catch (error) {
      console.error('Error refreshing logs:', error);
      toast.error('Error al actualizar los logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExportLogs = useCallback(async () => {
    try {
      // Aquí iría la lógica para exportar los logs
      toast.success('Logs exportados correctamente');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Error al exportar los logs');
    }
  }, []);

  // Cargar estado inicial
  useEffect(() => {
    handleRefreshStatus();
    handleRefreshLogs();
  }, [handleRefreshStatus, handleRefreshLogs]);

  return {
    systemStatus,
    handleToggleService,
    handleRefreshStatus,
    handleGenerateMessage,
    handlePreviewMessage,
    handleSendTest,
    handleRefreshLogs,
    handleExportLogs,
    isLoading,
    logs
  };
};