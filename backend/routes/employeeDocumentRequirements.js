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

      res.status(201).json({
        success: true,
        data,
        message: `${data.length} documento(s) asignado(s) correctamente`
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
      .select('id')
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
    const { data, error } = await supabaseAdmin
      .from('employee_document_requirements')
      .select('*')
      .eq('employee_id', employee.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
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
    body('due_date').optional(),
    body('status').isIn(['pendiente', 'subido', 'aprobado', 'rechazado', 'vencido']).optional(),
    body('notes').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      const { data, error } = await supabase
        .from('employee_document_requirements')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          document_type:document_types (*)
        `)
        .single();

      if (error) throw error;

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

    const { error } = await supabase
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

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = `${employee_id}_${document_type_id}_${timestamp}${path.extname(file.originalname)}`;
      const filePath = `employees/${employee_id}/documents/${fileName}`;

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

module.exports = router;
