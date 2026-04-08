/**
 * FilesystemStorageService — Local filesystem file storage adapter.
 *
 * Drop-in replacement for StorageService (AWS S3).
 * All file operations use the local filesystem instead of cloud storage.
 *
 * Perfect for development, testing, and local deployments.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import { STORAGE_ARCHIVE_PREFIXES, STORAGE_ROOT_PREFIXES } from '@cms/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FilesystemStorageService {
  constructor() {
    // Base directory for all uploads. Configurable via env, defaults to ./uploads
    this.baseDir = env.STORAGE_LOCAL_PATH || path.join(__dirname, '..', '..', 'uploads');
    this.isConfigured = true;
  }

  /**
   * Ensure the base directory exists.
   * @private
   */
  async _ensureBaseDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('[FilesystemStorageService] Failed to create base directory:', error);
      throw new AppError('Storage directory initialization failed', 500, 'STORAGE_DIR_ERROR');
    }
  }

  /**
   * Ensure all parent directories for a file exist.
   * @private
   */
  async _ensureDirectory(filePath) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('[FilesystemStorageService] Failed to create directory:', error);
      throw new AppError('Storage directory creation failed', 500, 'STORAGE_DIR_ERROR');
    }
  }

  /**
   * Health check — verify storage is accessible.
   * @returns {Promise<{ healthy: boolean, message: string }>}
   */
  async healthCheck() {
    try {
      await this._ensureBaseDir();
      return {
        healthy: true,
        message: 'Filesystem storage accessible',
        basePath: this.baseDir,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Filesystem storage error: ${error.message}`,
        basePath: this.baseDir,
      };
    }
  }

  /**
   * Build a filesystem path for a chapter submission.
   * Format: uploads/archives/projects/{projectId}/chapters/{chapterNum}/v{version}/{fileName}
   *
   * @param {string} projectId - MongoDB ObjectId of the project
   * @param {number} chapterNum - Chapter number (1–5)
   * @param {number} version - Version integer
   * @param {string} fileName - Original file name
   * @returns {string} Full filesystem path
   */
  buildKey(projectId, chapterNum, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/chapters/${chapterNum}/v${version}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a compiled proposal document.
   * @param {string} projectId
   * @param {number} version
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildProposalKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/proposal/v${version}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a prototype media file.
   * @param {string} projectId
   * @param {string} prototypeId
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildPrototypeKey(projectId, prototypeId, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/prototypes/${prototypeId}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a final academic paper.
   * @param {string} projectId
   * @param {number} version
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildFinalAcademicKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/final-academic/v${version}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a journal/publishable version.
   * @param {string} projectId
   * @param {number} version
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildFinalJournalKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/final-journal/v${version}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a completion certificate.
   * @param {string} projectId
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildCertificateKey(projectId, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.PROJECTS}/${projectId}/certificates/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a bulk-uploaded archive document.
   * @param {string} academicYear
   * @param {string} fileName
   * @returns {string} Full filesystem path
   */
  buildBulkArchiveKey(academicYear, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${STORAGE_ARCHIVE_PREFIXES.BULK}/${academicYear}/${safeName}`;
    return path.join(this.baseDir, key);
  }

  /**
   * Build a filesystem path for a user avatar.
   * @param {string} userId - MongoDB ObjectId of the user
   * @returns {string} Full filesystem path
   */
  buildAvatarKey(userId) {
    const key = `${STORAGE_ROOT_PREFIXES.AVATARS}/${userId}/profile`;
    return path.join(this.baseDir, key);
  }

  /**
   * Upload a file buffer to local filesystem.
   *
   * @param {Buffer} buffer - File content
   * @param {string} key - Full filesystem path (from buildKey() etc.)
   * @param {string} contentType - MIME type (stored in metadata file for reference)
   * @param {Object} [metadata={}] - Optional metadata (stored as JSON)
   * @returns {Promise<{ key: string, path: string }>}
   * @throws {AppError} If upload fails
   */
  async uploadFile(buffer, key, contentType, metadata = {}) {
    try {
      await this._ensureDirectory(key);

      // Write the file
      await fs.writeFile(key, buffer);

      // Store metadata alongside the file
      const metadataPath = `${key}.meta.json`;
      const metadataContent = {
        contentType,
        uploadedAt: new Date().toISOString(),
        size: buffer.length,
        ...metadata,
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));

      // Return relative path from base directory for consistency with S3
      const relativePath = path.relative(this.baseDir, key);
      return {
        key: relativePath,
        path: key,
        bucket: this.baseDir,
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      console.error('[FilesystemStorageService] Upload failed:', error);
      throw new AppError('Failed to upload file', 500, 'STORAGE_UPLOAD_ERROR');
    }
  }

  /**
   * Generate a local file URL for viewing/downloading.
   * In development, this returns a relative URL that can be served by Express.
   * For public access, configure a static file middleware on /storage route.
   *
   * @param {string} key - Full filesystem path
   * @returns {Promise<string>} Public URL or local path
   * @throws {AppError} If file doesn't exist
   */
  async getSignedUrl(key) {
    try {
      // Check if file exists
      await fs.access(key);

      // Return a URL path relative to the base uploads directory
      // This expects a static middleware mounted at /storage in Express
      const relativePath = path.relative(this.baseDir, key);
      const url = `/storage/${relativePath.replace(/\\/g, '/')}`;

      return url;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('The requested file was not found.', 404, 'STORAGE_FILE_NOT_FOUND');
      }
      console.error('[FilesystemStorageService] getSignedUrl failed:', error);
      throw new AppError('Failed to generate download URL', 500, 'STORAGE_URL_ERROR');
    }
  }

  /**
   * Download a file from the filesystem as a Buffer.
   *
   * @param {string} key - Full filesystem path
   * @returns {Promise<Buffer>} File content
   * @throws {AppError} If file not found or read fails
   */
  async downloadFile(key) {
    try {
      const buffer = await fs.readFile(key);
      return buffer;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('The requested file was not found.', 404, 'STORAGE_FILE_NOT_FOUND');
      }
      console.error('[FilesystemStorageService] Download failed:', error);
      throw new AppError('Failed to download file', 500, 'STORAGE_DOWNLOAD_ERROR');
    }
  }

  /**
   * Delete a file from the filesystem.
   *
   * @param {string} key - Full filesystem path
   * @returns {Promise<void>}
   * @throws {AppError} If deletion fails
   */
  async deleteFile(key) {
    try {
      await fs.unlink(key);

      // Also delete the metadata file if it exists
      const metadataPath = `${key}.meta.json`;
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file may not exist, that's fine
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File already doesn't exist, that's fine
        return;
      }
      console.error('[FilesystemStorageService] Delete failed:', error);
      throw new AppError('Failed to delete file', 500, 'STORAGE_DELETE_ERROR');
    }
  }
}

export default new FilesystemStorageService();
