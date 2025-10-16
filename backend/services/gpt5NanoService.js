const OpenAI = require('openai');

/**
 * Servicio para GPT-5 Nano - Generación de contenido personalizado de emails
 * Integración con API de OpenAI usando gpt5nano-tesis
 */
class GPT5NanoService {
  constructor() {
    // Inicializar cliente de OpenAI con la nueva API key
    this.client = new OpenAI({
      apiKey: process.env.GPT5_NANO_API_KEY || process.env.OPENAI_API_KEY
    });

    this.model = 'gpt-4o-mini'; // Modelo eficiente para generación de emails
    this.isAvailable = !!this.client.apiKey;

    if (this.isAvailable) {
      console.log('✅ GPT-5 Nano Service inicializado correctamente');
    } else {
      console.warn('⚠️ GPT-5 Nano API Key no configurada');
    }
  }

  /**
   * Genera contenido personalizado para email de documento por vencer
   * @param {Object} context - Contexto del documento y empleado
   * @returns {Promise<Object>} Contenido generado
   */
  async generateExpirationEmailContent(context) {
    try {
      const {
        employeeName,
        documentType,
        daysUntilExpiration,
        expirationDate,
        urgencyLevel,
        employeeCode
      } = context;

      // Determinar tono según urgencia
      const urgencyTone = this.getUrgencyTone(daysUntilExpiration);

      const prompt = `Genera un email profesional para notificar a un empleado del Ministerio de Educación de Guatemala (MINEDUC) sobre un documento próximo a vencer.

INFORMACIÓN DEL CONTEXTO:
- Empleado: ${employeeName}
- Código de empleado: ${employeeCode}
- Documento: ${documentType}
- Días hasta vencimiento: ${daysUntilExpiration}
- Fecha de vencimiento: ${expirationDate}
- Nivel de urgencia: ${urgencyLevel}

INSTRUCCIONES:
1. Usa un tono ${urgencyTone}
2. Sé claro y conciso
3. Incluye la información de vencimiento
4. Motiva a la acción inmediata si es urgente
5. Mantén un tono profesional pero humano
6. No uses placeholders, usa los datos reales proporcionados
7. Máximo 150 palabras

Genera SOLO el cuerpo del email en español, sin incluir asunto ni firmas.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en redacción de comunicaciones institucionales para el sector público guatemalteco. Tu estilo es profesional, claro y empático.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const generatedContent = response.choices[0].message.content.trim();

      return {
        success: true,
        subject: this.generateSubject(documentType, daysUntilExpiration, urgencyLevel),
        body: generatedContent,
        metadata: {
          model: this.model,
          tokens: response.usage.total_tokens,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error generando contenido con GPT-5 Nano:', error);

      // Fallback: contenido predeterminado
      return this.generateFallbackContent(context);
    }
  }

  /**
   * Genera asunto del email
   */
  generateSubject(documentType, daysUntilExpiration, urgencyLevel) {
    if (daysUntilExpiration <= 3) {
      return `🔴 URGENTE: ${documentType} vence en ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}`;
    } else if (daysUntilExpiration <= 7) {
      return `⚠️ Importante: ${documentType} próximo a vencer (${daysUntilExpiration} días)`;
    } else if (daysUntilExpiration <= 15) {
      return `Recordatorio: Renovación de ${documentType} - ${daysUntilExpiration} días`;
    } else {
      return `Notificación: ${documentType} requiere renovación próximamente`;
    }
  }

  /**
   * Determina el tono según días hasta vencimiento
   */
  getUrgencyTone(daysUntilExpiration) {
    if (daysUntilExpiration <= 3) {
      return 'urgente, directo y motivador a la acción inmediata';
    } else if (daysUntilExpiration <= 7) {
      return 'serio pero amigable, enfatizando la importancia';
    } else if (daysUntilExpiration <= 15) {
      return 'informativo y cordial, recordando la fecha límite';
    } else {
      return 'informativo y preventivo, dando tiempo para planificar';
    }
  }

  /**
   * Genera múltiples variaciones de asunto
   */
  async generateSubjectVariations(context) {
    try {
      const { documentType, daysUntilExpiration, urgencyLevel } = context;

      const prompt = `Genera 3 líneas de asunto diferentes para un email sobre un documento próximo a vencer.

CONTEXTO:
- Documento: ${documentType}
- Días hasta vencimiento: ${daysUntilExpiration}
- Urgencia: ${urgencyLevel}

Genera 3 líneas de asunto variadas:
1. Opción formal y directa
2. Opción amigable pero profesional
3. Opción con emoji y urgencia visual

Formato: Devuelve solo las 3 líneas, una por línea, sin numeración ni explicaciones.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Eres experto en copywriting para emails institucionales.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 150
      });

      const subjects = response.choices[0].message.content
        .trim()
        .split('\n')
        .filter(s => s.trim().length > 0)
        .slice(0, 3);

      return {
        success: true,
        subjects
      };
    } catch (error) {
      console.error('Error generando variaciones de asunto:', error);
      return {
        success: false,
        subjects: [
          this.generateSubject(context.documentType, context.daysUntilExpiration, context.urgencyLevel)
        ]
      };
    }
  }

  /**
   * Mejora un contenido existente según tipo de mejora
   */
  async improveContent(content, improvementType) {
    try {
      const improvementPrompts = {
        shorter: 'Hazlo más conciso y directo, manteniendo los puntos clave',
        friendlier: 'Hazlo más amigable y cercano, pero mantén el profesionalismo',
        urgent: 'Aumenta la urgencia y el llamado a la acción',
        clearer: 'Hazlo más claro y fácil de entender',
        formal: 'Aumenta la formalidad y el tono institucional'
      };

      const instruction = improvementPrompts[improvementType] || improvementPrompts.clearer;

      const prompt = `Mejora el siguiente contenido de email: ${instruction}

CONTENIDO ORIGINAL:
${content}

Genera el contenido mejorado en español, sin explicaciones adicionales.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Eres un editor experto en comunicaciones institucionales.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return {
        success: true,
        improvedContent: response.choices[0].message.content.trim()
      };
    } catch (error) {
      console.error('Error mejorando contenido:', error);
      return {
        success: false,
        improvedContent: content
      };
    }
  }

  /**
   * Genera resumen para múltiples documentos
   */
  async generateBulkSummary(documents) {
    try {
      const docList = documents.map((doc, idx) =>
        `${idx + 1}. ${doc.documentType} - Vence en ${doc.daysUntilExpiration} días (${doc.employeeName})`
      ).join('\n');

      const prompt = `Genera un resumen ejecutivo para el administrador sobre los siguientes documentos próximos a vencer:

${docList}

El resumen debe:
1. Indicar el total de documentos
2. Resaltar los más urgentes
3. Dar una visión general de la situación
4. Ser conciso (máximo 100 palabras)

Genera solo el resumen en español.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Eres un analista de gestión documental.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 200
      });

      return {
        success: true,
        summary: response.choices[0].message.content.trim()
      };
    } catch (error) {
      console.error('Error generando resumen masivo:', error);
      return {
        success: false,
        summary: `Se encontraron ${documents.length} documentos próximos a vencer. Revise el detalle para más información.`
      };
    }
  }

  /**
   * Genera contenido fallback sin IA
   */
  generateFallbackContent(context) {
    const {
      employeeName,
      documentType,
      daysUntilExpiration,
      expirationDate,
      urgencyLevel
    } = context;

    let body = `Estimado/a ${employeeName},\n\n`;

    if (daysUntilExpiration <= 3) {
      body += `Le recordamos con URGENCIA que su documento "${documentType}" está próximo a vencer en ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''} (${expirationDate}).\n\n`;
      body += `Es crucial que renueve este documento de inmediato para evitar inconvenientes en sus actividades laborales.\n\n`;
    } else if (daysUntilExpiration <= 7) {
      body += `Le informamos que su documento "${documentType}" vencerá en ${daysUntilExpiration} días (${expirationDate}).\n\n`;
      body += `Le solicitamos gestionar la renovación de este documento lo antes posible.\n\n`;
    } else {
      body += `Le recordamos que su documento "${documentType}" tiene fecha de vencimiento el ${expirationDate} (en ${daysUntilExpiration} días).\n\n`;
      body += `Le sugerimos iniciar el proceso de renovación con anticipación para evitar contratiempos.\n\n`;
    }

    body += `Para cualquier consulta, puede comunicarse con el área de Recursos Humanos.\n\nAtentamente,\nSistema de Gestión Documental\nMINEDUC`;

    return {
      success: false,
      aiGenerated: false,
      subject: this.generateSubject(documentType, daysUntilExpiration, urgencyLevel),
      body,
      metadata: {
        fallback: true,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Verifica disponibilidad del servicio
   */
  async checkAvailability() {
    if (!this.isAvailable) {
      return {
        available: false,
        error: 'API Key no configurada'
      };
    }

    try {
      // Test simple
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });

      return {
        available: true,
        model: this.model
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene estado del servicio
   */
  getStatus() {
    return {
      available: this.isAvailable,
      model: this.model,
      provider: 'OpenAI GPT-5 Nano'
    };
  }
}

module.exports = new GPT5NanoService();
