const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const sharp = require('sharp');

// Inicializar Google AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

/**
 * Extrae texto de una imagen usando Tesseract OCR
 */
async function extractTextFromImage(buffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(buffer, 'spa', {
      logger: m => console.log(m),
    });
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extrae texto de un PDF
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error.message);
    console.warn('⚠️  PDF text extraction failed, continuing without text extraction');
    return ''; // Devolver cadena vacía en lugar de lanzar error
  }
}

/**
 * Clasifica un documento usando Google AI (Gemini)
 */
async function classifyDocument(text, fileName) {
  try {
    // Intentar con diferentes modelos hasta encontrar uno disponible
    let model;
    try {
      // Primero intentar con gemini-pro (modelo estable y disponible)
      model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    } catch (e) {
      console.warn('⚠️  gemini-pro no disponible, intentando con models/gemini-pro');
      model = genAI.getGenerativeModel({ model: 'models/gemini-pro' });
    }

    const prompt = `Eres un asistente experto en clasificación de documentos del Ministerio de Educación de Guatemala (MINEDUC).
Analiza el contenido del documento y clasifícalo en una de estas categorías:
- Contratos y Acuerdos
- Resoluciones
- Actas
- Informes
- Certificaciones
- Correspondencia
- Otros

También identifica:
- Nivel de prioridad (bajo, normal, alto, urgente)
- Palabras clave relevantes (máximo 10)
- Idioma del documento
- Si tiene fecha de vencimiento
- Nivel de clasificación (public, internal, confidential, secret)

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta (sin texto adicional):
{
  "category": "nombre de la categoría",
  "priority": "prioridad",
  "keywords": ["palabra1", "palabra2"],
  "language": "es",
  "hasExpiration": true,
  "classificationLevel": "nivel",
  "confidence": 0.95,
  "summary": "resumen breve del documento"
}

Nombre del archivo: ${fileName}

Contenido:
${text.substring(0, 4000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    // Limpiar la respuesta y extraer solo el JSON
    let jsonText = textResponse.trim();

    // Remover bloques de código markdown si existen
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Intentar parsear el JSON
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error('Error classifying document:', error);
    console.warn('⚠️  AI classification failed, continuing without classification');
    return null; // Devolver null en lugar de lanzar error
  }
}

/**
 * Genera un hash único del archivo para detectar duplicados
 */
function generateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Optimiza una imagen para almacenamiento
 */
async function optimizeImage(buffer, mimeType) {
  try {
    // Solo optimizar imágenes, no PDFs
    if (!mimeType.startsWith('image/')) {
      return buffer;
    }

    const optimized = await sharp(buffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return buffer; // Retornar original si falla la optimización
  }
}

/**
 * Procesa un documento completo
 */
async function processDocument(file) {
  try {
    const { buffer, originalname, mimetype, size } = file;

    // Generar hash del archivo
    const fileHash = generateFileHash(buffer);

    // Extraer texto según el tipo de archivo
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer);
    } else if (mimetype.startsWith('image/')) {
      extractedText = await extractTextFromImage(buffer);
    } else if (mimetype.includes('word') || mimetype.includes('document')) {
      // Para documentos de Word, por ahora no extraemos texto
      extractedText = `Documento: ${originalname}`;
    } else {
      extractedText = `Archivo: ${originalname}`;
    }

    // Clasificar documento usando AI
    let aiClassification = null;
    if (extractedText && extractedText.length > 10) {
      aiClassification = await classifyDocument(extractedText, originalname);
    }

    // Optimizar imagen si es necesario
    let processedBuffer = buffer;
    if (mimetype.startsWith('image/')) {
      processedBuffer = await optimizeImage(buffer, mimetype);
    }

    return {
      fileHash,
      extractedText,
      aiClassification,
      processedBuffer,
      originalSize: size,
      processedSize: processedBuffer.length,
      compressionRatio: size > 0 ? ((size - processedBuffer.length) / size * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Valida el tipo de archivo permitido
 */
function validateFileType(mimetype) {
  const allowedTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    // PDFs
    'application/pdf',
    // Documentos
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Texto
    'text/plain',
    'text/csv',
    // Archivos comprimidos
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ];

  return allowedTypes.includes(mimetype);
}

/**
 * Obtiene la extensión del archivo desde el nombre o mime type
 */
function getFileExtension(filename, mimetype) {
  // Primero intentar desde el nombre del archivo
  const extFromName = filename.split('.').pop().toLowerCase();
  if (extFromName && extFromName.length <= 5) {
    return extFromName;
  }

  // Si no, mapear desde mime type
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
  };

  return mimeToExt[mimetype] || 'bin';
}

module.exports = {
  processDocument,
  extractTextFromImage,
  extractTextFromPDF,
  classifyDocument,
  generateFileHash,
  optimizeImage,
  validateFileType,
  getFileExtension,
};
