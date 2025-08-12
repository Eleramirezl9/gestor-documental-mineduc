const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

class OCRService {
  /**
   * Extrae texto de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<string>} - Texto extraído
   */
  async extractText(filePath) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      switch (fileExtension) {
        case '.pdf':
          return await this.extractFromPDF(filePath);
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
          return await this.extractFromImage(filePath);
        default:
          throw new Error(`Tipo de archivo no soportado para OCR: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Error en extracción de texto:', error);
      throw error;
    }
  }

  /**
   * Extrae texto de un archivo PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<string>} - Texto extraído
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      if (data.text && data.text.trim().length > 0) {
        return data.text.trim();
      } else {
        // Si el PDF no tiene texto extraíble, intentar OCR
        console.log('PDF sin texto extraíble, intentando OCR...');
        // Aquí se podría implementar conversión de PDF a imagen y luego OCR
        return 'Texto no extraíble del PDF';
      }
    } catch (error) {
      console.error('Error extrayendo texto de PDF:', error);
      throw new Error('Error procesando archivo PDF');
    }
  }

  /**
   * Extrae texto de una imagen usando Tesseract
   * @param {string} filePath - Ruta de la imagen
   * @returns {Promise<string>} - Texto extraído
   */
  async extractFromImage(filePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        filePath,
        'spa', // Idioma español
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      return text.trim();
    } catch (error) {
      console.error('Error en OCR de imagen:', error);
      throw new Error('Error procesando imagen con OCR');
    }
  }

  /**
   * Extrae metadatos de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} - Metadatos extraídos
   */
  async extractMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      const metadata = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: fileExtension,
        type: this.getFileType(fileExtension)
      };

      // Metadatos específicos por tipo de archivo
      if (fileExtension === '.pdf') {
        const pdfMetadata = await this.extractPDFMetadata(filePath);
        metadata.pdf = pdfMetadata;
      }

      return metadata;
    } catch (error) {
      console.error('Error extrayendo metadatos:', error);
      return null;
    }
  }

  /**
   * Extrae metadatos específicos de PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<Object>} - Metadatos del PDF
   */
  async extractPDFMetadata(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        pages: data.numpages,
        info: data.info || {},
        version: data.version || 'unknown'
      };
    } catch (error) {
      console.error('Error extrayendo metadatos de PDF:', error);
      return null;
    }
  }

  /**
   * Determina el tipo de archivo basado en la extensión
   * @param {string} extension - Extensión del archivo
   * @returns {string} - Tipo de archivo
   */
  getFileType(extension) {
    const types = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.txt': 'document',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.bmp': 'image',
      '.tiff': 'image'
    };

    return types[extension] || 'unknown';
  }

  /**
   * Valida si un archivo es procesable por OCR
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - True si es procesable
   */
  isProcessable(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    return supportedExtensions.includes(extension);
  }

  /**
   * Limpia y normaliza el texto extraído
   * @param {string} text - Texto a limpiar
   * @returns {string} - Texto limpio
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // Eliminar caracteres de control
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      // Normalizar espacios en blanco
      .replace(/\s+/g, ' ')
      // Eliminar espacios al inicio y final
      .trim()
      // Eliminar líneas vacías múltiples
      .replace(/\n\s*\n/g, '\n')
      // Limitar longitud si es muy largo
      .substring(0, 50000); // Máximo 50k caracteres
  }

  /**
   * Extrae palabras clave del texto
   * @param {string} text - Texto del cual extraer palabras clave
   * @returns {Array<string>} - Array de palabras clave
   */
  extractKeywords(text) {
    if (!text) return [];

    // Palabras comunes a filtrar (stop words en español)
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
      'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como',
      'pero', 'sus', 'han', 'fue', 'ser', 'está', 'son', 'desde', 'este', 'esta', 'hasta'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter(word => !/^\d+$/.test(word)); // Filtrar números puros

    // Contar frecuencia de palabras
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Ordenar por frecuencia y tomar las top 20
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Detecta el idioma del texto
   * @param {string} text - Texto a analizar
   * @returns {string} - Código del idioma detectado
   */
  detectLanguage(text) {
    if (!text) return 'unknown';

    // Palabras comunes en español
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le'];
    // Palabras comunes en inglés
    const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on'];

    const words = text.toLowerCase().split(/\s+/).slice(0, 100); // Analizar primeras 100 palabras
    
    let spanishCount = 0;
    let englishCount = 0;

    words.forEach(word => {
      if (spanishWords.includes(word)) spanishCount++;
      if (englishWords.includes(word)) englishCount++;
    });

    if (spanishCount > englishCount) return 'es';
    if (englishCount > spanishCount) return 'en';
    return 'unknown';
  }
}

module.exports = new OCRService();

