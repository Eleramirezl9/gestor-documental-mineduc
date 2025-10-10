const { supabase } = require('../config/supabase');

/**
 * Servicio para gestión integral de colaboradores y sus documentos
 * Incluye control de vencimientos, notificaciones automáticas y reportes
 * ACTUALIZADO: Usa base de datos real de Supabase
 */
class EmployeeDocumentService {
  
  /**
   * Obtener próximo employee_id disponible con formato MIN{año}{número secuencial}
   */
  async getNextEmployeeId() {
    try {
      const currentYear = new Date().getFullYear().toString().slice(-2); // Últimos 2 dígitos del año

      // Buscar el último ID del año actual
      const { data: employees, error } = await supabase
        .from('employees')
        .select('employee_id')
        .like('employee_id', `MIN${currentYear}%`)
        .order('employee_id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;

      if (employees && employees.length > 0) {
        // Extraer el número del último ID
        const lastId = employees[0].employee_id;
        const lastNumber = parseInt(lastId.replace(`MIN${currentYear}`, ''));
        nextNumber = lastNumber + 1;
      }

      // Formatear con padding de ceros (3 dígitos)
      const paddedNumber = nextNumber.toString().padStart(3, '0');
      const newEmployeeId = `MIN${currentYear}${paddedNumber}`;

      console.log(`🆔 Generando nuevo employee_id: ${newEmployeeId}`);
      return newEmployeeId;

    } catch (error) {
      console.error('Error generando employee_id:', error);
      // Fallback: generar ID basado en año y timestamp
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const timestamp = Date.now().toString().slice(-3);
      return `MIN${currentYear}${timestamp}`;
    }
  }

  /**
   * Registrar un nuevo colaborador en el sistema
   * ACTUALIZADO: Implementación real con base de datos
   */
  async registerEmployee(employeeData, createdBy = null) {
    try {
      console.log('👤 Registrando nuevo empleado en base de datos...', employeeData);

      const {
        email,
        first_name,
        last_name,
        department,
        phone,
        employee_id,
        position,
        hire_date,
        address,
        date_of_birth,
        national_id,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        required_documents = []
      } = employeeData;

      // Validaciones
      if (!email || !first_name || !last_name || !department || !hire_date) {
        throw new Error('Faltan campos requeridos: email, first_name, last_name, department, hire_date');
      }

      // Obtener próximo employee_id si no se proporciona
      const finalEmployeeId = employee_id || await this.getNextEmployeeId();

      // Insertar empleado en la base de datos
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert([{
          employee_id: finalEmployeeId,
          email,
          first_name,
          last_name,
          department,
          position,
          hire_date,
          phone,
          address,
          date_of_birth,
          national_id,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          is_active: true,
          email_notifications: true,
          created_by: createdBy
        }])
        .select()
        .single();

      if (employeeError) throw employeeError;

      console.log(`✅ Empleado registrado: ${first_name} ${last_name} (${employee.id})`);

      // Crear requerimientos de documentos si se especificaron
      const documentRequirements = [];
      if (required_documents.length > 0) {
        const requirementsData = required_documents.map(doc => ({
          employee_id: employee.id,
          document_type: doc.type || doc.document_type,
          description: doc.description || `Documento requerido para ${first_name} ${last_name}`,
          required_date: doc.required_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: doc.priority || 'medium',
          created_by: createdBy
        }));

        const { data: requirements, error: reqError } = await supabase
          .from('employee_document_requirements')
          .insert(requirementsData)
          .select();

        if (reqError) {
          console.error('Error creando requerimientos:', reqError);
        } else {
          documentRequirements.push(...requirements);
          console.log(`📋 ${requirements.length} documentos requeridos creados`);
        }
      }

      // Obtener empleado con estado de documentos
      const employeeWithStatus = await this.getEmployeeWithDocumentStatus(employee.id);

      return {
        success: true,
        employee: employeeWithStatus.success ? employeeWithStatus.employee : employee,
        message: `Colaborador ${first_name} ${last_name} registrado exitosamente`,
        requirements_created: documentRequirements.length
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
   * Obtener un empleado específico con estado de documentos
   * ACTUALIZADO: Implementación real con base de datos
   */
  async getEmployeeWithDocumentStatus(employeeId) {
    try {
      // Obtener empleado con requerimientos de documentos
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          document_requirements:employee_document_requirements(
            id,
            document_type,
            description,
            required_date,
            status,
            priority,
            document_id,
            submitted_at,
            approved_at,
            rejected_at,
            notes,
            rejection_reason,
            created_at,
            updated_at
          )
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      // Obtener documentos asociados al empleado
      const documentIds = employee.document_requirements
        .filter(req => req.document_id)
        .map(req => req.document_id);

      let documents = [];
      if (documentIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            status,
            effective_date,
            expiration_date,
            created_at,
            category:document_categories(name, color)
          `)
          .in('id', documentIds);

        if (!docsError) {
          documents = docs;
        }
      }

      // Calcular estados
      const documentStatus = this.calculateDocumentStatus(documents);
      const requirementStatus = this.calculateRequirementStatus(employee.document_requirements);

      const enrichedEmployee = {
        ...employee,
        documents,
        document_status: documentStatus,
        requirement_status: requirementStatus,
        overall_status: this.calculateOverallStatus(documentStatus, requirementStatus)
      };

      return {
        success: true,
        employee: enrichedEmployee
      };

    } catch (error) {
      console.error('Error obteniendo empleado:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener colaboradores con estado de sus documentos
   * ACTUALIZADO: Implementación real con base de datos
   */
  async getEmployeesWithDocumentStatus(filters = {}) {
    try {
      console.log('📋 Obteniendo empleados con estado de documentos desde base de datos...');

      const {
        department,
        status,
        expiring_soon,
        search,
        limit = 50,
        offset = 0
      } = filters;

      // Construir query base
      let query = supabase
        .from('employees')
        .select(`
          *,
          document_requirements:employee_document_requirements(
            id,
            document_type,
            description,
            required_date,
            status,
            priority,
            document_id,
            submitted_at,
            approved_at,
            rejected_at,
            notes,
            rejection_reason,
            created_at,
            updated_at
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (department) {
        query = query.eq('department', department);
      }

      if (search) {
        const searchTerm = search.toLowerCase();
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%`);
      }

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data: employees, error: employeesError } = await query;

      if (employeesError) throw employeesError;

      console.log(`📋 Obtenidos ${employees.length} empleados de la base de datos`);

      // Obtener documentos para todos los empleados
      const allDocumentIds = employees
        .flatMap(emp => emp.document_requirements)
        .filter(req => req.document_id)
        .map(req => req.document_id);

      let documentsMap = new Map();
      if (allDocumentIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            status,
            effective_date,
            expiration_date,
            created_at,
            category:document_categories(name, color)
          `)
          .in('id', allDocumentIds);

        if (!docsError) {
          docs.forEach(doc => documentsMap.set(doc.id, doc));
        }
      }

      // Enriquecer empleados con información de documentos y estados
      const enrichedEmployees = employees.map(employee => {
        // Obtener documentos del empleado
        const employeeDocuments = employee.document_requirements
          .filter(req => req.document_id && documentsMap.has(req.document_id))
          .map(req => documentsMap.get(req.document_id));

        // Calcular estados basados en los requerimientos (no solo documentos subidos)
        const documentStatus = {
          total: employee.document_requirements?.length || 0, // Total de documentos ASIGNADOS
          active: employeeDocuments.filter(doc => doc.status === 'active').length,
          expired: employeeDocuments.filter(doc => doc.status === 'expired').length,
          expiring_soon: employeeDocuments.filter(doc => {
            if (doc.expiration_date) {
              const expirationDate = new Date(doc.expiration_date);
              const now = new Date();
              const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
              return daysUntilExpiration > 0 && daysUntilExpiration <= 30;
            }
            return false;
          }).length,
          pending: employee.document_requirements?.filter(req =>
            req.status === 'pending' || req.status === 'pendiente' || !req.document_id
          ).length || 0
        };

        const requirementStatus = this.calculateRequirementStatus(employee.document_requirements);

        return {
          ...employee,
          documents: employeeDocuments,
          document_status: documentStatus,
          requirement_status: requirementStatus,
          overall_status: this.calculateOverallStatus(documentStatus, requirementStatus)
        };
      });

      // Aplicar filtros adicionales después del enriquecimiento
      let filteredEmployees = enrichedEmployees;

      if (status) {
        filteredEmployees = filteredEmployees.filter(emp => emp.overall_status === status);
      }

      if (expiring_soon) {
        filteredEmployees = filteredEmployees.filter(emp =>
          emp.document_status.expiring_soon > 0
        );
      }

      console.log(`✅ Devolviendo ${filteredEmployees.length} empleados después de filtros`);

      return {
        success: true,
        employees: filteredEmployees,
        total: filteredEmployees.length,
        page: Math.floor(offset / limit) + 1,
        limit: limit
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
   * ACTUALIZADO: Implementación real con base de datos
   */
  async getExpiringDocuments(days = 30) {
    try {
      console.log(`📅 Obteniendo documentos que vencen en ${days} días desde base de datos...`);

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      // Obtener documentos que vencen en el rango especificado
      const { data: expiringDocs, error: docsError } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          status,
          expiration_date,
          effective_date,
          file_path,
          created_at,
          created_by,
          category:document_categories(name, color),
          user:user_profiles!created_by(
            id,
            first_name,
            last_name,
            email,
            department,
            phone
          )
        `)
        .eq('status', 'active')
        .not('expiration_date', 'is', null)
        .gte('expiration_date', today.toISOString().split('T')[0])
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });

      if (docsError) throw docsError;

      // También obtener documentos de empleados específicos a través de requirements
      const { data: empRequirements, error: reqError } = await supabase
        .from('employee_document_requirements')
        .select(`
          id,
          document_type,
          required_date,
          status,
          priority,
          employee:employees(
            id,
            employee_id,
            first_name,
            last_name,
            email,
            department,
            phone
          ),
          document:documents(
            id,
            title,
            status,
            expiration_date,
            file_path,
            created_at,
            category:document_categories(name, color)
          )
        `)
        .not('document_id', 'is', null)
        .eq('documents.status', 'active')
        .not('documents.expiration_date', 'is', null)
        .gte('documents.expiration_date', today.toISOString().split('T')[0])
        .lte('documents.expiration_date', futureDate.toISOString().split('T')[0]);

      let allExpiringDocs = [...(expiringDocs || [])];

      // Agregar documentos de empleados
      if (!reqError && empRequirements) {
        const employeeDocsWithUser = empRequirements
          .filter(req => req.document && req.employee)
          .map(req => ({
            ...req.document,
            user: {
              id: req.employee.id,
              first_name: req.employee.first_name,
              last_name: req.employee.last_name,
              email: req.employee.email,
              department: req.employee.department,
              phone: req.employee.phone
            },
            employee_id: req.employee.employee_id,
            requirement_id: req.id,
            requirement_priority: req.priority
          }));

        // Evitar duplicados
        const existingIds = new Set(allExpiringDocs.map(doc => doc.id));
        const newDocs = employeeDocsWithUser.filter(doc => !existingIds.has(doc.id));
        allExpiringDocs = [...allExpiringDocs, ...newDocs];
      }

      // Enriquecer con información de vencimiento
      const enrichedDocs = allExpiringDocs.map(doc => {
        const daysUntilExpiration = Math.ceil(
          (new Date(doc.expiration_date) - today) / (1000 * 60 * 60 * 24)
        );

        let urgency = 'medium';
        if (daysUntilExpiration <= 1) {
          urgency = 'urgent';
        } else if (daysUntilExpiration <= 7) {
          urgency = 'high';
        } else if (daysUntilExpiration <= 15) {
          urgency = 'medium';
        } else {
          urgency = 'low';
        }

        return {
          ...doc,
          days_until_expiration: daysUntilExpiration,
          urgency: urgency,
          user_name: doc.user ? `${doc.user.first_name} ${doc.user.last_name}` : 'Usuario desconocido'
        };
      });

      // Ordenar por urgencia y fecha de vencimiento
      enrichedDocs.sort((a, b) => {
        const urgencyOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return new Date(a.expiration_date) - new Date(b.expiration_date);
      });

      console.log(`✅ Devolviendo ${enrichedDocs.length} documentos por vencer`);

      return {
        success: true,
        documents: enrichedDocs,
        total: enrichedDocs.length,
        summary: {
          urgent: enrichedDocs.filter(d => d.urgency === 'urgent').length,
          high: enrichedDocs.filter(d => d.urgency === 'high').length,
          medium: enrichedDocs.filter(d => d.urgency === 'medium').length,
          low: enrichedDocs.filter(d => d.urgency === 'low').length
        }
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