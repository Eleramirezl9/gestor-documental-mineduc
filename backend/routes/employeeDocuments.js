const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const employeeDocumentService = require('../services/employeeDocumentService');
const auditService = require('../services/auditService');
const emailService = require('../services/emailService');
const { supabase, supabaseAdmin } = require('../config/supabase');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Employee Documents
 *   description: Gestión integral de colaboradores y documentos
 */

/**
 * @swagger
 * /api/employee-documents/register:
 *   post:
 *     summary: Registrar nuevo colaborador
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - department
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               department:
 *                 type: string
 *               phone:
 *                 type: string
 *               employee_id:
 *                 type: string
 *               position:
 *                 type: string
 *               hire_date:
 *                 type: string
 *                 format: date
 *               required_documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     required_date:
 *                       type: string
 *                       format: date
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Colaborador registrado exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/register', verifyToken, [
  body('email').isEmail().withMessage('Email inválido'),
  body('first_name').notEmpty().withMessage('Nombre es requerido'),
  body('last_name').notEmpty().withMessage('Apellido es requerido'),
  body('department').notEmpty().withMessage('Departamento es requerido'),
  body('hire_date').notEmpty().withMessage('Fecha de contratación es requerida'),
  body('phone').optional().isString().trim(),
  body('required_documents').optional().isArray()
], async (req, res) => {
  try {
    console.log('📝 Register employee request:', {
      body: req.body,
      user: req.user?.profile?.email,
      role: req.user?.profile?.role
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Solo administradores pueden registrar colaboradores
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const employeeData = {
      ...req.body,
      created_by: req.user.id
    };

    if (employeeData.required_documents) {
      employeeData.required_documents = employeeData.required_documents.map(doc => ({
        ...doc,
        created_by: req.user.id
      }));
    }

    const result = await employeeDocumentService.registerEmployee(employeeData, req.user.id);

    if (result.success) {
      // Registrar en auditoría
      await auditService.log({
        user_id: req.user.id,
        action: 'register_employee',
        resource_type: 'employee',
        resource_id: result.employee.id,
        details: {
          employee_name: `${employeeData.first_name} ${employeeData.last_name}`,
          department: employeeData.department,
          required_documents_count: employeeData.required_documents?.length || 0
        }
      });

      // Enviar email de bienvenida al nuevo empleado
      if (employeeData.email) {
        try {
          console.log('📧 Enviando email de bienvenida a:', employeeData.email);
          await emailService.sendWelcomeEmail({
            employeeEmail: employeeData.email,
            employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
            employeeCode: result.employee.employee_id,
            position: employeeData.position || null,
            department: employeeData.department
          });
          console.log('✅ Email de bienvenida enviado exitosamente');
        } catch (emailError) {
          // No falla el registro si el email falla, solo registra el error
          console.error('⚠️ Error enviando email de bienvenida (no crítico):', emailError.message);
        }
      }

      res.status(201).json(result);
    } else {
      console.log('❌ Service error:', result);
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en POST /employee-documents/register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/employees:
 *   get:
 *     summary: Obtener colaboradores con estado de documentos
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [critical, attention, normal, complete]
 *       - in: query
 *         name: expiring_soon
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de colaboradores con estado de documentos
 */
// Test endpoint without auth for development
router.get('/employees/test', async (req, res) => {
  try {
    // Mock user for testing
    req.user = { id: 'test-user', role: 'admin', email: 'admin@mineduc.gob.gt' };

    const filters = {
      department: req.query.department,
      status: req.query.status,
      expiring_soon: req.query.expiring_soon === 'true',
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await employeeDocumentService.getEmployeesWithDocumentStatus(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error en GET /employee-documents/employees/test:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/employees', verifyToken, [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('expiring_soon').optional().isBoolean().toBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      department: req.query.department,
      status: req.query.status,
      expiring_soon: req.query.expiring_soon,
      search: req.query.search,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const result = await employeeDocumentService.getEmployeesWithDocumentStatus(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error en GET /employee-documents/employees:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/expiring:
 *   get:
 *     summary: Obtener documentos próximos a vencer
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días hacia adelante para buscar vencimientos
 *     responses:
 *       200:
 *         description: Lista de documentos próximos a vencer
 */
// Test endpoint for expiring documents without auth
router.get('/expiring/test', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await employeeDocumentService.getExpiringDocuments(days);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error en GET /employee-documents/expiring/test:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/expiring', verifyToken, [
  query('days').optional().isInt({ min: 1, max: 365 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const days = req.query.days || 30;
    const result = await employeeDocumentService.getExpiringDocuments(days);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error en GET /employee-documents/expiring:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/document/{id}/status:
 *   put:
 *     summary: Actualizar estado de documento
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, pending, expired, rejected, approved]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 */
router.put('/document/:id/status', verifyToken, [
  body('status').isIn(['active', 'pending', 'expired', 'rejected', 'approved'])
    .withMessage('Estado inválido'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, comments } = req.body;

    const result = await employeeDocumentService.updateDocumentStatus(
      id, 
      status, 
      req.user.id, 
      comments
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en PUT /employee-documents/document/:id/status:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/report:
 *   get:
 *     summary: Generar reporte de estado de documentos
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente
 */
router.get('/report', verifyToken, async (req, res) => {
  try {
    // Solo administradores y editores pueden generar reportes
    if (!['admin', 'editor'].includes(req.user.profile.role)) {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador o editor.'
      });
    }

    const filters = {
      department: req.query.department,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    console.log('📊 Generando reporte con filtros:', filters);
    const result = await employeeDocumentService.generateDocumentStatusReport(filters);

    if (result.success) {
      // Registrar generación de reporte en auditoría
      await auditService.log({
        user_id: req.user.id,
        action: 'generate_document_report',
        resource_type: 'report',
        details: {
          filters,
          total_employees: result.report.statistics.total_employees,
          total_documents: result.report.statistics.documents.total
        }
      });

      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error en GET /employee-documents/report:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @swagger
 * /api/employee-documents/process-notifications:
 *   post:
 *     summary: Procesar notificaciones automáticas de vencimientos
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones procesadas exitosamente
 */
router.post('/process-notifications', verifyToken, async (req, res) => {
  try {
    // Solo administradores pueden ejecutar proceso de notificaciones
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    const result = await employeeDocumentService.processExpirationNotifications();

    if (result.success) {
      res.json({
        success: true,
        message: `${result.notifications_created} notificaciones procesadas`,
        notifications_created: result.notifications_created
      });
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error en POST /employee-documents/process-notifications:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/departments:
 *   get:
 *     summary: Obtener lista de departamentos únicos
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de departamentos
 */
router.get('/departments', verifyToken, async (req, res) => {
  try {
    // Obtener departamentos de empleados activos
    const { data: departments, error } = await supabase
      .from('employees')
      .select('department')
      .not('department', 'is', null)
      .eq('is_active', true);

    if (error) throw error;

    const uniqueDepartments = [...new Set(departments.map(d => d.department))].sort();

    res.json({
      success: true,
      departments: uniqueDepartments
    });

  } catch (error) {
    console.error('Error en GET /employee-documents/departments:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/employee/{id}:
 *   get:
 *     summary: Obtener detalles de un empleado específico
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles del empleado con estado de documentos
 *       404:
 *         description: Empleado no encontrado
 */
router.get('/employee/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await employeeDocumentService.getEmployeeWithDocumentStatus(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Error en GET /employee-documents/employee/:id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/employee-documents/employee/{id}/requirements:
 *   post:
 *     summary: Agregar nuevo requerimiento de documento a un empleado
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - required_date
 *             properties:
 *               document_type:
 *                 type: string
 *               description:
 *                 type: string
 *               required_date:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Requerimiento creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/employee/:id/requirements', verifyToken, [
  body('document_type').notEmpty().withMessage('Tipo de documento es requerido'),
  body('required_date').isISO8601().withMessage('Fecha requerida inválida'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Solo administradores y editores pueden agregar requerimientos
    if (!['admin', 'editor'].includes(req.user.profile.role)) {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador o editor.'
      });
    }

    const { id: employeeId } = req.params;
    const { document_type, description, required_date, priority = 'medium' } = req.body;

    const { data: requirement, error } = await supabase
      .from('employee_document_requirements')
      .insert([{
        employee_id: employeeId,
        document_type,
        description: description || `Documento ${document_type} requerido`,
        required_date,
        priority,
        created_by: req.user.id
      }])
      .select(`
        *,
        employee:employees(first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'add_document_requirement',
      resource_type: 'employee_requirement',
      resource_id: requirement.id,
      details: {
        employee_id: employeeId,
        employee_name: requirement.employee ? `${requirement.employee.first_name} ${requirement.employee.last_name}` : 'Desconocido',
        document_type,
        required_date,
        priority
      }
    });

    res.status(201).json({
      success: true,
      requirement,
      message: 'Requerimiento de documento agregado exitosamente'
    });

  } catch (error) {
    console.error('Error en POST /employee-documents/employee/:id/requirements:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/stats:
 *   get:
 *     summary: Obtener estadísticas generales de empleados y documentos
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas generales
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Obtener conteo directo de documentos requeridos por status desde la BD
    const { data: requirementStats, error: reqError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select('status', { count: 'exact' });

    if (reqError) {
      console.error('Error obteniendo stats de requirements:', reqError);
      throw reqError;
    }

    // Contar por status
    const statusCounts = {
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      expired: 0
    };

    requirementStats.forEach(req => {
      if (statusCounts.hasOwnProperty(req.status)) {
        statusCounts[req.status]++;
      }
    });

    // Obtener total de empleados activos
    const { count: employeeCount, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (empError) {
      console.error('Error obteniendo conteo de empleados:', empError);
      throw empError;
    }

    // Obtener estadísticas por departamento
    const { data: deptStats, error: deptError } = await supabaseAdmin
      .from('employees')
      .select('department', { count: 'exact' })
      .eq('is_active', true);

    if (deptError) {
      console.error('Error obteniendo stats por departamento:', deptError);
      throw deptError;
    }

    const departmentCounts = {};
    deptStats.forEach(emp => {
      if (emp.department) {
        departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1;
      }
    });

    // Obtener documentos por vencer (próximos 30 días)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { count: expiringCount, error: expError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select('*', { count: 'exact', head: true })
      .lte('required_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .in('status', ['pending', 'submitted']);

    if (expError) {
      console.error('Error obteniendo documentos por vencer:', expError);
    }

    // Calcular total de documentos
    const totalDocuments = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    const stats = {
      employees: {
        total: employeeCount || 0,
        active: employeeCount || 0,
        by_department: departmentCounts
      },
      documents: {
        total: totalDocuments,
        by_status: statusCounts,
        pending: statusCounts.pending,
        submitted: statusCounts.submitted,
        approved: statusCounts.approved,
        rejected: statusCounts.rejected,
        expired: statusCounts.expired,
        expiring_soon: expiringCount || 0
      }
    };

    res.json({
      success: true,
      stats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en GET /employee-documents/stats:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/virtual-folders:
 *   get:
 *     summary: Obtener datos de folders virtuales para todos los empleados
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Folders virtuales obtenidos exitosamente
 */
router.get('/virtual-folders', verifyToken, async (req, res) => {
  try {
    // Obtener todos los empleados activos
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, first_name, last_name, email, department, position')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (empError) {
      console.error('Error obteniendo empleados:', empError);
      throw empError;
    }

    // Para cada empleado, obtener sus documentos requeridos con detalles
    const foldersPromises = employees.map(async (employee) => {
      const { data: requirements, error: reqError } = await supabaseAdmin
        .from('employee_document_requirements')
        .select(`
          id,
          document_type,
          description,
          status,
          priority,
          required_date,
          submitted_at,
          approved_at,
          rejected_at,
          rejection_reason,
          notes,
          document_id,
          documents (
            id,
            title,
            file_path,
            file_size,
            mime_type,
            created_at
          )
        `)
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (reqError) {
        console.error(`Error obteniendo requirements para empleado ${employee.employee_id}:`, reqError);
        return null;
      }

      // Contar documentos por status
      const docStats = {
        total: requirements.length,
        pending: requirements.filter(r => r.status === 'pending').length,
        submitted: requirements.filter(r => r.status === 'submitted').length,
        approved: requirements.filter(r => r.status === 'approved').length,
        rejected: requirements.filter(r => r.status === 'rejected').length,
        expired: requirements.filter(r => r.status === 'expired').length
      };

      // Calcular tamaño total de documentos aprobados
      const approvedDocs = requirements.filter(r => r.status === 'approved' && r.documents);
      const totalSize = approvedDocs.reduce((sum, req) => {
        return sum + (req.documents?.file_size || 0);
      }, 0);

      return {
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          full_name: `${employee.first_name} ${employee.last_name}`,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          department: employee.department,
          position: employee.position
        },
        documents: requirements,
        stats: docStats,
        total_size: totalSize,
        has_approved_documents: docStats.approved > 0
      };
    });

    const folders = await Promise.all(foldersPromises);
    const validFolders = folders.filter(f => f !== null);

    res.json({
      success: true,
      folders: validFolders,
      total_employees: validFolders.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en GET /employee-documents/virtual-folders:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/next-id:
 *   get:
 *     summary: Obtener próximo ID de empleado disponible
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Próximo ID disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 employee_id:
 *                   type: string
 *                   example: "MIN25001"
 *                 message:
 *                   type: string
 */
router.get('/next-id', verifyToken, async (req, res) => {
  try {
    console.log('🆔 Solicitando próximo employee_id...');

    const nextId = await employeeDocumentService.getNextEmployeeId();

    res.json({
      success: true,
      employee_id: nextId,
      message: `Próximo ID disponible: ${nextId}`
    });

  } catch (error) {
    console.error('Error en GET /employee-documents/next-id:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo generar el próximo ID de empleado'
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/requirement/{id}/approve:
 *   put:
 *     summary: Aprobar un documento requerido de empleado
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del requerimiento de documento
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notas adicionales sobre la aprobación
 *     responses:
 *       200:
 *         description: Documento aprobado exitosamente
 *       403:
 *         description: No tiene permisos para aprobar documentos
 *       404:
 *         description: Documento no encontrado
 */
router.put('/requirement/:id/approve', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    console.log('✅ Aprobando documento requirement:', id);

    // Solo administradores y editores pueden aprobar documentos
    if (!['admin', 'editor'].includes(req.user.profile.role)) {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador o editor.'
      });
    }

    // Obtener el documento actual
    const { data: currentDoc, error: fetchError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentDoc) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    // Actualizar el documento a estado aprobado
    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('employee_document_requirements')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: req.user.id,
        updated_by: req.user.id,
        notes: notes || currentDoc.notes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Agregar información del empleado manualmente desde currentDoc
    if (updatedDoc && currentDoc.employee) {
      updatedDoc.employee = currentDoc.employee;
    }

    // Registrar en auditoría (no crítico, continuar si falla)
    try {
      await auditService.log({
        user_id: req.user.id,
        action: 'approve_employee_document',
        resource_type: 'employee_document_requirement',
        resource_id: id,
        details: {
          employee_id: currentDoc.employee_id,
          employee_name: currentDoc.employee ? `${currentDoc.employee.first_name} ${currentDoc.employee.last_name}` : 'Desconocido',
          document_type: currentDoc.document_type,
          previous_status: currentDoc.status
        }
      });
    } catch (auditError) {
      console.warn('⚠️  Error registrando auditoría (no crítico):', auditError.message);
    }

    res.json({
      success: true,
      document: updatedDoc,
      message: 'Documento aprobado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /employee-documents/requirement/:id/approve:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/requirement/{id}/reject:
 *   put:
 *     summary: Rechazar un documento requerido de empleado
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del requerimiento de documento
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Motivo del rechazo
 *               notes:
 *                 type: string
 *                 description: Notas adicionales
 *     responses:
 *       200:
 *         description: Documento rechazado exitosamente
 *       403:
 *         description: No tiene permisos para rechazar documentos
 *       404:
 *         description: Documento no encontrado
 */
router.put('/requirement/:id/reject', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, notes } = req.body;

    console.log('❌ Rechazando documento requirement:', id);

    // Solo administradores y editores pueden rechazar documentos
    if (!['admin', 'editor'].includes(req.user.profile.role)) {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador o editor.'
      });
    }

    // Obtener el documento actual
    const { data: currentDoc, error: fetchError } = await supabaseAdmin
      .from('employee_document_requirements')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentDoc) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }

    // Actualizar el documento a estado rechazado
    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('employee_document_requirements')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        updated_by: req.user.id,
        rejection_reason: rejection_reason || 'No especificado',
        notes: notes || currentDoc.notes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Agregar información del empleado manualmente desde currentDoc
    if (updatedDoc && currentDoc.employee) {
      updatedDoc.employee = currentDoc.employee;
    }

    // Registrar en auditoría (no crítico, continuar si falla)
    try {
      await auditService.log({
        user_id: req.user.id,
        action: 'reject_employee_document',
        resource_type: 'employee_document_requirement',
        resource_id: id,
        details: {
          employee_id: currentDoc.employee_id,
          employee_name: currentDoc.employee ? `${currentDoc.employee.first_name} ${currentDoc.employee.last_name}` : 'Desconocido',
          document_type: currentDoc.document_type,
          previous_status: currentDoc.status,
          rejection_reason: rejection_reason || 'No especificado'
        }
      });
    } catch (auditError) {
      console.warn('⚠️  Error registrando auditoría (no crítico):', auditError.message);
    }

    res.json({
      success: true,
      document: updatedDoc,
      message: 'Documento rechazado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /employee-documents/requirement/:id/reject:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/employee-documents/employee/{id}:
 *   delete:
 *     summary: Eliminar un empleado y sus documentos asociados
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del empleado
 *     responses:
 *       200:
 *         description: Empleado eliminado exitosamente
 *       403:
 *         description: No tiene permisos para eliminar empleados
 *       404:
 *         description: Empleado no encontrado
 */
router.delete('/employee/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️  Eliminando empleado:', id);

    // Solo administradores pueden eliminar empleados
    if (req.user.profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    // Verificar que el empleado existe
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('id', id)
      .single();

    if (fetchError || !employee) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    // Eliminar documentos requeridos del empleado
    const { error: deleteDocsError } = await supabaseAdmin
      .from('employee_document_requirements')
      .delete()
      .eq('employee_id', id);

    if (deleteDocsError) {
      console.error('Error eliminando documentos del empleado:', deleteDocsError);
      throw deleteDocsError;
    }

    // Eliminar el empleado (esto marcará is_active = false si usas soft delete)
    const { error: deleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando empleado:', deleteError);
      throw deleteError;
    }

    // Registrar en auditoría
    try {
      await auditService.log({
        user_id: req.user.id,
        action: 'delete_employee',
        resource_type: 'employee',
        resource_id: id,
        details: {
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_email: employee.email
        }
      });
    } catch (auditError) {
      console.warn('⚠️  Error registrando auditoría (no crítico):', auditError.message);
    }

    res.json({
      success: true,
      message: 'Empleado eliminado exitosamente',
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`
      }
    });

  } catch (error) {
    console.error('Error en DELETE /employee-documents/employee/:id:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;