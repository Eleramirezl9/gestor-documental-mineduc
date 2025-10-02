import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Package,
  Plus,
  X
} from 'lucide-react';
import { useEmployeeDocuments } from '../../hooks/useEmployeeDocuments';
import { getPriorityBadge, calculateDueDate } from '../../services/employeeDocumentService';

/**
 * Modal para asignar documentos requeridos a un empleado
 * @param {Object} props
 * @param {boolean} props.open - Estado del modal
 * @param {Function} props.onOpenChange - Función para cambiar estado
 * @param {Object} props.employee - Empleado seleccionado
 * @param {Function} props.onAssigned - Callback después de asignar
 */
const DocumentAssignmentModal = ({ open, onOpenChange, employee, onAssigned }) => {
  const {
    documentTypes,
    templates,
    loading,
    assignDocuments,
    assignTemplate
  } = useEmployeeDocuments(employee?.employee_id);

  const [activeTab, setActiveTab] = useState('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set(documentTypes.map(d => d.category));
    return ['all', ...Array.from(cats)];
  }, [documentTypes]);

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documentTypes.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [documentTypes, searchTerm, categoryFilter]);

  // Manejar selección de documento
  const toggleDocumentSelection = (doc) => {
    setSelectedDocuments(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) {
        return prev.filter(d => d.id !== doc.id);
      } else {
        return [...prev, {
          ...doc,
          priority: 'normal',
          dueDate: doc.has_expiration ? calculateDueDate(doc) : null
        }];
      }
    });
  };

  // Actualizar prioridad de documento seleccionado
  const updateDocumentPriority = (docId, priority) => {
    setSelectedDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, priority } : d)
    );
  };

  // Actualizar fecha de vencimiento
  const updateDocumentDueDate = (docId, dueDate) => {
    setSelectedDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, dueDate } : d)
    );
  };

  // Asignar documentos individuales
  const handleAssignIndividual = async () => {
    if (selectedDocuments.length === 0) {
      return;
    }

    try {
      await assignDocuments(employee.employee_id, selectedDocuments);
      setSelectedDocuments([]);
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error asignando documentos:', error);
    }
  };

  // Asignar desde plantilla
  const handleAssignTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await assignTemplate(employee.employee_id, selectedTemplate);
      setSelectedTemplate(null);
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error asignando plantilla:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Asignar Documentos Requeridos
          </DialogTitle>
          <DialogDescription>
            Asignar documentos necesarios para: {employee?.first_name} {employee?.last_name} ({employee?.employee_id})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">
              <FileText className="h-4 w-4 mr-2" />
              Selección Individual
            </TabsTrigger>
            <TabsTrigger value="template">
              <Package className="h-4 w-4 mr-2" />
              Desde Plantilla
            </TabsTrigger>
          </TabsList>

          {/* TAB: Selección Individual */}
          <TabsContent value="individual" className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Búsqueda y filtros */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Todas las categorías' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de documentos */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-2">
              {filteredDocuments.map(doc => {
                const isSelected = selectedDocuments.some(d => d.id === doc.id);
                const selectedDoc = selectedDocuments.find(d => d.id === doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => toggleDocumentSelection(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{doc.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {doc.category}
                          </Badge>
                          {doc.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obligatorio
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{doc.description}</p>
                        {doc.has_expiration && (
                          <p className="text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Renovación cada {doc.renewal_period} {doc.renewal_unit}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="ml-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={selectedDoc.priority}
                            onChange={(e) => updateDocumentPriority(doc.id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="baja">Prioridad Baja</option>
                            <option value="normal">Prioridad Normal</option>
                            <option value="alta">Prioridad Alta</option>
                            <option value="urgente">Prioridad Urgente</option>
                          </select>
                          {doc.has_expiration && (
                            <Input
                              type="date"
                              value={selectedDoc.dueDate?.toISOString().split('T')[0] || ''}
                              onChange={(e) => updateDocumentDueDate(doc.id, new Date(e.target.value))}
                              className="text-sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Documentos seleccionados */}
            {selectedDocuments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">
                  Seleccionados ({selectedDocuments.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDocuments.map(doc => (
                    <Badge key={doc.id} variant="secondary" className="flex items-center gap-1">
                      {doc.name}
                      <button
                        onClick={() => toggleDocumentSelection(doc)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAssignIndividual}
                disabled={selectedDocuments.length === 0 || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Asignar {selectedDocuments.length} documento(s)
              </Button>
            </div>
          </TabsContent>

          {/* TAB: Desde Plantilla */}
          <TabsContent value="template" className="flex-1 overflow-hidden flex flex-col space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona una plantilla predefinida para asignar múltiples documentos de una vez.
            </p>

            {/* Lista de plantillas */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {templates.map(template => {
                const isSelected = selectedTemplate?.id === template.id;
                const documentCount = template.template_documents?.length || 0;

                return (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="ml-4">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Seleccionada
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {documentCount} documentos
                      </span>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>

                    {isSelected && template.template_documents && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-700 mb-2">Documentos incluidos:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.template_documents.map((doc, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {doc.document_type?.name || 'Documento'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay plantillas disponibles</p>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAssignTemplate}
                disabled={!selectedTemplate || loading}
              >
                <Package className="h-4 w-4 mr-2" />
                Asignar Plantilla
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentAssignmentModal;
