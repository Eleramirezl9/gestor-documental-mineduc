import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Search, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Filter,
  Download
} from 'lucide-react';

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });

  // Estado del formulario de registro
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    first_name: '',
    last_name: '',
    department: '',
    phone: '',
    employee_id: '',
    position: '',
    hire_date: '',
    required_documents: []
  });

  // Cargar empleados
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.department) params.department = filters.department;
      if (filters.status) params.status = filters.status;
      
      const response = await api.get('/employee-documents/employees', { params });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error cargando empleados');
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo empleado
  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/employee-documents/register', newEmployee);
      
      if (response.ok || response.status === 200 || response.status === 201) {
        toast.success('Empleado registrado exitosamente');
        setNewEmployee({
          email: '',
          first_name: '',
          last_name: '',
          department: '',
          phone: '',
          employee_id: '',
          position: '',
          hire_date: '',
          required_documents: []
        });
        setShowRegistrationForm(false);
        loadEmployees();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error registrando empleado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte
  const generateReport = async () => {
    try {
      const params = {};
      
      if (filters.department) params.department = filters.department;
      
      const response = await api.get('/employee-documents/report', { params });
      const data = response.data;
        
      // Crear y descargar el reporte como JSON
      const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-empleados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error generando reporte');
    }
  };

  // Obtener badge de estado
  const getStatusBadge = (status) => {
    const statusConfig = {
      critical: { variant: 'destructive', label: 'Crítico' },
      attention: { variant: 'secondary', label: 'Atención' },
      normal: { variant: 'outline', label: 'Normal' },
      complete: { variant: 'default', label: 'Completo' }
    };

    const config = statusConfig[status] || statusConfig.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  useEffect(() => {
    loadEmployees();
  }, [filters]);

  // Solo administradores pueden acceder
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Acceso Restringido</h3>
              <p className="text-gray-600">Solo los administradores pueden gestionar empleados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <p className="text-gray-600">Administra empleados y documentos requeridos</p>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="register">
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lista de Empleados</CardTitle>
              <div className="flex gap-2">
                <Button onClick={generateReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reporte
                </Button>
                <Button onClick={loadEmployees} disabled={loading}>
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Buscar por nombre, email..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    placeholder="Filtrar por departamento"
                    value={filters.department}
                    onChange={(e) => setFilters({...filters, department: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="critical">Crítico</option>
                    <option value="attention">Atención</option>
                    <option value="normal">Normal</option>
                    <option value="complete">Completo</option>
                  </select>
                </div>
              </div>

              {/* Lista de empleados */}
              {loading ? (
                <div className="text-center py-8">Cargando empleados...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay empleados registrados
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            {getStatusBadge(employee.overall_status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {employee.email} • {employee.department}
                          </p>
                          {employee.position && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{employee.document_status?.total || 0}</span>
                            </div>
                            {employee.document_status?.expiring_soon > 0 && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <Clock className="h-4 w-4" />
                                <span>{employee.document_status.expiring_soon}</span>
                              </div>
                            )}
                            {employee.document_status?.expired > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span>{employee.document_status.expired}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nuevo Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nombre *</Label>
                    <Input
                      id="first_name"
                      required
                      value={newEmployee.first_name}
                      onChange={(e) => setNewEmployee({...newEmployee, first_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Apellido *</Label>
                    <Input
                      id="last_name"
                      required
                      value={newEmployee.last_name}
                      onChange={(e) => setNewEmployee({...newEmployee, last_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee_id">ID Empleado</Label>
                    <Input
                      id="employee_id"
                      value={newEmployee.employee_id}
                      onChange={(e) => setNewEmployee({...newEmployee, employee_id: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Departamento *</Label>
                    <Input
                      id="department"
                      required
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Posición</Label>
                    <Input
                      id="position"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hire_date">Fecha de Contratación</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={newEmployee.hire_date}
                      onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewEmployee({
                      email: '', first_name: '', last_name: '', department: '',
                      phone: '', employee_id: '', position: '', hire_date: '',
                      required_documents: []
                    })}
                  >
                    Limpiar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrar Empleado'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeManagement;