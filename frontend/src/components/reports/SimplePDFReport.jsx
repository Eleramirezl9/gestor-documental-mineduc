import React, { forwardRef } from 'react';

const SimplePDFReport = forwardRef(({ employees, reportData }, ref) => {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Crear HTML puro sin React para evitar cualquier interferencia
  const generatePureHTML = () => {
    return `
      <div style="
        font-family: Arial, sans-serif;
        background-color: rgb(255, 255, 255);
        color: rgb(0, 0, 0);
        padding: 32px;
        max-width: 794px;
        margin: 0 auto;
      ">
        <!-- Header -->
        <div style="
          margin-bottom: 32px;
          border-bottom: 2px solid rgb(37, 99, 235);
          padding-bottom: 24px;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div>
              <h1 style="
                font-size: 28px;
                font-weight: bold;
                color: rgb(30, 64, 175);
                margin: 0 0 8px 0;
              ">Ministerio de Educación</h1>
              <h2 style="
                font-size: 18px;
                color: rgb(75, 85, 99);
                margin: 0;
              ">República de Guatemala</h2>
            </div>
            <div style="
              width: 70px;
              height: 70px;
              background-color: rgb(37, 99, 235);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: rgb(255, 255, 255);
              font-weight: bold;
              font-size: 14px;
            ">MINEDUC</div>
          </div>
        </div>

        <!-- Título del reporte -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            font-size: 18px;
            font-weight: bold;
            color: rgb(55, 65, 81);
            margin: 0 0 16px 0;
          ">📊 Reporte de Gestión de Empleados</h3>
          <div style="
            background-color: rgb(249, 250, 251);
            padding: 16px;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          ">
            <div>
              <div style="color: rgb(107, 114, 128); font-size: 12px;">Fecha de generación:</div>
              <div style="font-weight: 600; color: rgb(0, 0, 0);">${getCurrentDate()}</div>
            </div>
            <div>
              <div style="color: rgb(107, 114, 128); font-size: 12px;">Total de empleados:</div>
              <div style="font-weight: 600; color: rgb(0, 0, 0);">${employees?.length || 0}</div>
            </div>
            <div>
              <div style="color: rgb(107, 114, 128); font-size: 12px;">Departamentos:</div>
              <div style="font-weight: 600; color: rgb(0, 0, 0);">
                ${[...new Set(employees?.map(emp => emp.department) || [])].length}
              </div>
            </div>
            <div>
              <div style="color: rgb(107, 114, 128); font-size: 12px;">Generado por:</div>
              <div style="font-weight: 600; color: rgb(0, 0, 0);">Sistema de Gestión Documental</div>
            </div>
          </div>
        </div>

        <!-- Estado de documentos -->
        <div style="margin-bottom: 24px;">
          <h4 style="
            font-size: 16px;
            font-weight: bold;
            color: rgb(55, 65, 81);
            margin: 0 0 16px 0;
          ">📋 Estado de Documentos</h4>
          <div style="
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          ">
            ${reportData?.statusCounts ? Object.entries(reportData.statusCounts).map(([status, count]) => {
              let badgeColor = 'rgb(243, 244, 246)';
              let textColor = 'rgb(55, 65, 81)';

              switch (status) {
                case 'Completo':
                  badgeColor = 'rgb(220, 252, 231)';
                  textColor = 'rgb(22, 101, 52)';
                  break;
                case 'Normal':
                  badgeColor = 'rgb(219, 234, 254)';
                  textColor = 'rgb(30, 64, 175)';
                  break;
                case 'Atención':
                  badgeColor = 'rgb(254, 243, 199)';
                  textColor = 'rgb(161, 98, 7)';
                  break;
                case 'Crítico':
                  badgeColor = 'rgb(254, 226, 226)';
                  textColor = 'rgb(220, 38, 38)';
                  break;
              }

              return `
                <div style="
                  background-color: rgb(255, 255, 255);
                  border: 2px solid rgb(229, 231, 235);
                  border-radius: 8px;
                  padding: 16px;
                  text-align: center;
                ">
                  <div style="
                    background-color: ${badgeColor};
                    color: ${textColor};
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    display: inline-block;
                    margin-bottom: 8px;
                  ">${status}</div>
                  <div style="
                    font-size: 24px;
                    font-weight: bold;
                    color: rgb(55, 65, 81);
                    margin: 8px 0 4px 0;
                  ">${count}</div>
                  <div style="
                    font-size: 12px;
                    color: rgb(107, 114, 128);
                  ">empleados</div>
                </div>
              `;
            }).join('') : ''}
          </div>
        </div>

        <!-- Estadísticas por departamento -->
        ${reportData?.departmentStats?.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h4 style="
            font-size: 16px;
            font-weight: bold;
            color: rgb(55, 65, 81);
            margin: 0 0 16px 0;
          ">📈 Estadísticas por Departamento</h4>
          <table style="
            width: 100%;
            border-collapse: collapse;
            border: 1px solid rgb(229, 231, 235);
            border-radius: 8px;
            overflow: hidden;
          ">
            <thead style="background-color: rgb(248, 250, 252);">
              <tr>
                <th style="
                  padding: 12px 8px;
                  text-align: left;
                  font-size: 12px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Departamento</th>
                <th style="
                  padding: 12px 8px;
                  text-align: center;
                  font-size: 12px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Empleados</th>
                <th style="
                  padding: 12px 8px;
                  text-align: center;
                  font-size: 12px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">% del Total</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.departmentStats.map((dept, index) => `
                <tr style="background-color: ${index % 2 === 0 ? 'rgb(255, 255, 255)' : 'rgb(249, 250, 251)'};">
                  <td style="
                    padding: 8px;
                    font-size: 11px;
                    color: rgb(55, 65, 81);
                    border-bottom: 1px solid rgb(243, 244, 246);
                  ">${dept.department}</td>
                  <td style="
                    padding: 8px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 500;
                    color: rgb(55, 65, 81);
                    border-bottom: 1px solid rgb(243, 244, 246);
                  ">${dept.count}</td>
                  <td style="
                    padding: 8px;
                    text-align: center;
                    font-size: 11px;
                    color: rgb(55, 65, 81);
                    border-bottom: 1px solid rgb(243, 244, 246);
                  ">${dept.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Lista de empleados -->
        <div style="margin-bottom: 24px;">
          <h4 style="
            font-size: 16px;
            font-weight: bold;
            color: rgb(55, 65, 81);
            margin: 0 0 16px 0;
          ">👥 Lista de Empleados</h4>
          <table style="
            width: 100%;
            border-collapse: collapse;
            border: 1px solid rgb(229, 231, 235);
            border-radius: 8px;
            overflow: hidden;
          ">
            <thead style="background-color: rgb(248, 250, 252);">
              <tr>
                <th style="
                  padding: 8px;
                  text-align: left;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">ID</th>
                <th style="
                  padding: 8px;
                  text-align: left;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Nombre</th>
                <th style="
                  padding: 8px;
                  text-align: left;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Departamento</th>
                <th style="
                  padding: 8px;
                  text-align: left;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Posición</th>
                <th style="
                  padding: 8px;
                  text-align: center;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Estado</th>
                <th style="
                  padding: 8px;
                  text-align: center;
                  font-size: 11px;
                  font-weight: 600;
                  color: rgb(55, 65, 81);
                  border-bottom: 1px solid rgb(229, 231, 235);
                ">Fecha Ingreso</th>
              </tr>
            </thead>
            <tbody>
              ${employees?.slice(0, 20).map((employee, index) => {
                let statusBadgeColor = 'rgb(243, 244, 246)';
                let statusTextColor = 'rgb(55, 65, 81)';

                switch (employee.documentStatus) {
                  case 'Completo':
                    statusBadgeColor = 'rgb(220, 252, 231)';
                    statusTextColor = 'rgb(22, 101, 52)';
                    break;
                  case 'Normal':
                    statusBadgeColor = 'rgb(219, 234, 254)';
                    statusTextColor = 'rgb(30, 64, 175)';
                    break;
                  case 'Atención':
                    statusBadgeColor = 'rgb(254, 243, 199)';
                    statusTextColor = 'rgb(161, 98, 7)';
                    break;
                  case 'Crítico':
                    statusBadgeColor = 'rgb(254, 226, 226)';
                    statusTextColor = 'rgb(220, 38, 38)';
                    break;
                }

                return `
                  <tr style="background-color: ${index % 2 === 0 ? 'rgb(255, 255, 255)' : 'rgb(249, 250, 251)'};">
                    <td style="
                      padding: 6px;
                      font-size: 10px;
                      color: rgb(55, 65, 81);
                      border-bottom: 1px solid rgb(243, 244, 246);
                      font-family: monospace;
                    ">${employee.employee_id}</td>
                    <td style="
                      padding: 6px;
                      font-size: 10px;
                      color: rgb(55, 65, 81);
                      border-bottom: 1px solid rgb(243, 244, 246);
                    ">
                      <div style="font-weight: 500;">${employee.first_name} ${employee.last_name}</div>
                      <div style="font-size: 9px; color: rgb(107, 114, 128);">${employee.email}</div>
                    </td>
                    <td style="
                      padding: 6px;
                      font-size: 10px;
                      color: rgb(55, 65, 81);
                      border-bottom: 1px solid rgb(243, 244, 246);
                    ">${employee.department}</td>
                    <td style="
                      padding: 6px;
                      font-size: 10px;
                      color: rgb(55, 65, 81);
                      border-bottom: 1px solid rgb(243, 244, 246);
                    ">${employee.position || 'N/A'}</td>
                    <td style="
                      padding: 6px;
                      text-align: center;
                      border-bottom: 1px solid rgb(243, 244, 246);
                    ">
                      <span style="
                        background-color: ${statusBadgeColor};
                        color: ${statusTextColor};
                        padding: 2px 6px;
                        border-radius: 12px;
                        font-size: 9px;
                        font-weight: 500;
                      ">${employee.documentStatus || 'Normal'}</span>
                    </td>
                    <td style="
                      padding: 6px;
                      font-size: 10px;
                      text-align: center;
                      color: rgb(55, 65, 81);
                      border-bottom: 1px solid rgb(243, 244, 246);
                    ">
                      ${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('es-GT') : 'N/A'}
                    </td>
                  </tr>
                `;
              }).join('') || ''}
              ${employees?.length > 20 ? `
                <tr>
                  <td colspan="6" style="
                    padding: 8px;
                    text-align: center;
                    font-size: 10px;
                    color: rgb(107, 114, 128);
                    border-bottom: 1px solid rgb(243, 244, 246);
                    font-style: italic;
                  ">
                    Mostrando primeros 20 empleados de ${employees.length} total
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgb(229, 231, 235);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: rgb(107, 114, 128);
        ">
          <div>
            <div>Sistema de Gestión Documental - MINEDUC</div>
            <div>Generado automáticamente el ${getCurrentDate()}</div>
          </div>
          <div style="text-align: right;">
            <div>Página 1 de 1</div>
            <div>Confidencial - Uso Interno</div>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div
      ref={ref}
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={{ __html: generatePureHTML() }}
    />
  );
});

SimplePDFReport.displayName = 'SimplePDFReport';

export default SimplePDFReport;