const { supabase } = require('../config/supabase');

/**
 * Servicio para gestión integral de colaboradores y sus documentos
 * Incluye control de vencimientos, notificaciones automáticas y reportes
 */
class EmployeeDocumentService {
  
  /**
   * Registrar un nuevo colaborador en el sistema
   */
  async registerEmployee(employeeData) {
    try {
      const {
        email,
        first_name,
        last_name,
        department,
        phone,
        employee_id,
        position,
        hire_date,
        required_documents = []
      } = employeeData;

      // 1. Crear perfil de usuario
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          email,
          first_name,
          last_name,
          department,
          phone,
          role: 'viewer', // Por defecto
          is_active: true,
          employee_id,
          position,
          hire_date
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Crear documentos requeridos iniciales
      if (required_documents.length > 0) {
        const documentsToInsert = required_documents.map(doc => ({
          user_id: userProfile.id,
          document_type: doc.type,
          required_date: doc.required_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
          status: 'pending',
          description: doc.description || `Documento requerido para ${first_name} ${last_name}`,
          created_by: doc.created_by
        }));

        await supabase
          .from('document_requirements')
          .insert(documentsToInsert);
      }

      return {
        success: true,
        employee: userProfile,
        message: `Colaborador ${first_name} ${last_name} registrado exitosamente`
      };

    } catch (error) {
      console.error('Error registrando colaborador:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener colaboradores con estado de sus documentos
   */
  async getEmployeesWithDocumentStatus(filters = {}) {
    try {
      const { 
        department, 
        status, 
        expiring_soon,
        search,
        limit = 50,
        offset = 0 
      } = filters;

      let query = supabase
        .from('user_profiles')
        .select(`
          *,
          documents:documents!user_id(
            id,
            title,
            status,
            expiration_date,
            created_at,
            category:document_categories(name, color)
          ),
          document_requirements:document_requirements!document_requirements_user_id_fkey(
            id,
            document_type,
            status,
            required_date,
            created_at
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (department) {
        query = query.eq('department', department);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Paginación
      query = query.range(offset, offset + limit - 1);

      const { data: employees, error } = await query;
      if (error) throw error;

      // Enriquecer con información de estado de documentos
      const enrichedEmployees = employees.map(employee => {
        const documentStatus = this.calculateDocumentStatus(employee.documents || []);
        const requirementStatus = this.calculateRequirementStatus(employee.document_requirements || []);

        return {
          ...employee,
          document_status: documentStatus,
          requirement_status: requirementStatus,
          overall_status: this.calculateOverallStatus(documentStatus, requirementStatus)
        };
      });

      // Filtrar por estado si se especifica
      let filteredEmployees = enrichedEmployees;
      if (status) {
        filteredEmployees = enrichedEmployees.filter(emp => emp.overall_status === status);
      }

      if (expiring_soon) {
        filteredEmployees = enrichedEmployees.filter(emp => 
          emp.document_status.expiring_soon > 0
        );
      }

      return {
        success: true,
        employees: filteredEmployees,
        total: filteredEmployees.length
      };

    } catch (error) {
      console.error('Error obteniendo colaboradores:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calcular estado de documentos de un colaborador
   */
  calculateDocumentStatus(documents) {
    const now = new Date();
    const status = {
      total: documents.length,
      active: 0,
      expired: 0,
      expiring_soon: 0,
      pending: 0
    };

    documents.forEach(doc => {
      switch (doc.status) {
        case 'active':
          status.active++;
          // Verificar si está por vencer (próximos 30 días)
          if (doc.expiration_date) {
            const expirationDate = new Date(doc.expiration_date);
            const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
              status.expiring_soon++;
            } else if (daysUntilExpiration <= 0) {
              status.expired++;
              status.active--; // No contar como activo si ya venció
            }
          }
          break;
        case 'expired':
          status.expired++;
          break;
        case 'pending':
          status.pending++;
          break;
      }
    });

    return status;
  }

  /**
   * Calcular estado de requerimientos de un colaborador
   */
  calculateRequirementStatus(requirements) {
    const now = new Date();
    const status = {
      total: requirements.length,
      pending: 0,
      overdue: 0,
      completed: 0
    };

    requirements.forEach(req => {
      switch (req.status) {
        case 'pending':
          status.pending++;
          // Verificar si está vencido
          if (req.required_date) {
            const requiredDate = new Date(req.required_date);
            if (requiredDate < now) {
              status.overdue++;
            }
          }
          break;
        case 'completed':
          status.completed++;
          break;
      }
    });

    return status;
  }

  /**
   * Calcular estado general del colaborador
   */
  calculateOverallStatus(documentStatus, requirementStatus) {
    // Prioridades: crítico > atención > normal > completo
    if (documentStatus.expired > 0 || requirementStatus.overdue > 0) {
      return 'critical';
    }
    
    if (documentStatus.expiring_soon > 0 || requirementStatus.pending > 0) {
      return 'attention';
    }
    
    if (documentStatus.pending > 0) {
      return 'normal';
    }
    
    return 'complete';
  }

  /**
   * Obtener documentos que van a vencer pronto
   */
  async getExpiringDocuments(days = 30) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const future = futureDate.toISOString().split('T')[0];

      const { data: expiringDocs, error } = await supabase
        .from('documents')
        .select(`
          *,
          user:user_profiles!user_id(
            id,
            first_name,
            last_name,
            email,
            department,
            phone
          ),
          category:document_categories(name, color)
        `)
        .eq('status', 'active')
        .not('expiration_date', 'is', null)
        .lte('expiration_date', future)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: true });

      if (error) throw error;

      // Agregar días restantes
      const enrichedDocs = expiringDocs.map(doc => {
        const daysUntilExpiration = Math.ceil(
          (new Date(doc.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          ...doc,
          days_until_expiration: daysUntilExpiration,
          urgency: daysUntilExpiration <= 7 ? 'urgent' : daysUntilExpiration <= 15 ? 'high' : 'medium'
        };
      });

      return {
        success: true,
        documents: enrichedDocs,
        total: enrichedDocs.length
      };

    } catch (error) {
      console.error('Error obteniendo documentos por vencer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Actualizar estado de documento y crear notificación si es necesario
   */
  async updateDocumentStatus(documentId, newStatus, userId, comments = '') {
    try {
      // 1. Actualizar documento
      const { data: document, error: updateError } = await supabase
        .from('documents')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          comments: comments
        })
        .eq('id', documentId)
        .select(`
          *,
          user:user_profiles!user_id(first_name, last_name, email)
        `)
        .single();

      if (updateError) throw updateError;

      // 2. Crear notificación automática
      const notificationMessage = this.generateStatusChangeMessage(document, newStatus);
      
      await supabase
        .from('notifications')
        .insert([{
          user_id: document.user_id,
          title: `Estado de documento actualizado: ${document.title}`,
          message: notificationMessage,
          type: 'document',
          priority: newStatus === 'expired' ? 'urgent' : 'medium',
          status: 'active',
          created_by: userId,
          data: {
            document_id: documentId,
            old_status: document.status,
            new_status: newStatus,
            action: 'status_change'
          }
        }]);

      // 3. Registrar en auditoría
      await supabase
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action: 'update_document_status',
          resource_type: 'document',
          resource_id: documentId,
          details: {
            old_status: document.status,
            new_status: newStatus,
            comments: comments
          }
        }]);

      return {
        success: true,
        document: document,
        message: `Estado actualizado a: ${newStatus}`
      };

    } catch (error) {
      console.error('Error actualizando estado de documento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generar mensaje personalizado para cambio de estado
   */
  generateStatusChangeMessage(document, newStatus) {
    const userName = `${document.user.first_name} ${document.user.last_name}`;
    
    const messages = {
      active: `Su documento "${document.title}" ha sido activado y está ahora vigente.`,
      pending: `Su documento "${document.title}" está pendiente de revisión.`,
      expired: `IMPORTANTE: Su documento "${document.title}" ha expirado. Es necesario renovarlo lo antes posible.`,
      rejected: `Su documento "${document.title}" ha sido rechazado. Por favor, revise los comentarios y vuelva a enviarlo.`,
      approved: `Su documento "${document.title}" ha sido aprobado exitosamente.`
    };

    return messages[newStatus] || `El estado de su documento "${document.title}" ha cambiado a: ${newStatus}.`;
  }

  /**
   * Generar reporte de estado de documentos
   */
  async generateDocumentStatusReport(filters = {}) {
    try {
      const { department, date_from, date_to } = filters;

      // Obtener datos para el reporte
      const employeesResult = await this.getEmployeesWithDocumentStatus(filters);
      if (!employeesResult.success) throw new Error(employeesResult.error);

      const expiringDocsResult = await this.getExpiringDocuments(30);
      if (!expiringDocsResult.success) throw new Error(expiringDocsResult.error);

      // Calcular estadísticas generales
      const stats = {
        total_employees: employeesResult.employees.length,
        employees_by_status: {
          critical: 0,
          attention: 0,
          normal: 0,
          complete: 0
        },
        documents: {
          total: 0,
          active: 0,
          expired: 0,
          expiring_soon: 0,
          pending: 0
        },
        departments: {}
      };

      employeesResult.employees.forEach(employee => {
        // Contar por estado
        stats.employees_by_status[employee.overall_status]++;
        
        // Sumar documentos
        stats.documents.total += employee.document_status.total;
        stats.documents.active += employee.document_status.active;
        stats.documents.expired += employee.document_status.expired;
        stats.documents.expiring_soon += employee.document_status.expiring_soon;
        stats.documents.pending += employee.document_status.pending;

        // Contar por departamento
        if (employee.department) {
          if (!stats.departments[employee.department]) {
            stats.departments[employee.department] = {
              employees: 0,
              critical: 0,
              attention: 0,
              normal: 0,
              complete: 0
            };
          }
          stats.departments[employee.department].employees++;
          stats.departments[employee.department][employee.overall_status]++;
        }
      });

      return {
        success: true,
        report: {
          generated_at: new Date().toISOString(),
          filters,
          statistics: stats,
          employees: employeesResult.employees,
          expiring_documents: expiringDocsResult.documents,
          summary: {
            total_employees: stats.total_employees,
            critical_attention_needed: stats.employees_by_status.critical + stats.employees_by_status.attention,
            documents_expiring_soon: stats.documents.expiring_soon,
            documents_expired: stats.documents.expired
          }
        }
      };

    } catch (error) {
      console.error('Error generando reporte:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar notificaciones automáticas de vencimientos
   */
  async processExpirationNotifications() {
    try {
      console.log('🔄 Procesando notificaciones de vencimiento...');

      // Obtener documentos que vencen en 1, 7, 15 y 30 días
      const alertDays = [1, 7, 15, 30];
      const notifications = [];

      for (const days of alertDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const { data: expiringDocs, error } = await supabase
          .from('documents')
          .select(`
            *,
            user:user_profiles!user_id(
              id,
              first_name,
              last_name,
              email,
              email_notifications
            )
          `)
          .eq('status', 'active')
          .eq('expiration_date', targetDateStr);

        if (error) throw error;

        for (const doc of expiringDocs) {
          if (!doc.user.email_notifications) continue;

          // Verificar si ya se envió notificación
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', doc.user_id)
            .like('data', `%"document_id":"${doc.id}"%`)
            .like('data', `%"days_notice":${days}%`)
            .single();

          if (existingNotif) continue; // Ya se envió

          const priority = days <= 1 ? 'urgent' : days <= 7 ? 'high' : 'medium';
          const urgencyText = days <= 1 ? 'URGENTE' : days <= 7 ? 'IMPORTANTE' : 'RECORDATORIO';

          notifications.push({
            user_id: doc.user_id,
            title: `${urgencyText}: Documento vence en ${days} día${days > 1 ? 's' : ''}`,
            message: `Su documento "${doc.title}" vencerá el ${new Date(doc.expiration_date).toLocaleDateString('es-ES')}. Es importante que gestione su renovación.`,
            type: 'document',
            priority: priority,
            status: 'active',
            data: {
              document_id: doc.id,
              document_title: doc.title,
              expiration_date: doc.expiration_date,
              days_notice: days,
              action: 'expiration_reminder'
            }
          });
        }
      }

      // Insertar todas las notificaciones
      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);

        console.log(`📧 ${notifications.length} notificaciones de vencimiento creadas`);
      }

      return {
        success: true,
        notifications_created: notifications.length
      };

    } catch (error) {
      console.error('Error procesando notificaciones de vencimiento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmployeeDocumentService();