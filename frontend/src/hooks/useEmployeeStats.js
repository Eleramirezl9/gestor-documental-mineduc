import { useState, useEffect, useCallback } from 'react';
import { employeesAPI } from '../lib/api';
import { toast } from 'react-hot-toast';

/**
 * Hook personalizado para obtener y gestionar estadísticas de empleados y documentos
 *
 * @returns {Object} Estado y métodos para estadísticas
 * @property {Object} stats - Estadísticas generales (empleados y documentos)
 * @property {Array} folders - Array de folders virtuales por empleado
 * @property {boolean} loading - Estado de carga
 * @property {Error|null} error - Error si ocurre
 * @property {Function} refetch - Función para refrescar los datos
 */
export const useEmployeeStats = () => {
  const [stats, setStats] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtiene las estadísticas generales del sistema
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await employeesAPI.getStats();

      if (response.data && response.data.success) {
        setStats(response.data.stats);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      setError(err);
      toast.error('Error al cargar estadísticas');
    }
  }, []);

  /**
   * Obtiene los folders virtuales de todos los empleados
   */
  const fetchVirtualFolders = useCallback(async () => {
    try {
      const response = await employeesAPI.getVirtualFolders();

      if (response.data && response.data.success) {
        setFolders(response.data.folders);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err) {
      console.error('Error al obtener folders virtuales:', err);
      setError(err);
      toast.error('Error al cargar folders virtuales');
    }
  }, []);

  /**
   * Carga todos los datos en paralelo
   */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchStats(),
        fetchVirtualFolders()
      ]);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchVirtualFolders]);

  /**
   * Función para refrescar todos los datos
   */
  const refetch = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    stats,
    folders,
    loading,
    error,
    refetch
  };
};

export default useEmployeeStats;
