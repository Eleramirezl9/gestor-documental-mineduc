import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Hook personalizado para manejar actualizaciones en tiempo real de empleados
 * Usa Supabase Realtime para notificar cambios en empleados y requerimientos
 */
export const useEmployeeRealtimeUpdates = (onEmployeeUpdate, onRequirementUpdate) => {
  // Función para manejar inserción de empleados
  const handleEmployeeInsert = useCallback((payload) => {
    console.log('🔔 Nuevo empleado agregado:', payload.new);
    toast.success(`Nuevo empleado registrado: ${payload.new.first_name} ${payload.new.last_name}`);
    if (onEmployeeUpdate) {
      onEmployeeUpdate('INSERT', payload.new);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar actualización de empleados
  const handleEmployeeUpdate = useCallback((payload) => {
    console.log('🔔 Empleado actualizado:', payload.new);
    toast(`Empleado actualizado: ${payload.new.first_name} ${payload.new.last_name}`, { icon: 'ℹ️' });
    if (onEmployeeUpdate) {
      onEmployeeUpdate('UPDATE', payload.new, payload.old);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar eliminación de empleados
  const handleEmployeeDelete = useCallback((payload) => {
    console.log('🔔 Empleado eliminado:', payload.old);
    toast.error(`Empleado eliminado: ${payload.old.first_name} ${payload.old.last_name}`);
    if (onEmployeeUpdate) {
      onEmployeeUpdate('DELETE', payload.old);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar cambios en requerimientos de documentos
  const handleRequirementChange = useCallback((payload) => {
    console.log('🔔 Requerimiento de documento actualizado:', payload);

    let message = '';
    switch (payload.eventType) {
      case 'INSERT':
        message = `Nuevo requerimiento: ${payload.new.document_type}`;
        toast(message, { icon: 'ℹ️' });
        break;
      case 'UPDATE':
        if (payload.new.status !== payload.old.status) {
          const statusMessages = {
            pending: 'pendiente',
            submitted: 'enviado',
            approved: 'aprobado',
            rejected: 'rechazado',
            expired: 'vencido'
          };
          message = `Requerimiento ${statusMessages[payload.new.status]}: ${payload.new.document_type}`;
          toast(message, { icon: 'ℹ️' });
        }
        break;
      case 'DELETE':
        message = `Requerimiento eliminado: ${payload.old.document_type}`;
        toast.error(message);
        break;
    }

    if (onRequirementUpdate) {
      onRequirementUpdate(payload.eventType, payload.new || payload.old, payload.old);
    }
  }, [onRequirementUpdate]);

  useEffect(() => {
    console.log('🔄 Configurando suscripciones en tiempo real para empleados...');

    // Suscripción a cambios en empleados
    const employeeSubscription = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employees'
        },
        handleEmployeeInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees'
        },
        handleEmployeeUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'employees'
        },
        handleEmployeeDelete
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción empleados:', status);
        if (status === 'SUBSCRIBED') {
          toast.success('Conectado a actualizaciones en tiempo real');
        } else if (status === 'CLOSED') {
          toast.error('Conexión en tiempo real cerrada');
        }
      });

    // Suscripción a cambios en requerimientos de documentos
    const requirementSubscription = supabase
      .channel('employee-requirements-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos
          schema: 'public',
          table: 'employee_document_requirements'
        },
        handleRequirementChange
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción requerimientos:', status);
      });

    // Cleanup function
    return () => {
      console.log('🔄 Cerrando suscripciones en tiempo real...');
      employeeSubscription.unsubscribe();
      requirementSubscription.unsubscribe();
    };
  }, [handleEmployeeInsert, handleEmployeeUpdate, handleEmployeeDelete, handleRequirementChange]);

  // Función para enviar una actualización manual (útil para testing)
  const sendTestUpdate = useCallback(() => {
    toast('Enviando actualización de prueba...', { icon: 'ℹ️' });
    // Esta función puede usarse para testing o para forzar una actualización
    if (onEmployeeUpdate) {
      onEmployeeUpdate('TEST', {
        id: 'test',
        first_name: 'Test',
        last_name: 'User',
        department: 'Testing'
      });
    }
  }, [onEmployeeUpdate]);

  return {
    sendTestUpdate
  };
};

export default useEmployeeRealtimeUpdates;