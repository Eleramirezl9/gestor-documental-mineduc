const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE
    });
  }

  /**
   * Clasifica un documento automáticamente usando IA
   * @param {string} text - Texto del documento
   * @param {string} fileName - Nombre del archivo
   * @returns {Promise<Object>} - Clasificación del documento
   */
  async classifyDocument(text, fileName = '') {
    try {
      if (!text || text.trim().length < 50) {
        return {
          category: 'Sin clasificar',
          confidence: 0,
          tags: [],
          summary: 'Texto insuficiente para clasificación',
          language: 'unknown'
        };
      }

      const prompt = this.buildClassificationPrompt(text, fileName);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en clasificación de documentos gubernamentales del Ministerio de Educación de Guatemala. Analiza documentos y proporciona clasificaciones precisas en formato JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const result = response.choices[0].message.content;
      return this.parseClassificationResult(result);

    } catch (error) {
      console.error('Error en clasificación IA:', error);
      return {
        category: 'Error en clasificación',
        confidence: 0,
        tags: [],
        summary: 'Error procesando documento con IA',
        language: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Construye el prompt para clasificación
   * @param {string} text - Texto del documento
   * @param {string} fileName - Nombre del archivo
   * @returns {string} - Prompt construido
   */
  buildClassificationPrompt(text, fileName) {
    const textSample = text.substring(0, 2000); // Limitar a 2000 caracteres

    return `
Analiza el siguiente documento del Ministerio de Educación de Guatemala y clasifícalo:

NOMBRE DEL ARCHIVO: ${fileName}

CONTENIDO DEL DOCUMENTO:
${textSample}

Proporciona la clasificación en el siguiente formato JSON exacto:
{
  "category": "una de: Administrativo, Académico, Legal, Financiero, Recursos Humanos, Infraestructura",
  "confidence": número entre 0 y 1,
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "resumen breve del documento en máximo 200 caracteres",
  "language": "es o en",
  "document_type": "tipo específico como reglamento, manual, acuerdo, etc.",
  "priority": "low, medium, high",
  "requires_approval": true o false,
  "sensitive_info": true o false
}

Considera:
- El contexto educativo guatemalteco
- Terminología gubernamental
- Importancia del documento
- Si contiene información sensible
- Si requiere aprobación formal
`;
  }

  /**
   * Parsea el resultado de la clasificación
   * @param {string} result - Resultado de la IA
   * @returns {Object} - Objeto de clasificación parseado
   */
  parseClassificationResult(result) {
    try {
      // Intentar parsear JSON directamente
      const parsed = JSON.parse(result);
      
      // Validar y limpiar el resultado
      return {
        category: this.validateCategory(parsed.category),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
        summary: (parsed.summary || '').substring(0, 200),
        language: ['es', 'en'].includes(parsed.language) ? parsed.language : 'es',
        document_type: parsed.document_type || 'documento',
        priority: ['low', 'medium', 'high'].includes(parsed.priority) ? parsed.priority : 'medium',
        requires_approval: Boolean(parsed.requires_approval),
        sensitive_info: Boolean(parsed.sensitive_info),
        processed_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parseando resultado de IA:', error);
      
      // Intentar extraer información básica del texto
      return this.fallbackClassification(result);
    }
  }

  /**
   * Valida la categoría devuelta por la IA
   * @param {string} category - Categoría a validar
   * @returns {string} - Categoría válida
   */
  validateCategory(category) {
    const validCategories = [
      'Administrativo',
      'Académico', 
      'Legal',
      'Financiero',
      'Recursos Humanos',
      'Infraestructura'
    ];

    if (validCategories.includes(category)) {
      return category;
    }

    // Intentar mapear categorías similares
    const categoryMap = {
      'admin': 'Administrativo',
      'administracion': 'Administrativo',
      'academico': 'Académico',
      'educativo': 'Académico',
      'juridico': 'Legal',
      'normativo': 'Legal',
      'presupuesto': 'Financiero',
      'economia': 'Financiero',
      'personal': 'Recursos Humanos',
      'rrhh': 'Recursos Humanos',
      'construccion': 'Infraestructura',
      'mantenimiento': 'Infraestructura'
    };

    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }

    return 'Administrativo'; // Categoría por defecto
  }

  /**
   * Clasificación de respaldo cuando falla el parsing
   * @param {string} text - Texto de respuesta de la IA
   * @returns {Object} - Clasificación básica
   */
  fallbackClassification(text) {
    return {
      category: 'Administrativo',
      confidence: 0.1,
      tags: ['sin-clasificar'],
      summary: 'Error en clasificación automática',
      language: 'es',
      document_type: 'documento',
      priority: 'medium',
      requires_approval: true,
      sensitive_info: false,
      processed_at: new Date().toISOString(),
      error: 'Fallback classification used'
    };
  }

  /**
   * Genera un resumen del documento
   * @param {string} text - Texto del documento
   * @returns {Promise<string>} - Resumen generado
   */
  async generateSummary(text) {
    try {
      if (!text || text.trim().length < 100) {
        return 'Texto insuficiente para generar resumen';
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en resumir documentos gubernamentales. Crea resúmenes concisos y precisos en español.'
          },
          {
            role: 'user',
            content: `Resume el siguiente documento en máximo 150 palabras, destacando los puntos más importantes:\n\n${text.substring(0, 3000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generando resumen:', error);
      return 'Error generando resumen automático';
    }
  }

  /**
   * Extrae entidades nombradas del texto
   * @param {string} text - Texto del documento
   * @returns {Promise<Object>} - Entidades extraídas
   */
  async extractEntities(text) {
    try {
      if (!text || text.trim().length < 50) {
        return { persons: [], organizations: [], locations: [], dates: [] };
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extrae entidades nombradas de documentos gubernamentales guatemaltecos. Responde solo en formato JSON.'
          },
          {
            role: 'user',
            content: `Extrae las siguientes entidades del texto en formato JSON:
{
  "persons": ["nombres de personas"],
  "organizations": ["organizaciones, ministerios, instituciones"],
  "locations": ["lugares, departamentos, municipios"],
  "dates": ["fechas importantes"],
  "laws": ["leyes, decretos, acuerdos mencionados"]
}

TEXTO:
${text.substring(0, 2000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      console.error('Error extrayendo entidades:', error);
      return { persons: [], organizations: [], locations: [], dates: [], laws: [] };
    }
  }

  /**
   * Sugiere tags para el documento
   * @param {string} text - Texto del documento
   * @param {string} category - Categoría del documento
   * @returns {Promise<Array<string>>} - Tags sugeridos
   */
  async suggestTags(text, category = '') {
    try {
      if (!text || text.trim().length < 50) {
        return [];
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Sugiere tags relevantes para documentos gubernamentales del MINEDUC Guatemala. Responde solo con una lista de palabras separadas por comas.'
          },
          {
            role: 'user',
            content: `Sugiere 5-8 tags relevantes para este documento de categoría "${category}":

${text.substring(0, 1500)}

Responde solo con tags separados por comas, sin explicaciones.`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const tagsText = response.choices[0].message.content.trim();
      return tagsText
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 2 && tag.length < 30)
        .slice(0, 8);

    } catch (error) {
      console.error('Error sugiriendo tags:', error);
      return [];
    }
  }

  /**
   * Verifica si el servicio de IA está disponible
   * @returns {Promise<boolean>} - True si está disponible
   */
  async isAvailable() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return false;
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });

      return response.choices && response.choices.length > 0;

    } catch (error) {
      console.error('IA service not available:', error);
      return false;
    }
  }
}

module.exports = new AIService();

