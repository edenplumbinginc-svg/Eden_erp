// services/storage.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Ensure tmp_uploads directory exists
const TMP_UPLOADS_DIR = path.join(process.cwd(), 'tmp_uploads');

async function ensureUploadDir() {
  try {
    await fs.mkdir(TMP_UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

// Initialize upload directory on module load
ensureUploadDir();

// Generate a unique storage key
function generateStorageKey(taskId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `task-${taskId}-${timestamp}-${random}`;
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return process.env.SUPABASE_URL && process.env.SUPABASE_BUCKET;
}

// Initialize an upload
async function initUpload(taskId) {
  if (!taskId) {
    throw new Error('taskId is required');
  }

  const storage_key = generateStorageKey(taskId);

  if (isSupabaseConfigured()) {
    // TODO: Implement Supabase storage initialization
    // This would involve:
    // 1. Creating a signed upload URL using Supabase client
    // 2. Returning the URL for direct browser upload
    return {
      storage_key,
      upload_url: `TODO_SUPABASE_UPLOAD_URL_${storage_key}`
    };
  } else {
    // Local storage - no direct upload URL, files will be handled server-side
    return {
      storage_key,
      upload_url: null // null indicates server-side handling required
    };
  }
}

// Complete an upload (save metadata, handle local storage)
async function completeUpload({ storage_key, filename, mime, size_bytes, file_data }) {
  if (!storage_key || !filename) {
    throw new Error('storage_key and filename are required');
  }

  if (isSupabaseConfigured()) {
    // TODO: Implement Supabase storage completion
    // This would involve:
    // 1. Verifying the file was uploaded to Supabase
    // 2. Getting file metadata from Supabase
    // 3. Returning success status
    console.log('TODO: Complete Supabase upload for', storage_key);
    return { success: true, storage_key };
  } else {
    // Local storage - save file to tmp_uploads directory
    const filePath = path.join(TMP_UPLOADS_DIR, storage_key);
    
    if (file_data) {
      // If file data is provided (for local development/testing)
      await fs.writeFile(filePath, file_data);
    } else {
      // Create a placeholder file for testing
      const placeholderContent = `Attachment: ${filename}\nMIME: ${mime}\nSize: ${size_bytes} bytes\n`;
      await fs.writeFile(filePath, placeholderContent);
    }
    
    return { success: true, storage_key, local_path: filePath };
  }
}

// Remove an object from storage
async function removeObject(storage_key) {
  if (!storage_key) {
    throw new Error('storage_key is required');
  }

  if (isSupabaseConfigured()) {
    // TODO: Implement Supabase storage deletion
    // This would involve:
    // 1. Using Supabase client to delete the object
    // 2. Handling any errors
    console.log('TODO: Remove from Supabase storage:', storage_key);
    return { success: true };
  } else {
    // Local storage - delete file from tmp_uploads directory
    const filePath = path.join(TMP_UPLOADS_DIR, storage_key);
    
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it already deleted
        return { success: true };
      }
      throw error;
    }
  }
}

// Get a download URL for an attachment
async function getDownloadUrl(storage_key) {
  if (!storage_key) {
    throw new Error('storage_key is required');
  }

  if (isSupabaseConfigured()) {
    // TODO: Generate Supabase signed download URL
    return `TODO_SUPABASE_DOWNLOAD_URL_${storage_key}`;
  } else {
    // For local storage, return a path that the API can serve
    return `/api/attachments/download/${storage_key}`;
  }
}

module.exports = {
  initUpload,
  completeUpload,
  removeObject,
  getDownloadUrl,
  generateStorageKey,
  TMP_UPLOADS_DIR
};