const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const OpenAI = require('openai');
const crypto = require('crypto');
const sharp = require('sharp');

// Inicializar OpenAI con GPT-5 Nano
const openai = new OpenAI({
  apiKey: process.env.GPT5_NANO_API_KEY || process.env.OPENAI_API_KEY,
});

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
 * Clasifica un documento usando OpenAI GPT-5 Nano
 */
async function classifyDocument(text, fileName) {
  try {
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo económico y rápido de OpenAI
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en clasificación de documentos gubernamentales. Respondes únicamente en formato JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Baja temperatura para respuestas más consistentes
      max_tokens: 500,
      response_format: { type: 'json_object' } // Forzar respuesta JSON
    });

    const responseText = completion.choices[0].message.content;

    // Parsear el JSON
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (error) {
    console.error('Error classifying document:', error);
    console.warn('⚠️  AI classification failed, continuing without classification');
    return null; // Devolver null en lugar de lanzar error
  }
}

/**
 * Limpia el texto eliminando caracteres nulos y otros caracteres problemáticos para PostgreSQL
 */
function sanitizeText(text) {
  if (!text) return '';

  // Eliminar caracteres nulos (\u0000) y otros caracteres de control problemáticos
  return text
    .replace(/\u0000/g, '') // Eliminar caracteres nulos
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Eliminar otros caracteres de control
    .trim();
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

    // Verificar si el procesamiento de IA está desactivado
    const aiDisabled = process.env.DISABLE_AI_PROCESSING === 'true';

    // Extraer texto según el tipo de archivo
    let extractedText = '';

    if (!aiDisabled) {
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

      // Limpiar el texto extraído eliminando caracteres nulos y problemáticos
      extractedText = sanitizeText(extractedText);
    } else {
      console.log('⚠️  IA DESACTIVADA - Procesamiento sin OCR ni clasificación');
    }

    // Clasificar documento usando AI
    let aiClassification = null;
    if (!aiDisabled && extractedText && extractedText.length > 10) {
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
  sanitizeText,
};
