const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configurar multer para subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, JPG, PNG, DOC, DOCX'));
    }
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/document-types:
 *   get:
 *     summary: Obtener catálogo de tipos de documentos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: required
 *         schema:
 *           type: boolean
 *         description: Filtrar por documentos requeridos
 *     responses:
 *       200:
 *         description: Lista de tipos de documentos
 */
router.get('/document-types', verifyToken, async (req, res) => {
  try {
    const { category, required } = req.query;

    let query = supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (required !== undefined) {
      query = query.eq('required', required === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error obteniendo tipos de documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de documentos',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/document-types:
 *   post:
 *     summary: Crear nuevo tipo de documento
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               requirement_type:
 *                 type: string
 *                 enum: [required, optional]
 *               default_due_days:
 *                 type: integer
 *               has_renewal:
 *                 type: boolean
 *               renewal_period:
 *                 type: integer
 *               renewal_unit:
 *                 type: string
 *                 enum: [days, months, years]
 *     responses:
 *       201:
 *         description: Tipo de documento creado exitosamente
 */
router.post('/document-types',
  verifyToken,
  [
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('category').notEmpty().withMessage('La categoría es requerida'),
    body('description').optional(),
    body('requirement_type').isIn(['required', 'optional']).optional(),
    body('default_due_days').isInt({ min: 1 }).optional(),
    body('has_renewal').isBoolean().optional(),
    body('renewal_period').isInt({ min: 1 }).optional(),
    body('renewal_unit').isIn(['days', 'months', 'years']).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        category,
        description,
        requirement_type = 'optional',
        default_due_days = 30,
        has_renewal = false,
        renewal_period,
        renewal_unit = 'months'
      } = req.body;

      console.log('📝 Creando tipo de documento:', name);

      // Preparar datos para inserción
      // Solo usar columnas que existen en la tabla actual
      const newDocumentType = {
        name,
        category,
        description: description || '',
        required: requirement_type === 'required',
        is_active: true
        // Nota: Campos como validity_period_days, default_due_days, renewal_period
        // no existen en la estructura actual de document_types
      };

      console.log('📤 Insertando tipo de documento:', JSON.stringify(newDocumentType, null, 2));

      // Insertar en la base de datos usando supabaseAdmin
      const { data, error } = await supabaseAdmin
        .from('document_types')
        .insert(newDocumentType)
        .select('*')
        .single();

      if (error) throw error;

      console.log('✅ Tipo de documento creado:', data.id);

      res.status(201).json({
        success: true,
        data,
        message: `Tipo de documento "${name}" creado correctamente`
      });
    } catch (error) {
      console.error('Error creando tipo de documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear tipo de documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/document-types:
 *   post:
 *     summary: Crear nuevo tipo de documento
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/document-types',
  verifyToken,
  [
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('category').notEmpty().withMessage('La categoría es requerida'),
    body('description').optional(),
    body('required').isBoolean().optional(),
    body('has_expiration').isBoolean().optional(),
    body('renewal_period').isInt({ min: 1 }).optional(),
    body('renewal_unit').isIn(['months', 'years']).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, category, description, required, has_expiration, renewal_period, renewal_unit } = req.body;

      const { data, error } = await supabase
        .from('document_types')
        .insert({
          name,
          category,
          description,
          required: required || false,
          has_expiration: has_expiration || false,
          renewal_period,
          renewal_unit
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error creando tipo de documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear tipo de documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/document-types/{id}:
 *   put:
 *     summary: Actualizar tipo de documento
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.put('/document-types/:id',
  verifyToken,
  [
    body('name').optional(),
    body('category').optional(),
    body('description').optional(),
    body('required').isBoolean().optional(),
    body('is_active').isBoolean().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = {};

      // Solo agregar campos que vienen en el body
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.required !== undefined) updateData.required = req.body.required;
      if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

      console.log('📝 Actualizando tipo de documento:', id);

      const { data, error } = await supabaseAdmin
        .from('document_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando tipo de documento:', error);
        throw error;
      }

      console.log('✅ Tipo de documento actualizado correctamente');

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error actualizando tipo de documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar tipo de documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/document-types/{id}:
 *   delete:
 *     summary: Eliminar tipo de documento
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/document-types/:id',
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log('🗑️ Eliminando tipo de documento:', id);

      // Verificar si el tipo de documento está en uso
      const { data: inUse, error: checkError } = await supabaseAdmin
        .from('required_documents')
        .select('id')
        .eq('document_type', id)
        .limit(1);

      if (checkError) {
        console.error('❌ Error verificando uso:', checkError);
      }

      if (inUse && inUse.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar este tipo de documento porque está siendo usado por documentos asignados'
        });
      }

      // Eliminar el tipo de documento
      const { error } = await supabaseAdmin
        .from('document_types')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando tipo de documento:', error);
        throw error;
      }

      console.log('✅ Tipo de documento eliminado correctamente');

      res.status(200).json({
        success: true,
        message: 'Tipo de documento eliminado correctamente'
      });
    } catch (error) {
      console.error('Error eliminando tipo de documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar tipo de documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/templates:
 *   get:
 *     summary: Obtener plantillas de documentos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/templates', verifyToken, async (req, res) => {
  try {
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select(`
        *,
        template_documents (
          *,
          document_type:document_types (*)
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (templatesError) throw templatesError;

    res.json({
      success: true,
      data: templates || []
    });
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/templates:
 *   post:
 *     summary: Crear nueva plantilla de documentos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/templates',
  verifyToken,
  [
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('description').optional(),
    body('category').optional(),
    body('icon').optional(),
    body('documents').isArray().withMessage('Los documentos deben ser un array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, category, icon, documents } = req.body;

      console.log('📝 Creando plantilla:', name, 'con', documents?.length || 0, 'documentos');

      // Crear plantilla (usar supabaseAdmin y solo campos que existen)
      const { data: template, error: templateError } = await supabaseAdmin
        .from('document_templates')
        .insert({
          name,
          description: description || '',
          category: category || 'Personalizada',
          icon: icon || 'template',
          is_active: true
          // created_by no existe en la tabla actual
        })
        .select()
        .single();

      if (templateError) {
        console.error('❌ Error creando plantilla:', templateError);
        throw templateError;
      }

      console.log('✅ Plantilla creada con ID:', template.id);

      // Agregar documentos a la plantilla
      if (documents && documents.length > 0) {
        // Eliminar duplicados por document_type_id
        const uniqueDocuments = [];
        const seenIds = new Set();

        for (const doc of documents) {
          if (!seenIds.has(doc.document_type_id)) {
            seenIds.add(doc.document_type_id);
            uniqueDocuments.push(doc);
          }
        }

        if (uniqueDocuments.length < documents.length) {
          console.log(`⚠️  Se eliminaron ${documents.length - uniqueDocuments.length} documentos duplicados`);
        }

        // Solo usar campos que existen en template_documents
        const templateDocuments = uniqueDocuments.map(doc => ({
          template_id: template.id,
          document_type_id: doc.document_type_id,
          priority: doc.priority || 'normal'
          // is_required, has_custom_renewal no existen en tabla actual
        }));

        console.log('📤 Insertando', templateDocuments.length, 'documentos únicos a la plantilla');

        const { error: docsError } = await supabaseAdmin
          .from('template_documents')
          .insert(templateDocuments);

        if (docsError) {
          console.error('❌ Error insertando documentos de plantilla:', docsError);
          throw docsError;
        }

        console.log('✅ Documentos de plantilla insertados correctamente');
      }

      // Obtener la plantilla completa con sus documentos anidados
      const { data: fullTemplate, error: fetchError } = await supabaseAdmin
        .from('document_templates')
        .select(`
          *,
          template_documents (
            *,
            document_type:document_types (*)
          )
        `)
        .eq('id', template.id)
        .single();

      if (fetchError) {
        console.error('⚠️ Error obteniendo plantilla completa:', fetchError);
        // Aún así devolver la plantilla básica
        return res.status(201).json({
          success: true,
          data: template
        });
      }

      res.status(201).json({
        success: true,
        data: fullTemplate
      });
    } catch (error) {
      console.error('Error creando plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear plantilla',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/templates/{id}:
 *   put:
 *     summary: Actualizar plantilla de documentos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.put('/templates/:id',
  verifyToken,
  [
    body('name').optional(),
    body('description').optional(),
    body('category').optional(),
    body('icon').optional(),
    body('documents').isArray().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, category, icon, documents } = req.body;

      console.log('📝 Actualizando plantilla:', id);

      // Actualizar plantilla
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (icon !== undefined) updateData.icon = icon;

      const { data: template, error: templateError } = await supabaseAdmin
        .from('document_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (templateError) {
        console.error('❌ Error actualizando plantilla:', templateError);
        throw templateError;
      }

      // Si se proporcionaron documentos, actualizar la relación
      if (documents && Array.isArray(documents)) {
        // Eliminar documentos existentes
        await supabaseAdmin
          .from('template_documents')
          .delete()
          .eq('template_id', id);

        // Deduplica documentos
        const uniqueDocuments = [];
        const seenIds = new Set();
        for (const doc of documents) {
          if (!seenIds.has(doc.document_type_id)) {
            seenIds.add(doc.document_type_id);
            uniqueDocuments.push(doc);
          }
        }

        // Insertar nuevos documentos
        if (uniqueDocuments.length > 0) {
          const templateDocuments = uniqueDocuments.map(doc => ({
            template_id: id,
            document_type_id: doc.document_type_id,
            priority: doc.priority || 'normal'
          }));

          const { error: docsError } = await supabaseAdmin
            .from('template_documents')
            .insert(templateDocuments);

          if (docsError) {
            console.error('❌ Error actualizando documentos de plantilla:', docsError);
            throw docsError;
          }
        }
      }

      // Obtener plantilla completa con documentos
      const { data: fullTemplate, error: fetchError } = await supabaseAdmin
        .from('document_templates')
        .select(`
          *,
          template_documents (
            *,
            document_type:document_types (*)
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('⚠️ Error obteniendo plantilla completa:', fetchError);
        return res.status(200).json({
          success: true,
          data: template
        });
      }

      console.log('✅ Plantilla actualizada correctamente');

      res.status(200).json({
        success: true,
        data: fullTemplate
      });
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar plantilla',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/templates/{id}:
 *   delete:
 *     summary: Eliminar plantilla de documentos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/templates/:id',
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log('🗑️ Eliminando plantilla:', id);

      // Primero eliminar los documentos de la plantilla
      const { error: docsError } = await supabaseAdmin
        .from('template_documents')
        .delete()
        .eq('template_id', id);

      if (docsError) {
        console.error('❌ Error eliminando documentos de plantilla:', docsError);
        throw docsError;
      }

      // Luego eliminar la plantilla
      const { error: templateError } = await supabaseAdmin
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (templateError) {
        console.error('❌ Error eliminando plantilla:', templateError);
        throw templateError;
      }

      console.log('✅ Plantilla eliminada correctamente');

      res.status(200).json({
        success: true,
        message: 'Plantilla eliminada correctamente'
      });
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar plantilla',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/assign:
 *   post:
 *     summary: Asignar documentos requeridos a un empleado
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/assign',
  verifyToken,
  [
    body('employee_id').notEmpty().withMessage('El ID del empleado es requerido'),
    body('documents').isArray().withMessage('Los documentos deben ser un array'),
    body('documents.*.document_type_id').notEmpty().withMessage('El tipo de documento es requerido'),
    body('documents.*.priority').isIn(['baja', 'normal', 'alta', 'urgente']).optional(),
    body('documents.*.due_date').optional(),
    body('documents.*.notes').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { employee_id, documents } = req.body;
      console.log('📝 Asignando documentos para employee_id:', employee_id);

      // El employee_id es el código (MIN25001), necesitamos el UUID
      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_id', employee_id)
        .single();

      if (employeeError) {
        console.error('❌ Empleado no encontrado:', employee_id, employeeError);
        return res.status(404).json({
          success: false,
          error: 'Empleado no encontrado',
          message: employeeError.message
        });
      }

      console.log('✅ Empleado encontrado, UUID:', employee.id);

      // Obtener los document_types para mapear ID -> nombre
      const documentTypeIds = documents.map(d => d.document_type_id);
      const { data: docTypes, error: docTypesError } = await supabaseAdmin
        .from('document_types')
        .select('id, name')
        .in('id', documentTypeIds);

      if (docTypesError) throw docTypesError;

      // Crear mapa de ID -> nombre
      const idToName = {};
      docTypes.forEach(dt => {
        idToName[dt.id] = dt.name;
      });

      // Preparar documentos para inserción usando la estructura antigua
      // La tabla existente usa: document_type (string), required_date, priority (high/medium/low)
      // Si no hay fecha, usar 30 días desde hoy como default
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      const defaultDateString = defaultDate.toISOString().split('T')[0];

      const requirements = documents.map(doc => ({
        employee_id: employee.id, // Usar el UUID, no el código
        document_type: idToName[doc.document_type_id] || 'Documento',
        description: doc.notes || '',
        required_date: doc.due_date || defaultDateString, // NOT NULL constraint - usar default si no hay fecha
        priority: doc.priority === 'urgente' ? 'high' :
                  doc.priority === 'alta' ? 'high' :
                  doc.priority === 'normal' ? 'medium' : 'low',
        status: 'pending',
        created_by: req.user.id
      }));

      console.log('📤 Insertando documentos:', JSON.stringify(requirements, null, 2));

      // Insertar documentos requeridos usando supabaseAdmin para bypassear RLS
      const { data, error } = await supabaseAdmin
        .from('employee_document_requirements')
        .insert(requirements)
        .select('*');

      if (error) throw error;

      // Generar token de portal para el empleado
      try {
        const { data: tokenData, error: tokenError } = await supabaseAdmin
          .rpc('generate_employee_portal_token', {
            p_employee_id: employee.id
          });

        if (tokenError) throw tokenError;

        // Obtener info completa del empleado para el email
        const { data: employeeData, error: empError } = await supabaseAdmin
          .from('employees')
          .select('first_name, last_name, email, employee_id')
          .eq('id', employee.id)
          .single();

        if (empError) throw empError;

        // Enviar email con enlace del portal
        const emailService = require('../services/emailService');
        await emailService.sendEmployeePortalLink({
          employeeEmail: employeeData.email,
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          portalUrl: tokenData[0].portal_url,
          requestedDocuments: documents.map(doc => ({
            document_type: idToName[doc.document_type_id] || 'Documento',
            priority: doc.priority,
            notes: doc.notes
          })),
          dueDate: documents[0]?.due_date // Usar la fecha del primer documento como referencia
        });

        console.log(`📧 Email de portal enviado a ${employeeData.email}`);
      } catch (emailError) {
        console.error('❌ Error enviando email de portal:', emailError);
        // No fallar la solicitud si el email falla
      }

      res.status(201).json({
        success: true,
        data,
        message: `${data.length} documento(s) asignado(s) correctamente. Se ha enviado un email al empleado con el enlace al portal.`
      });
    } catch (error) {
      console.error('Error asignando documentos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al asignar documentos',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/employee/{employee_id}:
 *   get:
 *     summary: Obtener documentos requeridos de un empleado
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/employee/:employee_id', verifyToken, async (req, res) => {
  try {
    const { employee_id } = req.params;

    // El employee_id del parámetro es el código (MIN25001), necesitamos el UUID
    // Buscar el UUID del empleado primero
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, user_id')
      .eq('employee_id', employee_id)
      .single();

    if (employeeError) {
      console.error('Error buscando empleado:', employeeError);
      return res.json({
        success: true,
        data: [] // Si no existe el empleado, devolver array vacío
      });
    }

    // Ahora buscar los documentos usando el UUID con supabaseAdmin para bypassear RLS
    const { data: requirements, error } = await supabaseAdmin
      .from('employee_document_requirements')
      .select('*')
      .eq('employee_id', employee.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Para cada requerimiento, buscar si hay un archivo subido
    const requirementsWithFiles = await Promise.all(
      (requirements || []).map(async (req) => {
        let uploadedDoc = null;
        let fileUrl = null;

        console.log(`🔍 Buscando documento para requirement ${req.id}, tipo: ${req.document_type}, document_id: ${req.document_id}`);

        // PRIMERO: Buscar en employee_documents (documentos subidos por empleado o admin)
        const { data: empDoc, error: empDocError } = await supabaseAdmin
          .from('employee_documents')
          .select('id, file_path, file_name, file_size, mime_type, upload_date, requirement_id')
          .eq('requirement_id', req.id)
          .order('upload_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (empDocError) {
          console.error(`❌ Error buscando en employee_documents:`, empDocError);
        }

        if (empDoc) {
          uploadedDoc = empDoc;
          console.log(`📄 Documento encontrado en employee_documents:`, uploadedDoc.file_name, 'Path:', uploadedDoc.file_path);
        } else {
          console.log(`❌ No se encontró documento en employee_documents para requirement_id: ${req.id}`);

          // SEGUNDO: Si no hay en employee_documents, buscar en documents (sistema antiguo)
          if (req.document_id) {
            const { data: doc } = await supabaseAdmin
              .from('documents')
              .select('id, file_path, file_name, file_size, mime_type, created_at, title')
              .eq('id', req.document_id)
              .maybeSingle();

            uploadedDoc = doc;
            console.log(`📄 Documento encontrado en documents por ID:`, uploadedDoc ? 'SÍ' : 'NO');
          } else {
            // Si no tiene document_id, buscar por tags (fallback para documentos antiguos)
            // Buscar documentos que tengan ambos tags
            const { data: docs } = await supabaseAdmin
              .from('documents')
              .select('id, file_path, file_name, file_size, mime_type, created_at, title, tags')
              .order('created_at', { ascending: false })
              .limit(100); // Limitar a los últimos 100 documentos para mejorar performance

            // Filtrar manualmente por tags que contengan el empleado y tipo
            const matchingDoc = docs?.find(d =>
              Array.isArray(d.tags) &&
              d.tags.some(tag => tag === `empleado:${employee.id}`) &&
              d.tags.some(tag => tag === `tipo:${req.document_type}`)
            );

            uploadedDoc = matchingDoc;
          }
        }

        // Si hay documento subido, obtener URL pública
        if (uploadedDoc && uploadedDoc.file_path) {
          console.log(`🔗 Generando URL firmada para: ${uploadedDoc.file_path}`);
          const { data: urlData, error: urlError } = await supabaseAdmin
            .storage
            .from('documents')
            .createSignedUrl(uploadedDoc.file_path, 3600); // URL válida por 1 hora

          if (urlError) {
            console.error(`❌ Error generando URL firmada:`, urlError);
          } else {
            fileUrl = urlData?.signedUrl || null;
            console.log(`✅ URL firmada generada:`, fileUrl ? 'SÍ' : 'NO');
          }
        } else {
          console.log(`⚠️  No hay documento o file_path para generar URL`);
        }

        return {
          ...req,
          id: req.id,
          documentName: req.document_type,
          dueDate: req.required_date,
          assignedAt: req.created_at,
          notes: req.description,
          fileUrl: fileUrl,
          uploadedFile: uploadedDoc ? {
            id: uploadedDoc.id,
            fileName: uploadedDoc.file_name,
            fileSize: uploadedDoc.file_size,
            mimeType: uploadedDoc.mime_type,
            uploadedAt: uploadedDoc.upload_date || uploadedDoc.created_at
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: requirementsWithFiles
    });
  } catch (error) {
    console.error('Error obteniendo documentos del empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener documentos del empleado',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/{id}:
 *   put:
 *     summary: Actualizar documento requerido
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  verifyToken,
  [
    body('priority').isIn(['baja', 'normal', 'alta', 'urgente']).optional(),
    body('dueDate').optional(),
    body('status').isIn(['pendiente', 'subido', 'aprobado', 'rechazado', 'vencido']).optional(),
    body('notes').optional(),
    body('hasCustomRenewal').isBoolean().optional(),
    body('customRenewalPeriod').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (Number.isInteger(value) && value >= 1) return true;
      throw new Error('customRenewalPeriod debe ser un entero mayor o igual a 1');
    }),
    body('customRenewalUnit').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      if (['days', 'months', 'years'].includes(value)) return true;
      throw new Error('customRenewalUnit debe ser days, months o years');
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { priority, dueDate, status, notes, hasCustomRenewal, customRenewalPeriod, customRenewalUnit } = req.body;

      // Preparar datos para actualización (mapear a estructura de DB)
      const updateData = {};

      if (priority !== undefined) {
        // Mapear prioridad al formato antiguo (high/medium/low)
        updateData.priority = priority === 'urgente' ? 'high' :
                               priority === 'alta' ? 'high' :
                               priority === 'normal' ? 'medium' : 'low';
      }

      if (dueDate !== undefined) {
        updateData.required_date = dueDate;
      }

      if (status !== undefined) {
        updateData.status = status;
      }

      if (notes !== undefined) {
        updateData.description = notes;
      }

      
      // Manejar renovación personalizada con validación de constraint
      if (hasCustomRenewal !== undefined) {
        updateData.has_custom_renewal = hasCustomRenewal;

        // Si hasCustomRenewal es false, forzar period y unit a NULL
        if (hasCustomRenewal === false) {
          updateData.custom_renewal_period = null;
          updateData.custom_renewal_unit = null;
        } else {
          // Si hasCustomRenewal es true, establecer los valores si están presentes
          if (customRenewalPeriod !== undefined) {
            updateData.custom_renewal_period = customRenewalPeriod;
          }
          if (customRenewalUnit !== undefined) {
            updateData.custom_renewal_unit = customRenewalUnit;
          }
        }
      } else {
        // Si hasCustomRenewal no está definido, solo actualizar period y unit si están presentes
        if (customRenewalPeriod !== undefined) {
          updateData.custom_renewal_period = customRenewalPeriod;
        }
        if (customRenewalUnit !== undefined) {
          updateData.custom_renewal_unit = customRenewalUnit;
        }
      }

      console.log('🔄 Actualizando documento requerido:', id, updateData);

      const { data, error } = await supabaseAdmin
        .from('employee_document_requirements')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      console.log('✅ Documento actualizado correctamente');

      res.json({
        success: true,
        data,
        message: 'Documento actualizado correctamente'
      });
    } catch (error) {
      console.error('Error actualizando documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/{id}:
 *   delete:
 *     summary: Eliminar documento requerido
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('employee_document_requirements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Documento eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar documento',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/upload:
 *   post:
 *     summary: Subir documento de empleado
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload',
  verifyToken,
  upload.single('file'),
  [
    body('employee_id').notEmpty().withMessage('El ID del empleado es requerido'),
    body('requirement_id').notEmpty().withMessage('El ID del requerimiento es requerido'),
    body('document_type_id').notEmpty().withMessage('El tipo de documento es requerido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo'
        });
      }

      const { employee_id, requirement_id, document_type_id } = req.body;
      const file = req.file;

      // Buscar UUID del empleado para construir ruta correcta
      const { data: empData, error: empLookupError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_id')
        .eq('employee_id', employee_id)
        .single();

      if (empLookupError) {
        console.error('Error buscando empleado:', empLookupError);
        throw new Error('Empleado no encontrado');
      }

      // Generar nombre único para el archivo usando formato: empleados/{code}_{uuid}/{fileUUID}.ext
      const { v4: uuidv4 } = require('uuid');
      const fileExt = path.extname(file.originalname).substring(1); // Remove leading dot
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const folderIdentifier = `${empData.employee_id}_${empData.id}`;
      const filePath = `empleados/${folderIdentifier}/${uniqueFileName}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Registrar documento en la base de datos
      const { data: document, error: docError } = await supabase
        .from('employee_documents')
        .insert({
          requirement_id,
          employee_id,
          document_type_id,
          file_name: file.originalname,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_by: req.user.id,
          status: 'pendiente'
        })
        .select()
        .single();

      if (docError) throw docError;

      // Actualizar estado del requerimiento
      await supabase
        .from('employee_document_requirements')
        .update({ status: 'subido' })
        .eq('id', requirement_id);

      res.status(201).json({
        success: true,
        data: document,
        message: 'Documento subido correctamente'
      });
    } catch (error) {
      console.error('Error subiendo documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir documento',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/employee-document-requirements/statistics:
 *   get:
 *     summary: Obtener estadísticas de documentos requeridos
 *     tags: [Employee Document Requirements]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', verifyToken, async (req, res) => {
  try {
    // Obtener conteos por estado
    const { data: stats, error } = await supabase
      .from('employee_document_requirements')
      .select('status', { count: 'exact' });

    if (error) throw error;

    // Agrupar por estado
    const statusCounts = {
      pendiente: 0,
      subido: 0,
      aprobado: 0,
      rechazado: 0,
      vencido: 0
    };

    stats.forEach(item => {
      if (statusCounts.hasOwnProperty(item.status)) {
        statusCounts[item.status]++;
      }
    });

    res.json({
      success: true,
      data: {
        total: stats.length,
        by_status: statusCounts
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});


// ==================== ENDPOINTS DE NOTIFICACIONES DE RENOVACIÓN ====================

const renewalService = require('../services/renewalNotificationService');

/**
 * @swagger
 * /api/employee-document-requirements/renewals/expiring:
 *   get:
 *     summary: Obtener documentos próximos a vencer
 *     tags: [Renewal Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días de anticipación
 */
router.get('/renewals/expiring', verifyToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const documents = await renewalService.getDocumentsExpiringIn(days);

    res.json({
      success: true,
      data: documents,
      count: documents.length,
      days_ahead: days
    });

  } catch (error) {
    console.error('Error obteniendo documentos próximos a vencer:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener documentos próximos a vencer',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/renewals/expired:
 *   get:
 *     summary: Obtener documentos vencidos
 *     tags: [Renewal Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/renewals/expired', verifyToken, async (req, res) => {
  try {
    const documents = await renewalService.getExpiredDocuments();

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error obteniendo documentos vencidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener documentos vencidos',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/renewals/summary/{employeeId}:
 *   get:
 *     summary: Obtener resumen de renovaciones de un empleado
 *     tags: [Renewal Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/renewals/summary/:employeeId', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const summary = await renewalService.getEmployeeRenewalSummary(employeeId);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error obteniendo resumen de empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen de empleado',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/employee-document-requirements/renewals/notify:
 *   post:
 *     summary: Crear notificación de renovación
 *     tags: [Renewal Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/renewals/notify', verifyToken, async (req, res) => {
  try {
    const { employeeId, documentInfo, type } = req.body;

    const notification = await renewalService.createRenewalNotification(
      employeeId,
      documentInfo,
      type
    );

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear notificación',
      message: error.message
    });
  }
});

module.exports = router;
