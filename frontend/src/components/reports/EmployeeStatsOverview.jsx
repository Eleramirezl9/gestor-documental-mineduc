import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Users,
  FolderOpen
} from 'lucide-react';

/**
 * Componente que muestra el resumen general de estadísticas de empleados y documentos
 *
 * @param {Object} props
 * @param {Object} props.stats - Objeto con estadísticas generales
 * @param {number} props.totalFolders - Total de folders virtuales (empleados)
 * @param {boolean} props.loading - Indicador de carga
 */
const EmployeeStatsOverview = ({ stats, totalFolders = 0, loading = false }) => {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats || !stats.documents) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay estadísticas disponibles
      </div>
    );
  }

  const documents = stats.documents;

  // Calcular porcentajes para las barras de progreso
  const totalDocs = documents.total || 0;
  const approvedPercentage = totalDocs > 0 ? (documents.approved / totalDocs * 100).toFixed(1) : 0;
  const pendingPercentage = totalDocs > 0 ? (documents.pending / totalDocs * 100).toFixed(1) : 0;
  const rejectedPercentage = totalDocs > 0 ? (documents.rejected / totalDocs * 100).toFixed(1) : 0;
  const expiredPercentage = totalDocs > 0 ? (documents.expired / totalDocs * 100).toFixed(1) : 0;

  const statsCards = [
    {
      title: 'Total de Documentos',
      value: totalDocs,
      subtitle: 'Documentos requeridos en el sistema',
      icon: FileText,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      showProgress: false
    },
    {
      title: 'Documentos Aprobados',
      value: documents.approved || 0,
      subtitle: `${approvedPercentage}% del total`,
      icon: CheckCircle,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      showProgress: true,
      progressColor: 'bg-green-500',
      progressPercentage: approvedPercentage
    },
    {
      title: 'Documentos Pendientes',
      value: (documents.pending || 0) + (documents.submitted || 0),
      subtitle: `${(parseFloat(pendingPercentage) + (totalDocs > 0 ? (documents.submitted / totalDocs * 100) : 0)).toFixed(1)}% del total`,
      icon: Clock,
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      showProgress: true,
      progressColor: 'bg-yellow-500',
      progressPercentage: (parseFloat(pendingPercentage) + (totalDocs > 0 ? (documents.submitted / totalDocs * 100) : 0)).toFixed(1)
    },
    {
      title: 'Documentos Rechazados',
      value: documents.rejected || 0,
      subtitle: `${rejectedPercentage}% del total`,
      icon: XCircle,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      showProgress: true,
      progressColor: 'bg-red-500',
      progressPercentage: rejectedPercentage
    },
    {
      title: 'Documentos Vencidos',
      value: documents.expired || 0,
      subtitle: `${expiredPercentage}% del total`,
      icon: AlertTriangle,
      iconBgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
      showProgress: true,
      progressColor: 'bg-gray-500',
      progressPercentage: expiredPercentage
    },
    {
      title: 'Empleados Activos',
      value: stats.employees?.total || 0,
      subtitle: 'Con documentos asignados',
      icon: Users,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      showProgress: false
    },
    {
      title: 'Folders Virtuales',
      value: totalFolders,
      subtitle: 'Carpetas de empleados disponibles',
      icon: FolderOpen,
      iconBgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      showProgress: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Grid de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.iconBgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {stat.value.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                  {stat.showProgress && (
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.progressColor} transition-all duration-500`}
                          style={{ width: `${Math.min(stat.progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumen rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              {documents.approved || 0} Aprobados
            </Badge>
            <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
              {documents.pending || 0} Pendientes
            </Badge>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
              {documents.submitted || 0} Subidos
            </Badge>
            <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
              {documents.rejected || 0} Rechazados
            </Badge>
            <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50">
              {documents.expired || 0} Vencidos
            </Badge>
            {documents.expiring_soon > 0 && (
              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                {documents.expiring_soon} Por vencer
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeStatsOverview;
