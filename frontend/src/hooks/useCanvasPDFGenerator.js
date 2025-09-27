import { useCallback } from 'react';
import jsPDF from 'jspdf';

export const useCanvasPDFGenerator = () => {
  const generatePDFFromData = useCallback(async (employees, reportData, filename = 'reporte_empleados') => {
    try {
      console.log('🔄 Iniciando generación de PDF con Canvas...');
      console.log('📊 Datos recibidos:', { employeesCount: employees?.length, reportData: !!reportData });

      // Validar datos de entrada
      if (!employees || employees.length === 0) {
        throw new Error('No hay datos de empleados para generar el PDF');
      }

      console.log('✅ Validación de datos completada');

      // Crear canvas con resolución moderada para evitar problemas de rendimiento
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo crear el contexto 2D del canvas');
      }

      console.log('✅ Canvas y contexto creados');

      // Usar escala menor para mejor rendimiento (2x en lugar de 3x)
      const scale = 2;
      const baseWidth = 794; // Dimensiones lógicas para dibujar
      const baseHeight = 1123;
      const canvasWidth = baseWidth * scale;
      const canvasHeight = baseHeight * scale;

      console.log('📐 Configurando dimensiones:', { baseWidth, baseHeight, canvasWidth, canvasHeight, scale });

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Escalar el contexto para dibujar en alta resolución
      ctx.scale(scale, scale);

      // Configurar renderizado de alta calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.textRenderingOptimization = 'optimizeQuality';

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // Configurar fuente
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';

      let y = 60; // Posición Y inicial

      // Header
      ctx.fillStyle = '#1e40af'; // Azul
      ctx.font = 'bold 28px Arial';
      ctx.fillText('Ministerio de Educación', 60, y);

      y += 35;
      ctx.fillStyle = '#4b5563'; // Gris
      ctx.font = '18px Arial';
      ctx.fillText('República de Guatemala', 60, y);

      // Logo circular
      ctx.beginPath();
      ctx.arc(baseWidth - 100, 70, 35, 0, 2 * Math.PI);
      ctx.fillStyle = '#2563eb';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MINEDUC', baseWidth - 100, 75);

      // Línea separadora
      y += 40;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(baseWidth - 60, y);
      ctx.stroke();

      y += 40;
      ctx.textAlign = 'left';

      // Título del reporte
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Reporte de Gestión de Empleados', 60, y);

      y += 40;

      // Información del reporte
      const currentDate = new Date().toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Fondo gris para la información
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(60, y - 15, baseWidth - 120, 80);

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';

      ctx.fillText('Fecha de generación:', 80, y + 10);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(currentDate, 220, y + 10);

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.fillText('Total de empleados:', 400, y + 10);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(String(employees?.length || 0), 540, y + 10);

      y += 30;

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.fillText('Departamentos:', 80, y + 10);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      const deptCount = [...new Set(employees?.map(emp => emp.department) || [])].length;
      ctx.fillText(String(deptCount), 180, y + 10);

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.fillText('Generado por:', 400, y + 10);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Sistema de Gestión Documental', 480, y + 10);

      y += 60;

      // Estado de documentos
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Estado de Documentos', 60, y);

      y += 30;

      // Cards de estado
      console.log('🔄 Dibujando cards de estado...');
      if (reportData?.statusCounts) {
        const statuses = Object.entries(reportData.statusCounts);
        console.log('📊 Statuses encontrados:', statuses.length);
        const cardWidth = 160;
        const cardHeight = 80;
        let x = 60;

        statuses.forEach(([status, count]) => {
          // Fondo de la card
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, cardWidth, cardHeight);

          // Borde
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cardWidth, cardHeight);

          // Badge de estado
          let badgeColor = '#f3f4f6';
          let textColor = '#374151';

          switch (status) {
            case 'Completo':
              badgeColor = '#dcfce7';
              textColor = '#166534';
              break;
            case 'Normal':
              badgeColor = '#dbeafe';
              textColor = '#1e40af';
              break;
            case 'Atención':
              badgeColor = '#fef3c7';
              textColor = '#a16207';
              break;
            case 'Crítico':
              badgeColor = '#fee2e2';
              textColor = '#dc2626';
              break;
          }

          // Badge
          ctx.fillStyle = badgeColor;
          ctx.fillRect(x + 20, y + 15, 120, 20);

          ctx.fillStyle = textColor;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(status, x + 80, y + 28);

          // Número
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(String(count), x + 80, y + 55);

          // Label
          ctx.fillStyle = '#6b7280';
          ctx.font = '12px Arial';
          ctx.fillText('empleados', x + 80, y + 70);

          x += cardWidth + 10;
        });
      }

      y += 120;

      // Lista de empleados (tabla)
      console.log('🔄 Dibujando tabla de empleados...');
      ctx.textAlign = 'left';
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Lista de Empleados', 60, y);

      y += 30;

      // Headers de tabla
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, y, baseWidth - 120, 25);

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px Arial';

      const headers = ['ID', 'Nombre', 'Departamento', 'Posición', 'Estado', 'Fecha Ingreso'];
      const columnWidths = [80, 200, 150, 120, 100, 120];
      let headerX = 70;

      headers.forEach((header, index) => {
        ctx.fillText(header, headerX, y + 17);
        headerX += columnWidths[index];
      });

      y += 25;

      // Filas de empleados (máximo 15 para que quepan en la página)
      const maxEmployees = Math.min(15, employees?.length || 0);
      console.log('👥 Procesando empleados:', maxEmployees, 'de', employees?.length);

      for (let i = 0; i < maxEmployees; i++) {
        const employee = employees[i];
        const rowHeight = 30;

        // Fondo alternado
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        ctx.fillRect(60, y, baseWidth - 120, rowHeight);

        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';

        let cellX = 70;

        // ID
        ctx.fillText(employee.employee_id || '', cellX, y + 15);
        cellX += columnWidths[0];

        // Nombre
        const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
        ctx.fillText(fullName.substring(0, 25), cellX, y + 12);
        ctx.fillStyle = '#6b7280';
        ctx.font = '9px Arial';
        ctx.fillText((employee.email || '').substring(0, 30), cellX, y + 24);
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        cellX += columnWidths[1];

        // Departamento
        ctx.fillText((employee.department || '').substring(0, 20), cellX, y + 15);
        cellX += columnWidths[2];

        // Posición
        ctx.fillText((employee.position || 'N/A').substring(0, 15), cellX, y + 15);
        cellX += columnWidths[3];

        // Estado (badge)
        const status = employee.documentStatus || 'Normal';
        let statusBadgeColor = '#f3f4f6';
        let statusTextColor = '#374151';

        switch (status) {
          case 'Completo':
            statusBadgeColor = '#dcfce7';
            statusTextColor = '#166534';
            break;
          case 'Normal':
            statusBadgeColor = '#dbeafe';
            statusTextColor = '#1e40af';
            break;
          case 'Atención':
            statusBadgeColor = '#fef3c7';
            statusTextColor = '#a16207';
            break;
          case 'Crítico':
            statusBadgeColor = '#fee2e2';
            statusTextColor = '#dc2626';
            break;
        }

        ctx.fillStyle = statusBadgeColor;
        ctx.fillRect(cellX, y + 5, 80, 20);
        ctx.fillStyle = statusTextColor;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(status, cellX + 40, y + 17);
        ctx.textAlign = 'left';
        cellX += columnWidths[4];

        // Fecha
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        const hireDate = employee.hire_date ?
          new Date(employee.hire_date).toLocaleDateString('es-GT') : 'N/A';
        ctx.fillText(hireDate, cellX, y + 15);

        y += rowHeight;
      }

      console.log('✅ Tabla de empleados completada');

      // Mensaje si hay más empleados
      if (employees?.length > maxEmployees) {
        y += 10;
        ctx.fillStyle = '#6b7280';
        ctx.font = 'italic 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Mostrando primeros ${maxEmployees} empleados de ${employees.length} total`,
          baseWidth / 2,
          y
        );
      }

      // Footer
      y = baseHeight - 80;
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(baseWidth - 60, y);
      ctx.stroke();

      y += 20;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Sistema de Gestión Documental - MINEDUC', 60, y);
      ctx.fillText(`Generado automáticamente el ${currentDate}`, 60, y + 15);

      ctx.textAlign = 'right';
      ctx.fillText('Página 1 de 1', baseWidth - 60, y);
      ctx.fillText('Confidencial - Uso Interno', baseWidth - 60, y + 15);

      console.log('✅ Canvas dibujado exitosamente');
      console.log('📐 Dimensiones canvas real:', canvasWidth, 'x', canvasHeight);
      console.log('📐 Dimensiones base:', baseWidth, 'x', baseHeight);

      // Convertir canvas a imagen con calidad optimizada para mejor rendimiento
      console.log('🔄 Convirtiendo canvas a imagen...');

      // Usar JPEG con calidad 0.9 en lugar de PNG para mejor rendimiento
      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      if (!imgData || imgData === 'data:,') {
        throw new Error('Error al convertir el canvas a imagen');
      }

      console.log('✅ Imagen generada, tamaño:', Math.round(imgData.length / 1024), 'KB');

      // Crear PDF
      console.log('🔄 Creando documento PDF...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (contentWidth * baseHeight) / baseWidth;

      console.log('🔄 Añadiendo imagen al PDF...');
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);

      // Guardar PDF
      console.log('🔄 Guardando archivo PDF...');
      const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Usar setTimeout para hacer la operación asíncrona y evitar bloqueos
      await new Promise((resolve) => {
        setTimeout(() => {
          pdf.save(fileName);
          resolve();
        }, 100);
      });

      console.log('✅ PDF generado exitosamente con Canvas:', fileName);

      return {
        success: true,
        fileName,
        message: 'PDF generado exitosamente con Canvas'
      };

    } catch (error) {
      console.error('❌ Error generando PDF con Canvas:', error);
      return {
        success: false,
        error: error.message,
        message: `Error al generar el PDF: ${error.message}`
      };
    }
  }, []);

  return {
    generatePDFFromData
  };
};

export default useCanvasPDFGenerator;