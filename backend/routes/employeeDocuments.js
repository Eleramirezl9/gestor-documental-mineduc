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
  body('phone').optional().isMobilePhone(),
  body('required_documents').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Solo administradores pueden registrar colaboradores
    if (req.user.role !== 'admin') {
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

    const result = await employeeDocumentService.registerEmployee(employeeData);

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
    if (!['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requieren permisos de administrador o editor.' 
      });
    }

    const filters = {
      department: req.query.department,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

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
    res.status(500).json({ error: 'Error interno del servidor' });
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
    if (req.user.role !== 'admin') {
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
    const { data: departments, error } = await supabase
      .from('user_profiles')
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

module.exports = router;