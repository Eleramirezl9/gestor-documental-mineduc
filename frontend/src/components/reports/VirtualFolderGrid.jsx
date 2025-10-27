import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import VirtualFolderCard from './VirtualFolderCard';
import {
  Search,
  Filter,
  FolderOpen,
  SortAsc,
  SortDesc
} from 'lucide-react';

/**
 * Componente que muestra una grilla de folders virtuales con búsqueda y filtros
 *
 * @param {Object} props
 * @param {Array} props.folders - Array de folders virtuales
 * @param {Function} props.onOpenFolder - Callback cuando se abre un folder
 * @param {Function} props.onDownloadPDF - Callback para descargar PDF
 * @param {boolean} props.loading - Indicador de carga
 */
const VirtualFolderGrid = ({ folders = [], onOpenFolder, onDownloadPDF, loading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, complete, pending, rejected
  const [sortBy, setSortBy] = useState('name'); // name, documents, department
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Filtrar y ordenar folders
  const filteredAndSortedFolders = useMemo(() => {
    let result = [...folders];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(folder =>
        folder.employee.full_name.toLowerCase().includes(term) ||
        folder.employee.employee_id.toLowerCase().includes(term) ||
        folder.employee.department?.toLowerCase().includes(term) ||
        folder.employee.email.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      result = result.filter(folder => {
        const stats = folder.stats;
        switch (filterStatus) {
          case 'complete':
            return stats.approved === stats.total && stats.total > 0;
          case 'pending':
            return stats.pending > 0 || stats.submitted > 0;
          case 'rejected':
            return stats.rejected > 0;
          case 'expired':
            return stats.expired > 0;
          case 'with-documents':
            return stats.approved > 0;
          default:
            return true;
        }
      });
    }

    // Ordenar
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.employee.full_name.localeCompare(b.employee.full_name);
          break;
        case 'documents':
          compareValue = b.stats.total - a.stats.total;
          break;
        case 'department':
          compareValue = (a.employee.department || '').localeCompare(b.employee.department || '');
          break;
        case 'approved':
          compareValue = b.stats.approved - a.stats.approved;
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [folders, searchTerm, filterStatus, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const filterOptions = [
    { value: 'all', label: 'Todos', count: folders.length },
    {
      value: 'complete',
      label: 'Completos',
      count: folders.filter(f => f.stats.approved === f.stats.total && f.stats.total > 0).length
    },
    {
      value: 'pending',
      label: 'En proceso',
      count: folders.filter(f => f.stats.pending > 0 || f.stats.submitted > 0).length
    },
    {
      value: 'rejected',
      label: 'Con rechazos',
      count: folders.filter(f => f.stats.rejected > 0).length
    },
    {
      value: 'expired',
      label: 'Con vencidos',
      count: folders.filter(f => f.stats.expired > 0).length
    },
    {
      value: 'with-documents',
      label: 'Con docs. aprobados',
      count: folders.filter(f => f.stats.approved > 0).length
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Folders Virtuales de Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            <CardTitle>Folders Virtuales de Empleados</CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredAndSortedFolders.length} de {folders.length} folders
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barra de búsqueda y filtros */}
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ID, departamento o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <Button
                key={option.value}
                variant={filterStatus === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(option.value)}
                className="text-xs"
              >
                {option.label}
                <Badge
                  variant={filterStatus === option.value ? 'secondary' : 'outline'}
                  className="ml-2"
                >
                  {option.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ordenar por:</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('name')}
              >
                Nombre
              </Button>
              <Button
                variant={sortBy === 'documents' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('documents')}
              >
                # Documentos
              </Button>
              <Button
                variant={sortBy === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('approved')}
              >
                Aprobados
              </Button>
              <Button
                variant={sortBy === 'department' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('department')}
              >
                Departamento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Grid de folders */}
        {filteredAndSortedFolders.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron folders</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay folders virtuales disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedFolders.map(folder => (
              <VirtualFolderCard
                key={folder.employee.id}
                folder={folder}
                onOpenFolder={onOpenFolder}
                onDownloadPDF={onDownloadPDF}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VirtualFolderGrid;
