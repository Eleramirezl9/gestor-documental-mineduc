import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { useEmployeeStats } from '../hooks/useEmployeeStats';
import { useEmployeeRealtimeUpdates } from '../hooks/useEmployeeRealtimeUpdates';
import EmployeeStatsOverview from '../components/reports/EmployeeStatsOverview';
import VirtualFolderGrid from '../components/reports/VirtualFolderGrid';
import FolderDocumentPreview from '../components/reports/FolderDocumentPreview';
import { generateEmployeeFolderPDF } from '../components/reports/EmployeeFolderPDFGenerator';
import { RefreshCw, BarChart3 } from 'lucide-react';

/**
 * Página principal de reportes y estadísticas de empleados
 * Muestra estadísticas globales y folders virtuales para cada empleado
 */
const EmployeeReports = () => {
  const { stats, folders, loading, refetch } = useEmployeeStats();
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showFolderPreview, setShowFolderPreview] = useState(false);

  // Configurar actualizaciones en tiempo real
  useEmployeeRealtimeUpdates({
    onEmployeeChange: () => {
      console.log('🔄 Empleado actualizado, recargando estadísticas...');
      refetch();
    },
    onDocumentChange: () => {
      console.log('🔄 Documento actualizado, recargando estadísticas...');
      refetch();
    }
  });

  /**
   * Maneja la apertura de un folder
   */
  const handleOpenFolder = (folder) => {
    setSelectedFolder(folder);
    setShowFolderPreview(true);
  };

  /**
   * Maneja la descarga del PDF de un folder
   */
  const handleDownloadPDF = async (folder) => {
    await generateEmployeeFolderPDF(folder);
  };

  /**
   * Cierra el preview del folder
   */
  const handleClosePreview = () => {
    setShowFolderPreview(false);
    setSelectedFolder(null);
  };

  /**
   * Refresca los datos manualmente
   */
  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reportes y Estadísticas
            </h1>
            <p className="text-muted-foreground">
              Vista general de documentos y folders virtuales de empleados
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas Generales */}
      <EmployeeStatsOverview
        stats={stats}
        totalFolders={folders.length}
        loading={loading}
      />

      {/* Grid de Folders Virtuales */}
      <VirtualFolderGrid
        folders={folders}
        onOpenFolder={handleOpenFolder}
        onDownloadPDF={handleDownloadPDF}
        loading={loading}
      />

      {/* Dialog de Preview de Folder */}
      <FolderDocumentPreview
        open={showFolderPreview}
        onClose={handleClosePreview}
        folder={selectedFolder}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
};

export default EmployeeReports;
