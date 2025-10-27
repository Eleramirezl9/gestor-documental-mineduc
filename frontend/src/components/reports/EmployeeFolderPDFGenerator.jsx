import React from 'react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Utilidad para generar PDF del folder virtual de un empleado
 * Incluye:
 * - Portada con información del empleado
 * - Lista de documentos requeridos (todos los estados)
 * - Documentos aprobados con detalles
 *
 * @param {Object} folder - Objeto del folder con employee y documents
 * @returns {Promise<void>}
 */
export const generateEmployeeFolderPDF = async (folder) => {
  if (!folder) {
    toast.error('No hay folder para generar');
    return;
  }

  const { employee, documents, stats } = folder;
  const loadingToast = toast.loading('Generando folder virtual en PDF...');

  try {
    // Crear documento PDF
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // ======== PORTADA ========
    // Logo/Header (simulado con rectángulo)
    pdf.setFillColor(37, 99, 235); // Azul primary
    pdf.rect(0, 0, pageWidth, 40, 'F');

    // Título de portada
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MINISTERIO DE EDUCACIÓN', pageWidth / 2, 20, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text('FOLDER VIRTUAL DE EMPLEADO', pageWidth / 2, 30, { align: 'center' });

    // Información del empleado
    pdf.setTextColor(0, 0, 0);
    yPosition = 60;

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMACIÓN DEL EMPLEADO', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const employeeInfo = [
      ['Nombre Completo:', employee.full_name],
      ['ID de Empleado:', employee.employee_id],
      ['Email:', employee.email || 'No especificado'],
      ['Departamento:', employee.department || 'No especificado'],
      ['Puesto:', employee.position || 'No especificado']
    ];

    employeeInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, margin + 45, yPosition);
      yPosition += 8;
    });

    // Estadísticas de documentos
    yPosition += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DE DOCUMENTOS', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const statsInfo = [
      ['Total de documentos requeridos:', stats.total.toString()],
      ['Documentos aprobados:', stats.approved.toString(), 'green'],
      ['Documentos pendientes:', stats.pending.toString(), 'yellow'],
      ['Documentos subidos (en revisión):', stats.submitted.toString(), 'blue'],
      ['Documentos rechazados:', stats.rejected.toString(), 'red'],
      ['Documentos vencidos:', stats.expired.toString(), 'gray']
    ];

    statsInfo.forEach(([label, value, color]) => {
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, margin, yPosition);
      pdf.setFont('helvetica', 'bold');

      // Colorear según el status
      if (color === 'green') pdf.setTextColor(22, 163, 74);
      else if (color === 'yellow') pdf.setTextColor(234, 179, 8);
      else if (color === 'blue') pdf.setTextColor(37, 99, 235);
      else if (color === 'red') pdf.setTextColor(220, 38, 38);
      else if (color === 'gray') pdf.setTextColor(107, 114, 128);

      pdf.text(value, margin + 80, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 7;
    });

    // Fecha de generación
    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Fecha de generación: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
      margin,
      yPosition
    );

    // ======== NUEVA PÁGINA: LISTA DE DOCUMENTOS REQUERIDOS ========
    pdf.addPage();
    yPosition = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('LISTA DE DOCUMENTOS REQUERIDOS', margin, yPosition);
    yPosition += 12;

    // Función helper para obtener color según estado
    const getStatusColor = (status) => {
      switch (status) {
        case 'approved':
          return [22, 163, 74]; // Verde
        case 'submitted':
          return [37, 99, 235]; // Azul
        case 'pending':
          return [234, 179, 8]; // Amarillo
        case 'rejected':
          return [220, 38, 38]; // Rojo
        case 'expired':
          return [107, 114, 128]; // Gris
        default:
          return [0, 0, 0];
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'approved':
          return 'APROBADO';
        case 'submitted':
          return 'SUBIDO';
        case 'pending':
          return 'PENDIENTE';
        case 'rejected':
          return 'RECHAZADO';
        case 'expired':
          return 'VENCIDO';
        default:
          return status.toUpperCase();
      }
    };

    // Dibujar tabla manualmente
    const tableStartY = yPosition;
    const rowHeight = 10;
    const col1Width = 40;
    const col2Width = 35;
    const col3Width = 30;
    const col4Width = 65;

    // Header de la tabla
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, yPosition, col1Width + col2Width + col3Width + col4Width, rowHeight, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tipo de Documento', margin + 2, yPosition + 7);
    pdf.text('Estado', margin + col1Width + 8, yPosition + 7);
    pdf.text('Fecha Req.', margin + col1Width + col2Width + 2, yPosition + 7);
    pdf.text('Descripción', margin + col1Width + col2Width + col3Width + 2, yPosition + 7);
    yPosition += rowHeight;

    // Rows de la tabla
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    documents.forEach((doc, index) => {
      // Verificar si necesitamos nueva página
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;

        // Redibujar header en nueva página
        pdf.setFillColor(37, 99, 235);
        pdf.rect(margin, yPosition, col1Width + col2Width + col3Width + col4Width, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tipo de Documento', margin + 2, yPosition + 7);
        pdf.text('Estado', margin + col1Width + 8, yPosition + 7);
        pdf.text('Fecha Req.', margin + col1Width + col2Width + 2, yPosition + 7);
        pdf.text('Descripción', margin + col1Width + col2Width + col3Width + 2, yPosition + 7);
        yPosition += rowHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
      }

      // Fondo alternado
      if (index % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, yPosition, col1Width + col2Width + col3Width + col4Width, rowHeight, 'F');
      }

      // Bordes
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPosition, col1Width, rowHeight);
      pdf.rect(margin + col1Width, yPosition, col2Width, rowHeight);
      pdf.rect(margin + col1Width + col2Width, yPosition, col3Width, rowHeight);
      pdf.rect(margin + col1Width + col2Width + col3Width, yPosition, col4Width, rowHeight);

      // Contenido
      pdf.setTextColor(0, 0, 0);
      const docType = pdf.splitTextToSize(doc.document_type || '', col1Width - 4);
      pdf.text(docType, margin + 2, yPosition + 6);

      // Estado con color
      const statusColor = getStatusColor(doc.status);
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(getStatusText(doc.status), margin + col1Width + 4, yPosition + 6);
      pdf.setFont('helvetica', 'normal');

      // Fecha
      pdf.setTextColor(0, 0, 0);
      const reqDate = doc.required_date
        ? format(new Date(doc.required_date), 'dd/MM/yyyy')
        : 'N/A';
      pdf.text(reqDate, margin + col1Width + col2Width + 4, yPosition + 6);

      // Descripción
      const desc = pdf.splitTextToSize(doc.description || '-', col4Width - 4);
      pdf.text(desc[0] || '-', margin + col1Width + col2Width + col3Width + 2, yPosition + 6);

      yPosition += rowHeight;
    });

    yPosition += 10;

    // ======== PÁGINAS ADICIONALES: DOCUMENTOS APROBADOS ========
    const approvedDocs = documents.filter(d => d.status === 'approved' && d.documents);

    if (approvedDocs.length > 0) {
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 163, 74);
      pdf.text('DOCUMENTOS APROBADOS', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `Se encontraron ${approvedDocs.length} documento(s) aprobado(s) para este empleado.`,
        margin,
        yPosition
      );
      yPosition += 5;
      pdf.text(
        'A continuación se muestran los detalles de cada documento:',
        margin,
        yPosition
      );
      yPosition += 15;

      // Listar cada documento aprobado
      for (let i = 0; i < approvedDocs.length; i++) {
        const doc = approvedDocs[i];

        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Encabezado del documento
        pdf.setFillColor(240, 253, 244); // Verde claro
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12, 'F');

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 163, 74);
        pdf.text(`${i + 1}. ${doc.document_type}`, margin + 2, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);

        // Detalles del documento
        if (doc.description) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Descripción:', margin + 5, yPosition);
          pdf.setFont('helvetica', 'normal');
          const descLines = pdf.splitTextToSize(doc.description, pageWidth - 2 * margin - 30);
          pdf.text(descLines, margin + 30, yPosition);
          yPosition += descLines.length * 5 + 3;
        }

        if (doc.approved_at) {
          pdf.text(
            `Fecha de aprobación: ${format(new Date(doc.approved_at), 'dd/MM/yyyy HH:mm', { locale: es })}`,
            margin + 5,
            yPosition
          );
          yPosition += 6;
        }

        if (doc.notes) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Notas:', margin + 5, yPosition);
          pdf.setFont('helvetica', 'normal');
          const notesLines = pdf.splitTextToSize(doc.notes, pageWidth - 2 * margin - 20);
          pdf.text(notesLines, margin + 20, yPosition);
          yPosition += notesLines.length * 5 + 3;
        }

        // Información del archivo adjunto
        if (doc.documents) {
          pdf.setFillColor(239, 246, 255); // Azul claro
          pdf.rect(margin + 5, yPosition - 3, pageWidth - 2 * margin - 10, 15, 'F');

          pdf.setFontSize(9);
          pdf.setTextColor(37, 99, 235);
          pdf.text('📎 Archivo adjunto:', margin + 8, yPosition + 2);
          pdf.setTextColor(0, 0, 0);
          pdf.text(doc.documents.title || 'Documento sin título', margin + 8, yPosition + 7);

          if (doc.documents.mime_type) {
            pdf.text(`Tipo: ${doc.documents.mime_type}`, margin + 8, yPosition + 11);
          }

          yPosition += 20;
        }

        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
      }
    } else {
      // Sin documentos aprobados
      pdf.addPage();
      yPosition = margin + 60;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('No hay documentos aprobados para incluir en este folder.', pageWidth / 2, yPosition, {
        align: 'center'
      });
    }

    // ======== PIE DE PÁGINA EN TODAS LAS PÁGINAS ========
    const totalPages = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Línea superior del pie
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Texto del pie
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        'Ministerio de Educación - Sistema de Gestión Documental',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Número de página
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, {
        align: 'right'
      });
    }

    // ======== GUARDAR PDF ========
    const fileName = `Folder_${employee.employee_id}_${employee.last_name}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    pdf.save(fileName);

    toast.success('Folder virtual generado exitosamente', { id: loadingToast });
  } catch (error) {
    console.error('Error al generar PDF del folder:', error);
    toast.error('Error al generar el PDF del folder', { id: loadingToast });
  }
};

/**
 * Componente wrapper para el generador de PDF (no renderiza nada)
 * Exporta la función principal para uso externo
 */
const EmployeeFolderPDFGenerator = () => {
  return null;
};

export default EmployeeFolderPDFGenerator;
