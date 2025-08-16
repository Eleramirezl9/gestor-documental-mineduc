// Temporal fix for production deployment
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.log('⚠️ Axios not available, using fetch fallback');
  // Fallback simple para producción sin axios
  axios = {
    post: async (url, data, config) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers
        },
        body: JSON.stringify(data)
      });
      return { data: await response.json() };
    }
  };
}

/**
 * Servicio de IA para generación inteligente de mensajes de notificaciones
 * Utiliza Groq API (gratuita) como alternativa a OpenAI
 */
class AIMessageService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    this.useGroq = !!process.env.GROQ_API_KEY;
    this.baseURL = this.useGroq 
      ? 'https://api.groq.com/openai/v1' 
      : 'https://api.openai.com/v1';
    this.model = this.useGroq ? 'llama3-70b-8192' : 'gpt-3.5-turbo';
  }

  /**
   * Genera un mensaje personalizado para notificaciones
   */
  async generateNotificationMessage({ 
    type, 
    context, 
    userName, 
    documentTitle, 
    daysUntilExpiration, 
    urgencyLevel,
    userRole,
    organizationalLevel 
  }) {
    try {
      const prompt = this.buildPrompt({
        type,
        context,
        userName,
        documentTitle,
        daysUntilExpiration,
        urgencyLevel,
        userRole,
        organizationalLevel
      });

      const response = await this.callAI(prompt, {
        maxTokens: 200,
        temperature: 0.7
      });

      return {
        success: true,
        message: response.trim(),
        suggestions: await this.generateAlternatives(prompt)
      };

    } catch (error) {
      console.error('Error generando mensaje con IA:', error);
      
      // Fallback a mensajes predefinidos
      return {
        success: false,
        message: this.getFallbackMessage({ type, documentTitle, daysUntilExpiration, userName }),
        suggestions: [],
        error: error.message
      };
    }
  }

  /**
   * Construye el prompt para la IA
   */
  buildPrompt({ type, context, userName, documentTitle, daysUntilExpiration, urgencyLevel, userRole, organizationalLevel }) {
    let basePrompt = `Eres un asistente especializado en generar mensajes profesionales para el Ministerio de Educación de Guatemala (MINEDUC). 

Contexto: Sistema de gestión documental gubernamental
Usuario: ${userName || 'Usuario'} (${userRole || 'empleado'})
Nivel organizacional: ${organizationalLevel || 'departamental'}

Genera un mensaje ${this.getMessageStyle(urgencyLevel)} en español que sea:
- Profesional pero amigable
- Claro y directo
- Apropiado para el contexto gubernamental
- Máximo 150 palabras
- Que motive a la acción sin ser alarmista

`;

    switch (type) {
      case 'document_expiration':
        basePrompt += `Tipo: Notificación de vencimiento de documento
Documento: "${documentTitle}"
Días hasta vencimiento: ${daysUntilExpiration}
Urgencia: ${urgencyLevel}

El mensaje debe:
- Informar sobre el vencimiento próximo
- Explicar la importancia de renovar/actualizar
- Proporcionar pasos claros a seguir
- Mantener un tono apropiado según la urgencia`;
        break;

      case 'document_required':
        basePrompt += `Tipo: Nuevo documento requerido
Documento: "${documentTitle}"
Contexto adicional: ${context || 'Requerimiento estándar'}

El mensaje debe:
- Explicar qué documento se necesita
- Indicar la fecha límite
- Proporcionar orientación sobre cómo proceder
- Ser motivador y servicial`;
        break;

      case 'organizational_change':
        basePrompt += `Tipo: Cambio organizacional
Título: "${documentTitle}"
Contexto: ${context}

El mensaje debe:
- Explicar el cambio de manera clara
- Destacar el impacto en las responsabilidades documentales
- Proporcionar tranquilidad y orientación
- Fomentar la colaboración`;
        break;

      case 'reminder':
        basePrompt += `Tipo: Recordatorio
Asunto: "${documentTitle}"
Contexto: ${context}

El mensaje debe:
- Ser un recordatorio amable
- Incluir información relevante
- Motivar a completar la tarea
- Ofrecer ayuda si es necesario`;
        break;

      default:
        basePrompt += `Tipo: Notificación general
Asunto: "${documentTitle || 'Actualización del sistema'}"
Contexto: ${context}

El mensaje debe ser informativo y profesional.`;
    }

    basePrompt += `\n\nGenera SOLO el contenido del mensaje, sin saludos ni firmas adicionales:`;

    return basePrompt;
  }

  /**
   * Obtiene el estilo de mensaje según la urgencia
   */
  getMessageStyle(urgencyLevel) {
    switch (urgencyLevel) {
      case 'urgent':
        return 'urgente pero respetuoso';
      case 'high':
        return 'importante y directo';
      case 'medium':
        return 'informativo y claro';
      case 'low':
        return 'amigable e informativo';
      default:
        return 'profesional';
    }
  }

  /**
   * Llama a la API de IA
   */
  async callAI(prompt, options = {}) {
    const { maxTokens = 150, temperature = 0.7 } = options;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente especializado en comunicación profesional para instituciones gubernamentales.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('API key inválida o expirada');
      } else if (error.response?.status === 429) {
        throw new Error('Límite de API alcanzado');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout en la conexión con IA');
      }
      throw error;
    }
  }

  /**
   * Genera alternativas de mensaje
   */
  async generateAlternatives(originalPrompt) {
    try {
      const alternativePrompt = originalPrompt + `\n\nGenera 2 versiones alternativas más breves (máximo 80 palabras cada una) del mismo mensaje:`;
      
      const response = await this.callAI(alternativePrompt, {
        maxTokens: 200,
        temperature: 0.8
      });

      return response.split('\n').filter(line => line.trim().length > 20).slice(0, 2);
    } catch (error) {
      console.error('Error generando alternativas:', error);
      return [];
    }
  }

  /**
   * Genera sugerencias de asunto para emails
   */
  async generateSubjectSuggestions({ type, documentTitle, urgencyLevel, daysUntilExpiration }) {
    try {
      const prompt = `Genera 3 líneas de asunto profesionales para un email del MINEDUC sobre:

Tipo: ${type}
Documento: ${documentTitle}
Urgencia: ${urgencyLevel}
${daysUntilExpiration ? `Días hasta vencimiento: ${daysUntilExpiration}` : ''}

Los asuntos deben ser:
- Concisos (máximo 60 caracteres)
- Claros sobre el contenido
- Apropiados para el nivel de urgencia
- Profesionales para contexto gubernamental

Formato: solo las 3 líneas de asunto, numeradas.`;

      const response = await this.callAI(prompt, {
        maxTokens: 100,
        temperature: 0.6
      });

      return response.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 3);

    } catch (error) {
      console.error('Error generando asuntos:', error);
      return this.getFallbackSubjects({ type, documentTitle, urgencyLevel });
    }
  }

  /**
   * Analiza el sentimiento de un mensaje
   */
  async analyzeSentiment(message) {
    try {
      const prompt = `Analiza el tono y sentimiento de este mensaje institucional y califica del 1 al 5:

Mensaje: "${message}"

Califica estos aspectos (1=muy bajo, 5=muy alto):
- Profesionalismo
- Claridad
- Urgencia apropiada
- Amabilidad
- Efectividad comunicativa

Formato: solo números separados por comas (ej: 4,5,3,4,5)`;

      const response = await this.callAI(prompt, {
        maxTokens: 50,
        temperature: 0.3
      });

      const scores = response.split(',').map(score => parseInt(score.trim()));
      
      if (scores.length >= 5) {
        return {
          professionalism: scores[0],
          clarity: scores[1],
          urgency: scores[2],
          friendliness: scores[3],
          effectiveness: scores[4],
          overall: scores.reduce((a, b) => a + b, 0) / scores.length
        };
      }

      return null;
    } catch (error) {
      console.error('Error analizando sentimiento:', error);
      return null;
    }
  }

  /**
   * Mejora un mensaje existente
   */
  async improveMessage(originalMessage, improvementType = 'general') {
    try {
      let improvementPrompt;
      
      switch (improvementType) {
        case 'shorter':
          improvementPrompt = 'Haz este mensaje más conciso manteniendo la información esencial';
          break;
        case 'friendlier':
          improvementPrompt = 'Haz este mensaje más amigable sin perder profesionalismo';
          break;
        case 'urgent':
          improvementPrompt = 'Haz este mensaje más urgente pero sin alarmar';
          break;
        case 'clearer':
          improvementPrompt = 'Haz este mensaje más claro y fácil de entender';
          break;
        default:
          improvementPrompt = 'Mejora este mensaje manteniendo el tono profesional';
      }

      const prompt = `${improvementPrompt}:

Mensaje original: "${originalMessage}"

Genera una versión mejorada (máximo 120 palabras):`;

      const response = await this.callAI(prompt, {
        maxTokens: 150,
        temperature: 0.6
      });

      return response.trim();
    } catch (error) {
      console.error('Error mejorando mensaje:', error);
      return originalMessage;
    }
  }

  /**
   * Mensajes de fallback cuando la IA no está disponible
   */
  getFallbackMessage({ type, documentTitle, daysUntilExpiration, userName }) {
    const templates = {
      document_expiration: {
        urgent: `Estimado/a ${userName}, su documento "${documentTitle}" vence HOY. Es necesario que proceda con la renovación inmediatamente para evitar interrupciones en sus actividades.`,
        high: `Estimado/a ${userName}, su documento "${documentTitle}" vence en ${daysUntilExpiration} día${daysUntilExpiration > 1 ? 's' : ''}. Le recomendamos iniciar el proceso de renovación lo antes posible.`,
        medium: `Estimado/a ${userName}, le recordamos que su documento "${documentTitle}" vence en ${daysUntilExpiration} días. Por favor, considere iniciar el proceso de renovación.`
      },
      document_required: `Estimado/a ${userName}, se le ha asignado un nuevo documento requerido: "${documentTitle}". Por favor, revise los detalles y proceda según las instrucciones proporcionadas.`,
      organizational_change: `Estimado equipo, se ha implementado un cambio organizacional que puede afectar sus responsabilidades documentales. Por favor, revise la información detallada para conocer los ajustes necesarios.`
    };

    if (type === 'document_expiration') {
      const urgency = daysUntilExpiration <= 1 ? 'urgent' : daysUntilExpiration <= 7 ? 'high' : 'medium';
      return templates.document_expiration[urgency];
    }

    return templates[type] || `Estimado/a ${userName}, tiene una nueva notificación del sistema de gestión documental que requiere su atención.`;
  }

  /**
   * Asuntos de fallback
   */
  getFallbackSubjects({ type, documentTitle, urgencyLevel }) {
    const subjects = {
      document_expiration: {
        urgent: [`[URGENTE] Documento vence HOY - ${documentTitle}`, `ACCIÓN INMEDIATA: ${documentTitle}`, `VENCIMIENTO HOY: ${documentTitle}`],
        high: [`Documento próximo a vencer - ${documentTitle}`, `IMPORTANTE: ${documentTitle} vence pronto`, `Renovación requerida: ${documentTitle}`],
        medium: [`Recordatorio: ${documentTitle}`, `Documento por vencer: ${documentTitle}`, `Renovación pendiente: ${documentTitle}`]
      },
      document_required: [`Nuevo documento requerido - ${documentTitle}`, `Asignación documental: ${documentTitle}`, `Requerimiento: ${documentTitle}`],
      organizational_change: [`Cambio organizacional - MINEDUC`, `Actualización organizacional`, `Cambios en responsabilidades documentales`]
    };

    if (type === 'document_expiration' && subjects[type][urgencyLevel]) {
      return subjects[type][urgencyLevel];
    }

    return subjects[type] || [`Notificación del sistema - ${documentTitle}`, `Actualización importante`, `Atención requerida`];
  }

  /**
   * Verifica si el servicio de IA está disponible
   */
  async checkAvailability() {
    try {
      await this.callAI('Test', { maxTokens: 10 });
      return { available: true, provider: this.useGroq ? 'Groq' : 'OpenAI' };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
}

module.exports = new AIMessageService();