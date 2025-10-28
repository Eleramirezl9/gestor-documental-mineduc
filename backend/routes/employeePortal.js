const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/**
 * @swagger
 * /api/employee-portal/validate/{token}:
 *   get:
 *     summary: Validate employee portal token
 *     tags: [Employee Portal]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token validation result
 *       401:
 *         description: Invalid or expired token
 */
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data, error } = await supabase.rpc('validate_employee_portal_token', {
      p_token: token
    });

    if (error) throw error;

    if (!data || data.length === 0 || !data[0].is_valid) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    res.json({
      success: true,
      employee: {
        id: data[0].employee_id,
        name: data[0].employee_name,
        email: data[0].employee_email,
        department: data[0].department
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ success: false, message: 'Error al validar token' });
  }
});

/**
 * @swagger
 * /api/employee-portal/{token}/documents:
 *   get:
 *     summary: Get employee documents (requested and submitted)
 *     tags: [Employee Portal]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee documents
 */
router.get('/:token/documents', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'validate_employee_portal_token',
      { p_token: token }
    );

    if (tokenError || !tokenData?.[0]?.is_valid) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const employeeId = tokenData[0].employee_id;

    // Get requested documents
    const { data: requested, error: reqError } = await supabase
      .from('employee_document_requirements')
      .select(`
        id,
        document_type,
        status,
        created_at,
        required_date,
        notes,
        priority,
        document_id,
        documents (
          id,
          file_name,
          created_at,
          file_path
        )
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (reqError) throw reqError;

    // Get employee code for querying employee_documents
    const { data: empData } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('id', employeeId)
      .single();

    // Get all submitted documents by this employee through employee_documents table
    const { data: submitted, error: subError } = await supabase
      .from('employee_documents')
      .select('id, file_name, upload_date, file_path, status, document_type_id, document_types(name)')
      .eq('employee_id', empData?.employee_id || '')
      .order('upload_date', { ascending: false });

    if (subError) throw subError;

    res.json({
      success: true,
      data: {
        requested: requested || [],
        submitted: submitted || []
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Error al obtener documentos' });
  }
});

/**
 * @swagger
 * /api/employee-portal/{token}/upload:
 *   post:
 *     summary: Upload employee document
 *     tags: [Employee Portal]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
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
 *               documentType:
 *                 type: string
 *               requestId:
 *                 type: string
 *                 description: Optional - if responding to a specific request
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 */
router.post('/:token/upload', upload.single('file'), async (req, res) => {
  try {
    const { token } = req.params;
    const { documentType, requestId } = req.body;

    console.log('📤 Upload request - documentType:', documentType, 'requestId:', requestId);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'validate_employee_portal_token',
      { p_token: token }
    );

    if (tokenError || !tokenData?.[0]?.is_valid) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const employeeId = tokenData[0].employee_id;
    const employeeName = tokenData[0].employee_name;

    // Get employee info for employee_id code
    const { data: employeeInfo, error: empError } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('id', employeeId)
      .single();

    if (empError) throw empError;

    // Find document type ID if provided (before creating filename)
    let documentTypeId = null;
    if (documentType) {
      const { data: docType } = await supabase
        .from('document_types')
        .select('id')
        .eq('name', documentType)
        .single();

      if (docType) {
        documentTypeId = docType.id;
      }
    }

    // Upload to Supabase Storage using storageService format
    // Format: empleados/{employeeCode}_{employeeUUID}/{fileUUID}.ext
    const fileExt = path.extname(req.file.originalname).substring(1); // Remove leading dot
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const folderIdentifier = `${employeeInfo.employee_id}_${employeeId}`;
    const filePath = `empleados/${folderIdentifier}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    console.log('✅ Archivo subido exitosamente a:', filePath);

    // IMPORTANTE: Crear el documento en la tabla 'documents' (sistema principal)
    // Esto permite que el documento sea visible en los reportes y folder virtual
    const documentData = {
      title: documentType || req.file.originalname,
      description: `Documento subido por empleado vía portal - ${employeeName}`,
      file_name: req.file.originalname,
      file_path: filePath,
      file_size: req.file.size,
      file_type: path.extname(req.file.originalname).substring(1).toUpperCase(),
      mime_type: req.file.mimetype,
      status: 'pending', // Estado inicial: pendiente de aprobación
      is_public: false,
      uploaded_by: null // Empleado no autenticado como usuario del sistema
    };

    console.log('📝 Creando documento en tabla "documents" (sistema principal)...');

    const { data: mainDocument, error: mainDocError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (mainDocError) {
      console.error('❌ Error creating main document:', mainDocError);
      throw mainDocError;
    }

    console.log('✅ Documento principal creado con ID:', mainDocument.id);

    // OPCIONAL: También crear en employee_documents para compatibilidad con sistema antiguo
    const legacyData = {
      employee_id: employeeInfo.employee_id,
      file_name: req.file.originalname,
      file_path: filePath,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      document_type_id: documentTypeId,
      requirement_id: requestId || null,
      status: 'pendiente'
    };

    const { data: legacyDocument, error: legacyError} = await supabase
      .from('employee_documents')
      .insert(legacyData)
      .select()
      .single();

    if (legacyError) {
      console.log('⚠️ No se pudo crear en employee_documents (legacy):', legacyError.message);
    } else {
      console.log('✅ Documento legacy creado con ID:', legacyDocument.id);
    }

    // Usar el ID del documento principal para las referencias
    const document = mainDocument;

    // If this is responding to a request, update it
    if (requestId) {
      const { error: updateError } = await supabase
        .from('employee_document_requirements')
        .update({
          status: 'submitted',
          document_id: document.id,
          submitted_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('employee_id', employeeId); // Security check

      if (updateError) console.error('Error updating request:', updateError);
    }

    // Create audit log (optional - table might not exist)
    try {
      await supabase.from('audit_logs').insert({
        user_id: employeeId,
        action: 'document_uploaded_by_employee',
        resource_type: 'employee_document',
        resource_id: document.id,
        details: {
          filename: req.file.originalname,
          document_type: documentType,
          request_id: requestId,
          uploaded_via: 'employee_portal'
        }
      });
    } catch (auditError) {
      console.error('Note: Audit log not created:', auditError.message);
      // Continue anyway - audit logging is not critical
    }

    res.json({
      success: true,
      message: 'Documento subido exitosamente',
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Error al subir documento' });
  }
});

/**
 * @swagger
 * /api/employee-portal/{token}/messages:
 *   post:
 *     summary: Send message to administrator
 *     tags: [Employee Portal]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
router.post('/:token/messages', async (req, res) => {
  try {
    const { token } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'validate_employee_portal_token',
      { p_token: token }
    );

    if (tokenError || !tokenData?.[0]?.is_valid) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const employeeId = tokenData[0].employee_id;

    // Insert message
    const { data, error } = await supabase
      .from('employee_admin_messages')
      .insert({
        employee_id: employeeId,
        message: message.trim()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Mensaje enviado al administrador',
      data
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
  }
});

/**
 * @swagger
 * /api/employee-portal/{token}/messages:
 *   get:
 *     summary: Get employee messages history
 *     tags: [Employee Portal]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages history
 */
router.get('/:token/messages', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'validate_employee_portal_token',
      { p_token: token }
    );

    if (tokenError || !tokenData?.[0]?.is_valid) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const employeeId = tokenData[0].employee_id;

    // Get messages
    const { data, error } = await supabase
      .from('employee_admin_messages')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
  }
});

module.exports = router;
