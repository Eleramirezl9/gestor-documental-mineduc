/**
 * Servicio para gestión de notificaciones de renovación de documentos
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Calcula la fecha de vencimiento de un documento
 * @param {Date} uploadDate - Fecha de subida del documento
 * @param {Object} documentType - Tipo de documento con info de renovación
 * @param {Object} customRenewal - Renovación personalizada (opcional)
 * @returns {Date|null} Fecha de vencimiento
 */
function calculateExpirationDate(uploadDate, documentType, customRenewal = null) {
  // Usar renovación personalizada si existe, sino usar la del tipo de documento
  const hasRenewal = customRenewal?.has_custom_renewal
    ? customRenewal.has_custom_renewal
    : documentType?.has_expiration;

  const renewalPeriod = customRenewal?.has_custom_renewal
    ? customRenewal.custom_renewal_period
    : documentType?.renewal_period;

  const renewalUnit = customRenewal?.has_custom_renewal
    ? customRenewal.custom_renewal_unit
    : documentType?.renewal_unit;

  if (!hasRenewal || !renewalPeriod) {
    return null;
  }

  const date = new Date(uploadDate);
  const period = renewalPeriod;
  const unit = renewalUnit || 'months';

  if (unit === 'months') {
    date.setMonth(date.getMonth() + period);
  } else if (unit === 'years') {
    date.setFullYear(date.getFullYear() + period);
  } else if (unit === 'days') {
    date.setDate(date.getDate() + period);
  }

  return date;
}

/**
 * Obtiene documentos que vencen en X días
 * @param {number} daysAhead - Días de anticipación (ej: 30, 15, 7)
 * @returns {Promise<Array>} Lista de documentos próximos a vencer
 */
async function getDocumentsExpiringIn(daysAhead = 30) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(23, 59, 59, 999);

    console.log(`🔍 Buscando documentos que vencen en ${daysAhead} días...`);
    console.log(`📅 Hoy: ${today.toISOString().split('T')[0]}`);
    console.log(`📅 Hasta: ${targetDate.toISOString().split('T')[0]}`);

    // 1. Obtener todos los documentos asignados pendientes o subidos con required_date
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select(`
        *,
        employees:employee_id (
          id,
          employee_id,
          first_name,
          last_name,
          email
        )
      `)
      .in('status', ['pending', 'submitted'])
      .not('required_date', 'is', null)
      .gte('required_date', today.toISOString().split('T')[0])
      .lte('required_date', targetDate.toISOString().split('T')[0]);

    if (assignmentsError) {
      console.error('❌ Error obteniendo asignaciones:', assignmentsError);
      throw assignmentsError;
    }

    console.log(`📄 Encontrados ${assignments?.length || 0} documentos en rango`);

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // 2. Obtener información de tipos de documento
    const { data: documentTypes, error: typesError } = await supabaseAdmin
      .from('document_types')
      .select('id, name, category, has_expiration, renewal_period, renewal_unit');

    if (typesError) throw typesError;

    // 3. Procesar documentos y calcular días hasta vencimiento
    const expiringDocuments = assignments.map(assignment => {
      const requiredDate = new Date(assignment.required_date);
      requiredDate.setHours(0, 0, 0, 0);

      const daysUntilExpiration = Math.ceil((requiredDate - today) / (1000 * 60 * 60 * 24));

      // Buscar tipo de documento
      const docType = documentTypes.find(dt => dt.name === assignment.document_type);

      return {
        ...assignment,
        document_type_info: docType || { name: assignment.document_type, category: 'General' },
        expiration_date: requiredDate,
        days_until_expiration: daysUntilExpiration,
        urgency_level: daysUntilExpiration <= 7 ? 'urgent' :
                      daysUntilExpiration <= 15 ? 'high' : 'medium'
      };
    });

    // Ordenar por días hasta vencimiento (más urgente primero)
    expiringDocuments.sort((a, b) => a.days_until_expiration - b.days_until_expiration);

    console.log(`✅ Devolviendo ${expiringDocuments.length} documentos próximos a vencer`);

    return expiringDocuments;

  } catch (error) {
    console.error('Error obteniendo documentos próximos a vencer:', error);
    throw error;
  }
}

/**
 * Obtiene documentos ya vencidos
 * @returns {Promise<Array>} Lista de documentos vencidos
 */
async function getExpiredDocuments() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`🔍 Buscando documentos vencidos...`);
    console.log(`📅 Hoy: ${today.toISOString().split('T')[0]}`);

    // Obtener documentos pendientes o submitted cuya required_date ya pasó
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select(`
        *,
        employees:employee_id (
          id,
          employee_id,
          first_name,
          last_name,
          email
        )
      `)
      .in('status', ['pending', 'submitted'])
      .not('required_date', 'is', null)
      .lt('required_date', today.toISOString().split('T')[0]);

    if (assignmentsError) {
      console.error('❌ Error obteniendo documentos vencidos:', assignmentsError);
      throw assignmentsError;
    }

    console.log(`📄 Encontrados ${assignments?.length || 0} documentos vencidos`);

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const { data: documentTypes, error: typesError } = await supabaseAdmin
      .from('document_types')
      .select('id, name, category, has_expiration, renewal_period, renewal_unit');

    if (typesError) throw typesError;

    const expiredDocuments = assignments.map(assignment => {
      const requiredDate = new Date(assignment.required_date);
      requiredDate.setHours(0, 0, 0, 0);

      const daysExpired = Math.ceil((today - requiredDate) / (1000 * 60 * 60 * 24));

      const docType = documentTypes.find(dt => dt.name === assignment.document_type);

      return {
        ...assignment,
        document_type_info: docType || { name: assignment.document_type, category: 'General' },
        expiration_date: requiredDate,
        days_expired: daysExpired
      };
    });

    // Ordenar por días vencidos (más vencido primero)
    expiredDocuments.sort((a, b) => b.days_expired - a.days_expired);

    console.log(`✅ Devolviendo ${expiredDocuments.length} documentos vencidos`);

    return expiredDocuments;

  } catch (error) {
    console.error('Error obteniendo documentos vencidos:', error);
    throw error;
  }
}

/**
 * Obtiene resumen de renovaciones por empleado
 * @param {string} employeeId - ID del empleado
 * @returns {Promise<Object>} Resumen de documentos del empleado
 */
async function getEmployeeRenewalSummary(employeeId) {
  try {
    const expiringIn30 = await getDocumentsExpiringIn(30);
    const expiringIn15 = await getDocumentsExpiringIn(15);
    const expiringIn7 = await getDocumentsExpiringIn(7);
    const expired = await getExpiredDocuments();

    // Filtrar por empleado
    const filterByEmployee = (docs) => docs.filter(d => d.employee_id === employeeId);

    return {
      employee_id: employeeId,
      summary: {
        expiring_in_30_days: filterByEmployee(expiringIn30).length,
        expiring_in_15_days: filterByEmployee(expiringIn15).length,
        expiring_in_7_days: filterByEmployee(expiringIn7).length,
        expired: filterByEmployee(expired).length
      },
      documents: {
        expiring_soon: filterByEmployee(expiringIn30),
        expired: filterByEmployee(expired)
      }
    };

  } catch (error) {
    console.error('Error obteniendo resumen de empleado:', error);
    throw error;
  }
}

/**
 * Crea una notificación de renovación
 * @param {string} employeeId - ID del empleado
 * @param {Object} documentInfo - Información del documento
 * @param {string} type - Tipo de notificación (expiring_soon, expired)
 * @returns {Promise<Object>} Notificación creada
 */
async function createRenewalNotification(employeeId, documentInfo, type = 'expiring_soon') {
  try {
    const messages = {
      expiring_soon: `El documento "${documentInfo.document_type}" vence en ${documentInfo.days_until_expiration} días`,
      expired: `El documento "${documentInfo.document_type}" venció hace ${documentInfo.days_expired} días`
    };

    const notification = {
      user_id: employeeId,
      title: type === 'expired' ? 'Documento Vencido' : 'Documento Próximo a Vencer',
      message: messages[type],
      type: 'renewal',
      related_id: documentInfo.id,
      metadata: {
        document_type: documentInfo.document_type,
        expiration_date: documentInfo.expiration_date,
        urgency_level: documentInfo.urgency_level || 'medium'
      },
      read: false
    };

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error;
  }
}

module.exports = {
  calculateExpirationDate,
  getDocumentsExpiringIn,
  getExpiredDocuments,
  getEmployeeRenewalSummary,
  createRenewalNotification
};
