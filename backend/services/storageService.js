const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { getFileExtension } = require('./documentProcessingService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'documents';

/**
 * Sube un archivo al bucket de Supabase Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} userId - ID del usuario que sube el archivo
 * @param {string} folder - Carpeta donde guardar (general, contratos, certificados, etc.)
 * @returns {Promise<{path: string, publicUrl: string}>}
 */
async function uploadFile(fileBuffer, fileName, mimeType, userId, folder = 'general') {
  try {
    // Validar y sanitizar folder name
    const validFolders = ['general', 'contratos', 'certificados', 'actas', 'resoluciones', 'informes', 'correspondencia', 'empleados'];
    const sanitizedFolder = validFolders.includes(folder.toLowerCase()) ? folder.toLowerCase() : 'general';

    // Generar nombre único para el archivo
    const fileExtension = getFileExtension(fileName, mimeType);
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Construir la ruta del archivo: folder/userId/uniqueFileName
    // Estructura: documents/general/user-uuid/file-uuid.ext
    // Esto garantiza organización y seguridad
    const filePath = `${sanitizedFolder}/${userId}/${uniqueFileName}`;

    console.log(`📁 Uploading to path: ${filePath}`);

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Obtener URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl,
      originalName: fileName,
    };
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
}

/**
 * Elimina un archivo del bucket de Supabase Storage
 */
async function deleteFile(filePath) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
}

/**
 * Obtiene la URL de descarga de un archivo
 */
async function getDownloadUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
}

/**
 * Mueve un archivo a otra carpeta
 */
async function moveFile(fromPath, toPath) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .move(fromPath, toPath);

    if (error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }

    return { success: true, newPath: toPath };
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
}

/**
 * Lista archivos en una carpeta
 */
async function listFiles(folder = '', options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: { column: options.sortBy || 'created_at', order: options.order || 'desc' },
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Obtiene el tamaño total usado por un usuario
 */
async function getUserStorageUsage(userId) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('file_size')
      .eq('created_by', userId);

    if (error) {
      throw new Error(`Failed to get storage usage: ${error.message}`);
    }

    const totalSize = data.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    return totalSize;
  } catch (error) {
    console.error('Error getting storage usage:', error);
    throw error;
  }
}

/**
 * Verifica si un usuario tiene espacio suficiente
 */
async function checkUserQuota(userId, fileSize) {
  try {
    // Obtener quota del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('quota_storage, used_storage')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to get user quota: ${userError.message}`);
    }

    const quotaLimit = userData.quota_storage || 5368709120; // 5GB por defecto
    const quotaUsed = userData.used_storage || 0;
    const available = quotaLimit - quotaUsed;

    return {
      hasSpace: available >= fileSize,
      available,
      used: quotaUsed,
      limit: quotaLimit,
      wouldUse: quotaUsed + fileSize,
    };
  } catch (error) {
    console.error('Error checking user quota:', error);
    throw error;
  }
}

/**
 * Actualiza el uso de storage del usuario
 */
async function updateUserStorageUsage(userId, sizeChange) {
  try {
    // Intentar usar la función RPC primero
    const { error } = await supabase.rpc('update_user_storage', {
      p_user_id: userId,
      p_size_change: sizeChange,
    });

    if (error) {
      // Si la función RPC falla, actualizar manualmente
      console.log('⚠️ RPC failed, updating manually:', error.message);

      const { data: userData } = await supabase
        .from('users')
        .select('used_storage')
        .eq('id', userId)
        .single();

      const newUsage = Math.max(0, (userData?.used_storage || 0) + sizeChange);

      const { error: updateError } = await supabase
        .from('users')
        .update({ used_storage: newUsage })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update storage usage: ${updateError.message}`);
      }
    }

    console.log(`✅ Storage usage updated for user ${userId}: ${sizeChange > 0 ? '+' : ''}${sizeChange} bytes`);
    return { success: true };
  } catch (error) {
    console.error('Error updating storage usage:', error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  getDownloadUrl,
  moveFile,
  listFiles,
  getUserStorageUsage,
  checkUserQuota,
  updateUserStorageUsage,
  BUCKET_NAME,
};
