import React, { forwardRef } from 'react';
import { Card } from '../ui/card';

const EmployeeReport = forwardRef(({ employees, reportData }, ref) => {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completo': return 'bg-green-100 text-green-800';
      case 'Normal': return 'bg-blue-100 text-blue-800';
      case 'Atención': return 'bg-yellow-100 text-yellow-800';
      case 'Crítico': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      ref={ref}
      className="max-w-4xl mx-auto"
      style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#ffffff',
        padding: '32px',
        color: '#000000'
      }}
    >
      {/* Header con logo y título */}
      <div style={{ marginBottom: '32px', borderBottom: '2px solid #2563eb', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', margin: 0 }}>
              Ministerio de Educación
            </h1>
            <h2 style={{ fontSize: '20px', color: '#4b5563', margin: 0 }}>
              República de Guatemala
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              MINEDUC
            </div>
          </div>
        </div>
      </div>

      {/* Información del reporte */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          📊 Reporte de Gestión de Empleados
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Fecha de generación:</p>
              <p className="font-semibold">{getCurrentDate()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de empleados:</p>
              <p className="font-semibold">{employees?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Departamentos:</p>
              <p className="font-semibold">
                {[...new Set(employees?.map(emp => emp.department) || [])].length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Generado por:</p>
              <p className="font-semibold">Sistema de Gestión Documental</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas por departamento */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-gray-800 mb-4">📈 Estadísticas por Departamento</h4>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Departamento</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Empleados</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.departmentStats?.map((dept, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-900">{dept.department}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium">{dept.count}</td>
                  <td className="px-4 py-3 text-sm text-center">{dept.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado de documentos */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-gray-800 mb-4">📋 Estado de Documentos</h4>
        <div className="grid grid-cols-4 gap-4">
          {reportData?.statusCounts && Object.entries(reportData.statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusBadgeColor(status)}`}>
                {status}
              </div>
              <div className="text-2xl font-bold text-gray-800">{count}</div>
              <div className="text-sm text-gray-600">empleados</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista detallada de empleados */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-gray-800 mb-4">👥 Lista Detallada de Empleados</h4>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">ID</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Nombre Completo</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Departamento</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Posición</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">Estado Docs</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">Fecha Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((employee, index) => (
                <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-3 font-mono text-xs">{employee.employee_id}</td>
                  <td className="px-3 py-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{employee.email}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{employee.department}</td>
                  <td className="px-3 py-3 text-gray-700">{employee.position || 'N/A'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(employee.documentStatus)}`}>
                      {employee.documentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('es-GT') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de documentos críticos */}
      {reportData?.criticalDocuments && reportData.criticalDocuments.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-bold text-red-600 mb-4">⚠️ Documentos que Requieren Atención Inmediata</h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="grid gap-3">
              {reportData.criticalDocuments.map((doc, index) => (
                <div key={index} className="bg-white border border-red-200 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {doc.employee_name} - {doc.document_type}
                      </p>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        Vence: {new Date(doc.required_date).toLocaleDateString('es-GT')}
                      </p>
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <p>Sistema de Gestión Documental - MINEDUC</p>
            <p>Generado automáticamente el {getCurrentDate()}</p>
          </div>
          <div className="text-right">
            <p>Página 1 de 1</p>
            <p>Confidencial - Uso Interno</p>
          </div>
        </div>
      </div>
    </div>
  );
});

EmployeeReport.displayName = 'EmployeeReport';

export default EmployeeReport;