import React, { forwardRef } from 'react';

const IsolatedPDFReport = forwardRef(({ employees, reportData }, ref) => {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '794px', // A4 width in pixels at 96 DPI
        height: 'auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '40px',
        boxSizing: 'border-box',
        zIndex: -9999,
        visibility: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Aislamiento extremo contra interferencias externas
        isolation: 'isolate',
        contain: 'layout style paint',
        transform: 'translateZ(0)' // Forzar capa de composición
      }}
    >
      {/* CSS Reset interno extremo para evitar TODAS las interferencias */}
      <style>{`
        .pdf-isolated-container {
          all: initial !important;
          font-family: Arial, sans-serif !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          position: fixed !important;
          contain: layout style paint !important;
        }

        .pdf-isolated-container *,
        .pdf-isolated-container *::before,
        .pdf-isolated-container *::after {
          all: initial !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          background: transparent !important;
          background-color: transparent !important;
          color: inherit !important;
          border: none !important;
          border-radius: 0 !important;
          position: static !important;
          float: none !important;
          display: block !important;
          transform: none !important;
          transition: none !important;
          animation: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          z-index: auto !important;
          outline: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          mask: none !important;
          clip-path: none !important;
        }

        .pdf-container {
          font-family: Arial, sans-serif !important;
          background-color: #ffffff !important;
          color: #000000 !important;
        }

        .pdf-header {
          border-bottom: 3px solid #2563eb !important;
          padding-bottom: 20px !important;
          margin-bottom: 30px !important;
        }

        .pdf-logo {
          width: 60px !important;
          height: 60px !important;
          background-color: #2563eb !important;
          border-radius: 50% !important;
          color: #ffffff !important;
          font-weight: bold !important;
          font-size: 12px !important;
          text-align: center !important;
          line-height: 60px !important;
          float: right !important;
        }

        .pdf-title {
          font-size: 24px !important;
          font-weight: bold !important;
          color: #1e40af !important;
          margin-bottom: 5px !important;
        }

        .pdf-subtitle {
          font-size: 16px !important;
          color: #4b5563 !important;
        }

        .pdf-section {
          margin-bottom: 25px !important;
          clear: both !important;
        }

        .pdf-section-title {
          font-size: 16px !important;
          font-weight: bold !important;
          color: #374151 !important;
          margin-bottom: 15px !important;
          border-bottom: 1px solid #e5e7eb !important;
          padding-bottom: 5px !important;
        }

        .pdf-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-bottom: 20px !important;
        }

        .pdf-table th {
          background-color: #f8fafc !important;
          padding: 10px 8px !important;
          text-align: left !important;
          font-size: 11px !important;
          font-weight: bold !important;
          color: #374151 !important;
          border: 1px solid #e5e7eb !important;
        }

        .pdf-table td {
          padding: 8px !important;
          font-size: 10px !important;
          color: #374151 !important;
          border: 1px solid #e5e7eb !important;
        }

        .pdf-table tr:nth-child(even) {
          background-color: #f9fafb !important;
        }

        .pdf-info-grid {
          background-color: #f9fafb !important;
          padding: 15px !important;
          border: 1px solid #e5e7eb !important;
          margin-bottom: 20px !important;
        }

        .pdf-info-item {
          display: inline-block !important;
          width: 48% !important;
          margin-bottom: 10px !important;
          font-size: 11px !important;
        }

        .pdf-info-label {
          color: #6b7280 !important;
          font-size: 10px !important;
          display: block !important;
        }

        .pdf-info-value {
          font-weight: bold !important;
          color: #000000 !important;
          font-size: 11px !important;
        }

        .pdf-stats-container {
          overflow: hidden !important;
        }

        .pdf-stat-card {
          width: 23% !important;
          float: left !important;
          margin-right: 2.5% !important;
          background-color: #ffffff !important;
          border: 2px solid #e5e7eb !important;
          padding: 15px !important;
          text-align: center !important;
          margin-bottom: 15px !important;
        }

        .pdf-stat-badge {
          padding: 4px 8px !important;
          border-radius: 12px !important;
          font-size: 10px !important;
          font-weight: bold !important;
          display: inline-block !important;
          margin-bottom: 8px !important;
        }

        .pdf-stat-badge-completo {
          background-color: #dcfce7 !important;
          color: #166534 !important;
        }

        .pdf-stat-badge-normal {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        .pdf-stat-badge-atencion {
          background-color: #fef3c7 !important;
          color: #a16207 !important;
        }

        .pdf-stat-badge-critico {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .pdf-stat-number {
          font-size: 20px !important;
          font-weight: bold !important;
          color: #374151 !important;
          display: block !important;
          margin: 5px 0 !important;
        }

        .pdf-stat-label {
          font-size: 10px !important;
          color: #6b7280 !important;
        }

        .pdf-footer {
          margin-top: 40px !important;
          padding-top: 20px !important;
          border-top: 1px solid #e5e7eb !important;
          font-size: 10px !important;
          color: #6b7280 !important;
          overflow: hidden !important;
        }

        .pdf-footer-left {
          float: left !important;
          width: 50% !important;
        }

        .pdf-footer-right {
          float: right !important;
          width: 50% !important;
          text-align: right !important;
        }
      `}</style>

      <div className="pdf-isolated-container">
        <div className="pdf-container">
        {/* Header */}
        <div className="pdf-header">
          <div className="pdf-logo">MINEDUC</div>
          <h1 className="pdf-title">Ministerio de Educación</h1>
          <h2 className="pdf-subtitle">República de Guatemala</h2>
        </div>

        {/* Título del reporte */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">📊 Reporte de Gestión de Empleados</h3>
          <div className="pdf-info-grid">
            <div className="pdf-info-item">
              <span className="pdf-info-label">Fecha de generación:</span>
              <span className="pdf-info-value">{getCurrentDate()}</span>
            </div>
            <div className="pdf-info-item">
              <span className="pdf-info-label">Total de empleados:</span>
              <span className="pdf-info-value">{employees?.length || 0}</span>
            </div>
            <div className="pdf-info-item">
              <span className="pdf-info-label">Departamentos:</span>
              <span className="pdf-info-value">
                {[...new Set(employees?.map(emp => emp.department) || [])].length}
              </span>
            </div>
            <div className="pdf-info-item">
              <span className="pdf-info-label">Generado por:</span>
              <span className="pdf-info-value">Sistema de Gestión Documental</span>
            </div>
          </div>
        </div>

        {/* Estado de documentos */}
        <div className="pdf-section">
          <h4 className="pdf-section-title">📋 Estado de Documentos</h4>
          <div className="pdf-stats-container">
            {reportData?.statusCounts && Object.entries(reportData.statusCounts).map(([status, count]) => (
              <div key={status} className="pdf-stat-card">
                <span className={`pdf-stat-badge pdf-stat-badge-${status.toLowerCase()}`}>
                  {status}
                </span>
                <span className="pdf-stat-number">{count}</span>
                <span className="pdf-stat-label">empleados</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estadísticas por departamento */}
        {reportData?.departmentStats && reportData.departmentStats.length > 0 && (
          <div className="pdf-section">
            <h4 className="pdf-section-title">📈 Estadísticas por Departamento</h4>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Empleados</th>
                  <th>% del Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.departmentStats.map((dept, index) => (
                  <tr key={index}>
                    <td>{dept.department}</td>
                    <td>{dept.count}</td>
                    <td>{dept.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lista de empleados */}
        <div className="pdf-section">
          <h4 className="pdf-section-title">👥 Lista de Empleados</h4>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Departamento</th>
                <th>Posición</th>
                <th>Estado</th>
                <th>Fecha Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {employees?.slice(0, 20).map((employee, index) => (
                <tr key={employee.id}>
                  <td>{employee.employee_id}</td>
                  <td>
                    <div>{employee.first_name} {employee.last_name}</div>
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>{employee.email}</div>
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.position || 'N/A'}</td>
                  <td>
                    <span className={`pdf-stat-badge pdf-stat-badge-${employee.documentStatus?.toLowerCase() || 'normal'}`}>
                      {employee.documentStatus || 'Normal'}
                    </span>
                  </td>
                  <td>
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('es-GT') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees?.length > 20 && (
            <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', marginTop: '10px' }}>
              Mostrando primeros 20 empleados de {employees.length} total
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pdf-footer">
          <div className="pdf-footer-left">
            <div>Sistema de Gestión Documental - MINEDUC</div>
            <div>Generado automáticamente el {getCurrentDate()}</div>
          </div>
          <div className="pdf-footer-right">
            <div>Página 1 de 1</div>
            <div>Confidencial - Uso Interno</div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
});

IsolatedPDFReport.displayName = 'IsolatedPDFReport';

export default IsolatedPDFReport;