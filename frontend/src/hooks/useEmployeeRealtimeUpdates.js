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
    // console.log('🔔 Nuevo empleado agregado:', payload.new);
    // Solo mostrar toast para nuevos empleados (no para reconexiones)
    toast.success(`Nuevo empleado registrado: ${payload.new.first_name} ${payload.new.last_name}`);
    if (onEmployeeUpdate) {
      onEmployeeUpdate('INSERT', payload.new);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar actualización de empleados
  const handleEmployeeUpdate = useCallback((payload) => {
    // console.log('🔔 Empleado actualizado:', payload.new);
    // No mostrar toast para actualizaciones, solo actualizar datos
    if (onEmployeeUpdate) {
      onEmployeeUpdate('UPDATE', payload.new, payload.old);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar eliminación de empleados
  const handleEmployeeDelete = useCallback((payload) => {
    // console.log('🔔 Empleado eliminado:', payload.old);
    toast.error(`Empleado eliminado: ${payload.old.first_name} ${payload.old.last_name}`);
    if (onEmployeeUpdate) {
      onEmployeeUpdate('DELETE', payload.old);
    }
  }, [onEmployeeUpdate]);

  // Función para manejar cambios en requerimientos de documentos
  const handleRequirementChange = useCallback((payload) => {
    // console.log('🔔 Requerimiento de documento actualizado:', payload);

    // Solo mostrar toasts para cambios importantes (aprobado/rechazado)
    if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old.status) {
      if (payload.new.status === 'approved' || payload.new.status === 'aprobado') {
        toast.success(`Documento aprobado: ${payload.new.document_type}`);
      } else if (payload.new.status === 'rejected' || payload.new.status === 'rechazado') {
        toast.error(`Documento rechazado: ${payload.new.document_type}`);
      }
    }

    if (onRequirementUpdate) {
      onRequirementUpdate(payload.eventType, payload.new || payload.old, payload.old);
    }
  }, [onRequirementUpdate]);

  useEffect(() => {
    // console.log('🔄 Configurando suscripciones en tiempo real para empleados...');

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
        // console.log('📡 Estado de suscripción empleados:', status);
        // NO mostrar toasts de conexión/desconexión para evitar spam en recargas
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
        // console.log('📡 Estado de suscripción requerimientos:', status);
      });

    // Cleanup function
    return () => {
      // console.log('🔄 Cerrando suscripciones en tiempo real...');
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