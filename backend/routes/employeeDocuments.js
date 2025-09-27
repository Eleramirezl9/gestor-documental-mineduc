const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const employeeDocumentService = require('../services/employeeDocumentService');
const auditService = require('../services/auditService');
const { supabase } = require('../config/supabase');

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
    res.status(500).json({ error: 'Error interno del servidor' });
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
    // Obtener estadísticas básicas
    const [employeesResult, expiringResult] = await Promise.all([
      employeeDocumentService.getEmployeesWithDocumentStatus({ limit: 1000 }),
      employeeDocumentService.getExpiringDocuments(30)
    ]);

    if (!employeesResult.success || !expiringResult.success) {
      throw new Error('Error obteniendo datos para estadísticas');
    }

    const employees = employeesResult.employees;
    const expiringDocs = expiringResult.documents;

    // Calcular estadísticas
    const stats = {
      employees: {
        total: employees.length,
        by_status: {
          critical: employees.filter(e => e.overall_status === 'critical').length,
          attention: employees.filter(e => e.overall_status === 'attention').length,
          normal: employees.filter(e => e.overall_status === 'normal').length,
          complete: employees.filter(e => e.overall_status === 'complete').length
        },
        by_department: {}
      },
      documents: {
        expiring_soon: expiringDocs.length,
        by_urgency: expiringResult.summary || {
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      },
      requirements: {
        total: employees.reduce((sum, e) => sum + (e.requirement_status?.total || 0), 0),
        pending: employees.reduce((sum, e) => sum + (e.requirement_status?.pending || 0), 0),
        overdue: employees.reduce((sum, e) => sum + (e.requirement_status?.overdue || 0), 0),
        completed: employees.reduce((sum, e) => sum + (e.requirement_status?.completed || 0), 0)
      }
    };

    // Agrupar por departamento
    employees.forEach(emp => {
      if (emp.department) {
        if (!stats.employees.by_department[emp.department]) {
          stats.employees.by_department[emp.department] = {
            total: 0,
            critical: 0,
            attention: 0,
            normal: 0,
            complete: 0
          };
        }
        stats.employees.by_department[emp.department].total++;
        stats.employees.by_department[emp.department][emp.overall_status]++;
      }
    });

    res.json({
      success: true,
      stats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en GET /employee-documents/stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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

module.exports = router;