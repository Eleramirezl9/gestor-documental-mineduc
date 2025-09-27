import React, { forwardRef } from 'react';

const EmployeeReportSimple = forwardRef(({ employees, reportData }, ref) => {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Completo':
        return { backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
      case 'Normal':
        return { backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
      case 'Atención':
        return { backgroundColor: '#fef3c7', color: '#a16207', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
      case 'Crítico':
        return { backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
    }
  };

  const baseStyles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#ffffff',
      padding: '32px',
      color: '#000000',
      maxWidth: '900px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '32px',
      borderBottom: '2px solid #2563eb',
      paddingBottom: '24px'
    },
    headerFlex: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1e40af',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '18px',
      color: '#4b5563',
      margin: 0
    },
    logo: {
      width: '70px',
      height: '70px',
      backgroundColor: '#2563eb',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#374151',
      marginBottom: '16px',
      margin: '0 0 16px 0'
    },
    infoGrid: {
      backgroundColor: '#f9fafb',
      padding: '16px',
      borderRadius: '8px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    infoItem: {
      fontSize: '14px'
    },
    infoLabel: {
      color: '#6b7280',
      fontSize: '12px'
    },
    infoValue: {
      fontWeight: '600',
      color: '#000000'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    tableHeader: {
      backgroundColor: '#f8fafc'
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
      borderBottom: '1px solid #e5e7eb'
    },
    td: {
      padding: '8px',
      fontSize: '11px',
      color: '#374151',
      borderBottom: '1px solid #f3f4f6'
    },
    evenRow: {
      backgroundColor: '#ffffff'
    },
    oddRow: {
      backgroundColor: '#f9fafb'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px'
    },
    statCard: {
      backgroundColor: '#ffffff',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#374151',
      margin: '8px 0 4px 0'
    },
    statLabel: {
      fontSize: '12px',
      color: '#6b7280'
    },
    criticalSection: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '16px'
    },
    criticalTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#dc2626',
      marginBottom: '16px',
      margin: '0 0 16px 0'
    },
    footer: {
      marginTop: '48px',
      paddingTop: '24px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: '#6b7280'
    }
  };

  return (
    <div ref={ref} style={baseStyles.container}>
      {/* Header */}
      <div style={baseStyles.header}>
        <div style={baseStyles.headerFlex}>
          <div>
            <h1 style={baseStyles.title}>Ministerio de Educación</h1>
            <h2 style={baseStyles.subtitle}>República de Guatemala</h2>
          </div>
          <div style={baseStyles.logo}>MINEDUC</div>
        </div>
      </div>

      {/* Título del reporte */}
      <div style={baseStyles.section}>
        <h3 style={baseStyles.sectionTitle}>Reporte de Gestión de Empleados</h3>
        <div style={baseStyles.infoGrid}>
          <div style={baseStyles.infoItem}>
            <div style={baseStyles.infoLabel}>Fecha de generación:</div>
            <div style={baseStyles.infoValue}>{getCurrentDate()}</div>
          </div>
          <div style={baseStyles.infoItem}>
            <div style={baseStyles.infoLabel}>Total de empleados:</div>
            <div style={baseStyles.infoValue}>{employees?.length || 0}</div>
          </div>
          <div style={baseStyles.infoItem}>
            <div style={baseStyles.infoLabel}>Departamentos:</div>
            <div style={baseStyles.infoValue}>
              {[...new Set(employees?.map(emp => emp.department) || [])].length}
            </div>
          </div>
          <div style={baseStyles.infoItem}>
            <div style={baseStyles.infoLabel}>Generado por:</div>
            <div style={baseStyles.infoValue}>Sistema de Gestión Documental</div>
          </div>
        </div>
      </div>

      {/* Estado de documentos */}
      <div style={baseStyles.section}>
        <h4 style={baseStyles.sectionTitle}>Estado de Documentos</h4>
        <div style={baseStyles.statsGrid}>
          {reportData?.statusCounts && Object.entries(reportData.statusCounts).map(([status, count]) => (
            <div key={status} style={baseStyles.statCard}>
              <div style={getStatusBadgeStyle(status)}>{status}</div>
              <div style={baseStyles.statNumber}>{count}</div>
              <div style={baseStyles.statLabel}>empleados</div>
            </div>
          ))}
        </div>
      </div>

      {/* Estadísticas por departamento */}
      <div style={baseStyles.section}>
        <h4 style={baseStyles.sectionTitle}>Estadísticas por Departamento</h4>
        <table style={baseStyles.table}>
          <thead style={baseStyles.tableHeader}>
            <tr>
              <th style={baseStyles.th}>Departamento</th>
              <th style={baseStyles.th}>Empleados</th>
              <th style={baseStyles.th}>% del Total</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.departmentStats?.map((dept, index) => (
              <tr key={index} style={index % 2 === 0 ? baseStyles.evenRow : baseStyles.oddRow}>
                <td style={baseStyles.td}>{dept.department}</td>
                <td style={baseStyles.td}>{dept.count}</td>
                <td style={baseStyles.td}>{dept.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista de empleados */}
      <div style={baseStyles.section}>
        <h4 style={baseStyles.sectionTitle}>Lista de Empleados</h4>
        <table style={baseStyles.table}>
          <thead style={baseStyles.tableHeader}>
            <tr>
              <th style={baseStyles.th}>ID</th>
              <th style={baseStyles.th}>Nombre</th>
              <th style={baseStyles.th}>Departamento</th>
              <th style={baseStyles.th}>Posición</th>
              <th style={baseStyles.th}>Estado</th>
              <th style={baseStyles.th}>Fecha Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((employee, index) => (
              <tr key={employee.id} style={index % 2 === 0 ? baseStyles.evenRow : baseStyles.oddRow}>
                <td style={baseStyles.td}>{employee.employee_id}</td>
                <td style={baseStyles.td}>
                  <div>{employee.first_name} {employee.last_name}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>{employee.email}</div>
                </td>
                <td style={baseStyles.td}>{employee.department}</td>
                <td style={baseStyles.td}>{employee.position || 'N/A'}</td>
                <td style={baseStyles.td}>
                  <span style={getStatusBadgeStyle(employee.documentStatus)}>
                    {employee.documentStatus}
                  </span>
                </td>
                <td style={baseStyles.td}>
                  {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('es-GT') : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Documentos críticos */}
      {reportData?.criticalDocuments && reportData.criticalDocuments.length > 0 && (
        <div style={baseStyles.section}>
          <div style={baseStyles.criticalSection}>
            <h4 style={baseStyles.criticalTitle}>Documentos que Requieren Atención Inmediata</h4>
            {reportData.criticalDocuments.map((doc, index) => (
              <div key={index} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '12px' }}>
                    {doc.employee_name} - {doc.document_type}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{doc.description}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                  <div style={{ color: '#dc2626', fontWeight: '600' }}>
                    Vence: {new Date(doc.required_date).toLocaleDateString('es-GT')}
                  </div>
                  <span style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px'
                  }}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={baseStyles.footer}>
        <div>
          <div>Sistema de Gestión Documental - MINEDUC</div>
          <div>Generado automáticamente el {getCurrentDate()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Página 1 de 1</div>
          <div>Confidencial - Uso Interno</div>
        </div>
      </div>
    </div>
  );
});

EmployeeReportSimple.displayName = 'EmployeeReportSimple';

export default EmployeeReportSimple;