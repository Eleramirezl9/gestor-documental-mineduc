import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const usePDFGenerator = () => {
  const generatePDF = useCallback(async (elementRef, filename = 'reporte') => {
    if (!elementRef.current) {
      throw new Error('Elemento de referencia no encontrado');
    }

    try {
      console.log('🔄 Iniciando generación de PDF...');

      // Simplificar - usar el elemento directamente sin iframe
      const element = elementRef.current;

      // Configurar opciones optimizadas para html2canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        width: 794, // A4 width
        height: element.scrollHeight,
        windowWidth: 794,
        windowHeight: element.scrollHeight,
        ignoreElements: (element) => {
          return false; // No ignorar ningún elemento
        }
      });

      console.log('✅ Canvas generado exitosamente');
      console.log('📐 Dimensiones canvas:', canvas.width, 'x', canvas.height);

      // Obtener imagen en base64
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Usar JPEG con buena calidad

      // Configurar dimensiones del PDF (A4)
      const pdfWidth = 210; // A4 ancho en mm
      const pdfHeight = 297; // A4 alto en mm
      const margin = 10; // Margen en mm
      const contentWidth = pdfWidth - (margin * 2);

      // Calcular altura proporcional manteniendo aspect ratio
      const aspectRatio = canvas.height / canvas.width;
      const contentHeight = contentWidth * aspectRatio;

      // Crear el PDF
      const pdf = new jsPDF('p', 'mm', 'a4');

      console.log('📄 Agregando imagen al PDF...');

      // Si el contenido cabe en una página
      if (contentHeight <= pdfHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
      } else {
        // Si necesita múltiples páginas
        const pageContentHeight = pdfHeight - (margin * 2);
        let remainingHeight = contentHeight;
        let currentPage = 0;

        while (remainingHeight > 0) {
          if (currentPage > 0) {
            pdf.addPage();
          }

          const sourceY = currentPage * (canvas.height * pageContentHeight / contentHeight);
          const sourceHeight = Math.min(
            canvas.height * pageContentHeight / contentHeight,
            canvas.height - sourceY
          );

          // Crear canvas temporal para esta página
          const pageCanvas = document.createElement('canvas');
          const pageContext = pageCanvas.getContext('2d');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;

          pageContext.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const pageHeight = Math.min(pageContentHeight, remainingHeight);

          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, pageHeight);

          remainingHeight -= pageContentHeight;
          currentPage++;
        }
      }

      // Guardar el PDF
      const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`;

      console.log('💾 Guardando PDF:', fileName);
      pdf.save(fileName);

      console.log('✅ PDF generado exitosamente');

      return {
        success: true,
        fileName,
        message: 'PDF generado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      console.error('Stack trace:', error.stack);

      // Error handling simplificado

      return {
        success: false,
        error: error.message,
        message: `Error al generar el PDF: ${error.message}`
      };
    }
  }, []);

  const downloadAsImage = useCallback(async (elementRef, filename = 'reporte') => {
    if (!elementRef.current) {
      throw new Error('Elemento de referencia no encontrado');
    }

    try {
      const canvas = await html2canvas(elementRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });

      // Crear enlace de descarga
      const link = document.createElement('a');
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');

      // Simular click para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        fileName: link.download,
        message: 'Imagen generada exitosamente'
      };
    } catch (error) {
      console.error('Error generando imagen:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al generar la imagen'
      };
    }
  }, []);

  const printReport = useCallback((elementRef) => {
    if (!elementRef.current) {
      throw new Error('Elemento de referencia no encontrado');
    }

    try {
      const printWindow = window.open('', '_blank');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Reporte de Empleados - MINEDUC</title>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: white;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            ${elementRef.current.innerHTML}
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Esperar a que se cargue y luego imprimir
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      return {
        success: true,
        message: 'Reporte enviado a impresión'
      };
    } catch (error) {
      console.error('Error imprimiendo:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al imprimir el reporte'
      };
    }
  }, []);

  return {
    generatePDF,
    downloadAsImage,
    printReport
  };
};

export default usePDFGenerator;