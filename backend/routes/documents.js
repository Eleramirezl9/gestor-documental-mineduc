const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const auditService = require('../services/auditService');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Gestión de documentos del sistema
 * 
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del documento
 *         title:
 *           type: string
 *           description: Título del documento
 *         description:
 *           type: string
 *           description: Descripción del documento
 *         file_name:
 *           type: string
 *           description: Nombre del archivo original
 *         file_path:
 *           type: string
 *           description: Ruta del archivo en el servidor
 *         file_size:
 *           type: integer
 *           description: Tamaño del archivo en bytes
 *         mime_type:
 *           type: string
 *           description: Tipo MIME del archivo
 *         category_id:
 *           type: string
 *           format: uuid
 *           description: ID de la categoría del documento
 *         status:
 *           type: string
 *           enum: [draft, pending, approved, rejected, archived]
 *           description: Estado actual del documento
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Etiquetas asociadas al documento
 *         ocr_text:
 *           type: string
 *           description: Texto extraído mediante OCR
 *         ai_classification:
 *           type: object
 *           description: Clasificación generada por IA
 *         metadata:
 *           type: object
 *           description: Metadatos adicionales del documento
 *         created_by:
 *           type: string
 *           format: uuid
 *           description: ID del usuario que creó el documento
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *     
 *     DocumentUpload:
 *       type: object
 *       required:
 *         - title
 *         - file
 *       properties:
 *         title:
 *           type: string
 *           description: Título del documento
 *         description:
 *           type: string
 *           description: Descripción del documento
 *         category_id:
 *           type: string
 *           format: uuid
 *           description: ID de la categoría del documento
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Etiquetas del documento
 *         file:
 *           type: string
 *           format: binary
 *           description: Archivo a subir (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF)
 */

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Obtener lista de documentos
 *     description: Obtiene una lista paginada de documentos con filtros opcionales
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de documentos por página
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Búsqueda en título, descripción y texto extraído
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por categoría
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected, archived]
 *         description: Filtrar por estado
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           enum: [title, created_at, updated_at]
 *           default: created_at
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Dirección del ordenamiento
 *     responses:
 *       200:
 *         description: Lista de documentos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('category').optional().isUUID(),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'archived']),
  query('sort').optional().isIn(['title', 'created_at', 'updated_at']),
  query('order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, category, status, sort = 'created_at', order = 'desc' } = req.query;

    let query = require('../config/supabase').supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' });

    // Aplicar filtros según el rol del usuario
    if (req.user?.profile?.role !== 'admin') {
      query = query.or(`created_by.eq.${req.user.id},is_public.eq.true`);
    }

    // Aplicar filtros adicionales
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,extracted_text.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      documents: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/stats/overview:
 *   get:
 *     summary: Obtener estadísticas de documentos
 *     description: Obtiene estadísticas generales sobre documentos por estado y categoría
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 pending: { type: integer }
 *                 approved: { type: integer }
 *                 rejected: { type: integer }
 *                 draft: { type: integer }
 *                 archived: { type: integer }
 *                 byCategory: { type: object }
 *       400:
 *         description: Error al obtener estadísticas
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes (solo admin/editor)
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats/overview', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    // Obtener conteos por estado
    const { data: statusStats, error: statusError } = await require('../config/supabase').supabaseAdmin
      .from('documents')
      .select('status');

    if (statusError) {
      return res.status(400).json({ error: statusError.message });
    }

    const statusCounts = statusStats.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});

    // Obtener conteos por categoría
    const { data: categoryStats, error: categoryError } = await supabase
      .from('documents')
      .select(`
        category_id,
        document_categories(name)
      `);

    if (categoryError) {
      return res.status(400).json({ error: categoryError.message });
    }

    const categoryCounts = categoryStats.reduce((acc, doc) => {
      const categoryName = doc.document_categories?.name || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total: statusStats.length,
      pending: statusCounts.pending || 0,
      approved: statusCounts.approved || 0,
      rejected: statusCounts.rejected || 0,
      draft: statusCounts.draft || 0,
      archived: statusCounts.archived || 0,
      byCategory: categoryCounts
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Obtener documento por ID
 *     description: Obtiene un documento específico por su ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del documento
 *     responses:
 *       200:
 *         description: Documento obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document:
 *                   $ref: '#/components/schemas/Document'
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No tienes permisos para ver este documento
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('documents_full')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar permisos
    if (req.user.profile.role !== 'admin' && 
        data.created_by !== req.user.id && 
        (!data.is_public || data.status !== 'approved')) {
      return res.status(403).json({ error: 'No tienes permisos para ver este documento' });
    }

    // Registrar acceso al documento
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_VIEWED',
      entity_type: 'document',
      entity_id: id,
      details: { title: data.title },
      ip_address: req.ip
    });

    res.json({ document: data });

  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Crear nuevo documento
 *     description: Crea un nuevo documento en el sistema (sin archivo)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Título del documento
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Descripción del documento
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la categoría
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Etiquetas del documento
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de vigencia
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de expiración
 *               isPublic:
 *                 type: boolean
 *                 description: Si el documento es público
 *     responses:
 *       201:
 *         description: Documento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', verifyToken, requireRole(['admin', 'editor']), [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('El título debe tener entre 3 y 255 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('categoryId').optional(),
  body('tags').optional().isArray(),
  body('effectiveDate').optional().isISO8601(),
  body('expirationDate').optional().isISO8601(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    console.log('📄 POST /api/documents - Request body:', req.body);
    console.log('📄 User info:', { userId: req.user?.id, role: req.user?.profile?.role });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, categoryId, tags, effectiveDate, expirationDate, isPublic } = req.body;

    // Crear documento en la base de datos
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title,
        description,
        file_name: 'pending_upload',
        file_path: 'pending_upload',
        file_size: 0,
        file_type: 'pending',
        mime_type: 'pending',
        category_id: categoryId || null,
        tags: tags || [],
        status: 'draft',
        is_public: isPublic || false,
        effective_date: effectiveDate || null,
        expiration_date: expirationDate || null,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_CREATED',
      entity_type: 'document',
      entity_id: data.id,
      details: { title, category_id: categoryId },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Documento creado exitosamente',
      document: data
    });

  } catch (error) {
    console.error('Error creando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Crear documento con archivo
 *     description: Crea un nuevo documento y sube el archivo en una sola operación con procesamiento OCR y clasificación IA
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - file
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título del documento
 *               description:
 *                 type: string
 *                 description: Descripción del documento
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la categoría
 *               tags:
 *                 type: string
 *                 description: Etiquetas separadas por comas
 *               isPublic:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Si el documento es público
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF - máximo 50MB)
 *     responses:
 *       201:
 *         description: Documento creado y archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Documento creado exitosamente"
 *                 document:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: Error de validación o tipo de archivo no permitido
 *       401:
 *         description: Token no válido o ausente
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 * 
 * /api/documents/{id}/upload:
 *   post:
 *     summary: Subir archivo para documento
 *     description: Sube un archivo para un documento existente con procesamiento OCR y clasificación IA
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF - máximo 50MB)
 *     responses:
 *       200:
 *         description: Archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Archivo subido exitosamente"
 *                 document:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: Error de validación o tipo de archivo no permitido
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No tienes permisos para subir archivos a este documento
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload', verifyToken, requireRole(['admin', 'editor']), upload.single('file'), [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('El título debe tener entre 3 y 255 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('categoryId').optional(),
  body('tags').optional(),
  body('isPublic').optional()
], async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      if (req.file) await fs.unlink(req.file.path);
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const { title, description, categoryId, isPublic } = req.body;
    let tags = [];
    
    // Procesar tags si se proporcionaron
    if (req.body.tags) {
      tags = typeof req.body.tags === 'string' 
        ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : Array.isArray(req.body.tags) ? req.body.tags : [];
    }

    // Subir archivo a Supabase Storage primero
    const fileBuffer = await fs.readFile(req.file.path);
    const fileId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `documents/${fileId}/${req.file.filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Error subiendo archivo: ' + uploadError.message });
    }

    // Procesar archivo con OCR si es necesario
    let extractedText = '';
    try {
      if (['pdf', 'jpg', 'jpeg', 'png'].includes(path.extname(req.file.originalname).toLowerCase().substring(1))) {
        extractedText = await ocrService.extractText(req.file.path);
      }
    } catch (ocrError) {
      console.error('Error en OCR:', ocrError);
    }

    // Clasificación automática con IA
    let aiClassification = null;
    try {
      if (extractedText) {
        aiClassification = await aiService.classifyDocument(extractedText, req.file.originalname);
      }
    } catch (aiError) {
      console.error('Error en clasificación IA:', aiError);
    }

    // Crear documento en la base de datos
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title,
        description: description || null,
        file_name: req.file.originalname,
        file_path: uploadData.path,
        file_size: req.file.size,
        file_type: path.extname(req.file.originalname).toLowerCase().substring(1),
        mime_type: req.file.mimetype,
        category_id: categoryId || null,
        tags: tags,
        status: 'pending',
        is_public: isPublic === 'true',
        extracted_text: extractedText,
        ai_classification: aiClassification,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) {
      // Si falla la creación del documento, eliminar el archivo subido
      await supabase.storage.from('documents').remove([uploadData.path]);
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: error.message });
    }

    // Limpiar archivo temporal
    await fs.unlink(req.file.path);

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_CREATED_WITH_FILE',
      entity_type: 'document',
      entity_id: data.id,
      details: { 
        title,
        file_name: req.file.originalname,
        file_size: req.file.size,
        has_ocr: !!extractedText,
        has_ai_classification: !!aiClassification
      },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Documento creado exitosamente',
      document: data
    });

  } catch (error) {
    console.error('Error creando documento con archivo:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/upload', verifyToken, requireRole(['admin', 'editor']), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Verificar que el documento existe y el usuario tiene permisos
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !document) {
      await fs.unlink(req.file.path); // Eliminar archivo subido
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (req.user.profile.role !== 'admin' && document.created_by !== req.user.id) {
      await fs.unlink(req.file.path);
      return res.status(403).json({ error: 'No tienes permisos para subir archivos a este documento' });
    }

    // Subir archivo a Supabase Storage
    const fileBuffer = await fs.readFile(req.file.path);
    const fileName = `${id}/${req.file.filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Error subiendo archivo: ' + uploadError.message });
    }

    // Procesar archivo con OCR si es necesario
    let extractedText = '';
    try {
      if (['pdf', 'jpg', 'jpeg', 'png'].includes(path.extname(req.file.originalname).toLowerCase().substring(1))) {
        extractedText = await ocrService.extractText(req.file.path);
      }
    } catch (ocrError) {
      console.error('Error en OCR:', ocrError);
      // No fallar si OCR falla, solo registrar el error
    }

    // Clasificación automática con IA
    let aiClassification = null;
    try {
      if (extractedText) {
        aiClassification = await aiService.classifyDocument(extractedText, req.file.originalname);
      }
    } catch (aiError) {
      console.error('Error en clasificación IA:', aiError);
    }

    // Actualizar documento en la base de datos
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        file_name: req.file.originalname,
        file_path: uploadData.path,
        file_size: req.file.size,
        file_type: path.extname(req.file.originalname).toLowerCase().substring(1),
        mime_type: req.file.mimetype,
        extracted_text: extractedText,
        ai_classification: aiClassification,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: updateError.message });
    }

    // Limpiar archivo temporal
    await fs.unlink(req.file.path);

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_FILE_UPLOADED',
      entity_type: 'document',
      entity_id: id,
      details: { 
        file_name: req.file.originalname,
        file_size: req.file.size,
        has_ocr: !!extractedText,
        has_ai_classification: !!aiClassification
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Archivo subido exitosamente',
      document: updatedDoc
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   put:
 *     summary: Actualizar documento
 *     description: Actualiza la información de un documento existente
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Nuevo título del documento
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Nueva descripción del documento
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Nuevo ID de la categoría
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Nuevas etiquetas del documento
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de vigencia
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha de expiración
 *               isPublic:
 *                 type: boolean
 *                 description: Si el documento es público
 *     responses:
 *       200:
 *         description: Documento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No tienes permisos para editar este documento
 *       401:
 *         description: Token no válido o ausente
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', verifyToken, requireRole(['admin', 'editor']), [
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('categoryId').optional(),
  body('tags').optional().isArray(),
  body('effectiveDate').optional().isISO8601(),
  body('expirationDate').optional().isISO8601(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, categoryId, tags, effectiveDate, expirationDate, isPublic } = req.body;

    // Verificar que el documento existe y el usuario tiene permisos
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (req.user.profile.role !== 'admin' && existingDoc.created_by !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para editar este documento' });
    }

    // Preparar datos de actualización
    const updateData = { updated_by: req.user.id };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (tags !== undefined) updateData.tags = tags;
    if (effectiveDate !== undefined) updateData.effective_date = effectiveDate;
    if (expirationDate !== undefined) updateData.expiration_date = expirationDate;
    if (isPublic !== undefined) updateData.is_public = isPublic;

    // Actualizar documento
    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_UPDATED',
      entity_type: 'document',
      entity_id: id,
      details: { 
        changes: updateData,
        previous_data: existingDoc
      },
      ip_address: req.ip
    });

    res.json({
      message: 'Documento actualizado exitosamente',
      document: data
    });

  } catch (error) {
    console.error('Error actualizando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Eliminar documento
 *     description: Elimina un documento y su archivo asociado del sistema
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento a eliminar
 *     responses:
 *       200:
 *         description: Documento eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Documento eliminado exitosamente"
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No tienes permisos para eliminar este documento
 *       401:
 *         description: Token no válido o ausente
 *       400:
 *         description: Error al eliminar el documento
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', verifyToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el documento existe y el usuario tiene permisos
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (req.user.profile.role !== 'admin' && existingDoc.created_by !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este documento' });
    }

    // Eliminar archivo de Supabase Storage
    if (existingDoc.file_path && existingDoc.file_path !== 'pending_upload') {
      const { error: deleteFileError } = await supabase.storage
        .from('documents')
        .remove([existingDoc.file_path]);

      if (deleteFileError) {
        console.error('Error eliminando archivo:', deleteFileError);
      }
    }

    // Eliminar documento de la base de datos
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_DELETED',
      entity_type: 'document',
      entity_id: id,
      details: { 
        title: existingDoc.title,
        file_name: existingDoc.file_name
      },
      ip_address: req.ip
    });

    res.json({ message: 'Documento eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Descargar documento
 *     description: Genera una URL temporal para descargar el archivo del documento
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento a descargar
 *     responses:
 *       200:
 *         description: URL de descarga generada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                   description: URL firmada para descargar el archivo (válida por 1 hora)
 *                 fileName:
 *                   type: string
 *                   description: Nombre original del archivo
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No tienes permisos para descargar este documento
 *       401:
 *         description: Token no válido o ausente
 *       400:
 *         description: Error generando URL de descarga
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Verificar permisos
    if (req.user.profile.role !== 'admin' && 
        document.created_by !== req.user.id && 
        (!document.is_public || document.status !== 'approved')) {
      return res.status(403).json({ error: 'No tienes permisos para descargar este documento' });
    }

    // Obtener URL de descarga de Supabase Storage
    const { data: urlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600); // URL válida por 1 hora

    if (urlError) {
      return res.status(400).json({ error: 'Error generando URL de descarga' });
    }

    // Registrar descarga en auditoría
    await auditService.log({
      user_id: req.user.id,
      action: 'DOCUMENT_DOWNLOADED',
      entity_type: 'document',
      entity_id: id,
      details: { title: document.title },
      ip_address: req.ip
    });

    res.json({
      downloadUrl: urlData.signedUrl,
      fileName: document.file_name
    });

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
