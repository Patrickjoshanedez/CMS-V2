/**
 * StorageService — Provider-agnostic file storage abstraction.
 *
 * All file operations (upload, download URL, delete) go through this service.
 * Currently backed by AWS S3. To swap providers (e.g. GCS, Azure Blob),
 * only this file needs to change — no other module references the SDK directly.
 */
import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../config/storage.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

class StorageService {
  constructor() {
    this.bucket = env.S3_BUCKET;
    this.isConfigured = this._checkConfiguration();
  }

  /**
   * Check if S3 credentials and bucket are configured.
   * @returns {boolean}
   */
  _checkConfiguration() {
    const hasCredentials = !!(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
    const hasBucket = !!this.bucket;
    return hasCredentials && hasBucket;
  }

  /**
   * Validate that storage is configured before performing operations.
   * Throws AppError with helpful message if not configured.
   */
  _validateConfiguration() {
    if (!this.bucket) {
      console.error('[StorageService] S3_BUCKET not configured');
      throw new AppError(
        'Storage bucket is not configured. Please contact support.',
        503,
        'STORAGE_BUCKET_NOT_CONFIGURED',
      );
    }

    if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      console.error('[StorageService] S3 credentials not configured');
      throw new AppError(
        'Storage credentials are not configured. Please contact support.',
        503,
        'STORAGE_CREDENTIALS_NOT_CONFIGURED',
      );
    }
  }

  /**
   * Map S3 SDK errors to user-friendly AppError instances.
   * Logs detailed error for debugging while returning safe message to users.
   *
   * @param {Error} error - Original S3 SDK error
   * @param {string} operation - Name of the operation that failed (for logging)
   * @returns {AppError} User-friendly error
   */
  _handleS3Error(error, operation) {
    console.error(`[StorageService] ${operation} failed:`, {
      name: error.name,
      code: error.code || error.Code,
      message: error.message,
      $metadata: error.$metadata,
    });

    // Credentials errors
    if (
      error.name === 'CredentialsProviderError' ||
      error.code === 'CredentialsProviderError' ||
      error.name === 'InvalidAccessKeyId' ||
      error.code === 'InvalidAccessKeyId' ||
      error.name === 'SignatureDoesNotMatch' ||
      error.code === 'SignatureDoesNotMatch'
    ) {
      return new AppError(
        'Storage authentication failed. Please contact support.',
        503,
        'STORAGE_CREDENTIALS_ERROR',
      );
    }

    // Bucket errors
    if (error.name === 'NoSuchBucket' || error.code === 'NoSuchBucket') {
      return new AppError(
        'Storage bucket not found. Please contact support.',
        503,
        'STORAGE_BUCKET_NOT_FOUND',
      );
    }

    // Object not found
    if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey' || error.name === 'NotFound') {
      return new AppError('The requested file was not found.', 404, 'STORAGE_FILE_NOT_FOUND');
    }

    // Access denied
    if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
      return new AppError(
        'Storage access denied. Please contact support.',
        503,
        'STORAGE_ACCESS_DENIED',
      );
    }

    // Network/connection errors
    if (
      error.name === 'NetworkingError' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'TimeoutError'
    ) {
      return new AppError(
        'Storage service is temporarily unavailable. Please try again later.',
        503,
        'STORAGE_CONNECTION_ERROR',
      );
    }

    // Request too large
    if (error.name === 'EntityTooLarge' || error.code === 'EntityTooLarge') {
      return new AppError('File is too large to upload.', 413, 'STORAGE_FILE_TOO_LARGE');
    }

    // Generic fallback
    return new AppError(
      'Failed to process file. Please try again later.',
      500,
      'STORAGE_OPERATION_ERROR',
    );
  }

  /**
   * Health check to verify S3 connectivity.
   * Can be used by health endpoints or startup checks.
   *
   * @returns {Promise<{ healthy: boolean, message: string }>}
   */
  async healthCheck() {
    if (!this.isConfigured) {
      return {
        healthy: false,
        message: 'Storage not configured: missing credentials or bucket',
      };
    }

    try {
      // Simple connectivity test - list buckets
      const command = new ListBucketsCommand({});
      await s3Client.send(command);
      return { healthy: true, message: 'S3 connection successful' };
    } catch (error) {
      console.error('[StorageService] Health check failed:', error.message);
      return {
        healthy: false,
        message: `S3 connection failed: ${error.name}`,
      };
    }
  }

  /**
   * Build an S3 object key for a chapter submission.
   * Format: projects/{projectId}/chapters/{chapterNum}/v{version}/{fileName}
   *
   * @param {string} projectId - MongoDB ObjectId of the project
   * @param {number} chapterNum - Chapter number (1–5)
   * @param {number} version - Version integer
   * @param {string} fileName - Original file name
   * @returns {string} S3 object key
   */
  buildKey(projectId, chapterNum, version, fileName) {
    // Sanitize file name — remove path separators and dangerous chars
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/chapters/${chapterNum}/v${version}/${safeName}`;
  }

  /**
   * Build a storage key for a compiled proposal document.
   * Format: projects/{projectId}/proposal/v{version}/{fileName}
   *
   * @param {string} projectId - MongoDB ObjectId of the project
   * @param {number} version - Version integer
   * @param {string} fileName - Original file name
   * @returns {string} S3 object key
   */
  buildProposalKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/proposal/v${version}/${safeName}`;
  }

  /**
   * Build a storage key for a prototype media file (image or video).
   * Format: projects/{projectId}/prototypes/{prototypeId}/{fileName}
   *
   * @param {string} projectId - MongoDB ObjectId of the project
   * @param {string} prototypeId - MongoDB ObjectId of the prototype sub-document
   * @param {string} fileName - Original file name
   * @returns {string} S3 object key
   */
  buildPrototypeKey(projectId, prototypeId, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/prototypes/${prototypeId}/${safeName}`;
  }

  /**
   * Build a storage key for a final academic paper.
   * Format: projects/{projectId}/final-academic/v{version}/{fileName}
   *
   * @param {string} projectId
   * @param {number} version
   * @param {string} fileName
   * @returns {string} S3 object key
   */
  buildFinalAcademicKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/final-academic/v${version}/${safeName}`;
  }

  /**
   * Build a storage key for a journal/publishable version.
   * Format: projects/{projectId}/final-journal/v{version}/{fileName}
   *
   * @param {string} projectId
   * @param {number} version
   * @param {string} fileName
   * @returns {string} S3 object key
   */
  buildFinalJournalKey(projectId, version, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/final-journal/v${version}/${safeName}`;
  }

  /**
   * Build a storage key for a completion certificate.
   * Format: projects/{projectId}/certificates/{fileName}
   *
   * @param {string} projectId
   * @param {string} fileName
   * @returns {string} S3 object key
   */
  buildCertificateKey(projectId, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `projects/${projectId}/certificates/${safeName}`;
  }

  /**
   * Build a storage key for a bulk-uploaded archive document.
   * Format: archive/bulk/{academicYear}/{fileName}
   *
   * @param {string} academicYear
   * @param {string} fileName
   * @returns {string} S3 object key
   */
  buildBulkArchiveKey(academicYear, fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `archive/bulk/${academicYear}/${safeName}`;
  }

  /**
   * Build a storage key for a user avatar.
   * Format: avatars/{userId}/profile
   * Fixed key so each upload overwrites the previous avatar.
   *
   * @param {string} userId - MongoDB ObjectId of the user
   * @returns {string} S3 object key
   */
  buildAvatarKey(userId) {
    return `avatars/${userId}/profile`;
  }

  /**
   * Upload a file buffer to cloud storage.
   *
   * @param {Buffer} buffer - File content
   * @param {string} key - S3 object key (use buildKey())
   * @param {string} contentType - MIME type (e.g. 'application/pdf')
   * @param {Object} [metadata={}] - Optional metadata tags
   * @returns {Promise<{ key: string, bucket: string }>}
   * @throws {AppError} If storage is not configured or upload fails
   */
  async uploadFile(buffer, key, contentType, metadata = {}) {
    this._validateConfiguration();

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await s3Client.send(command);

      return { key, bucket: this.bucket };
    } catch (error) {
      // If already an AppError (from validation), re-throw
      if (error.isOperational) {
        throw error;
      }
      throw this._handleS3Error(error, 'uploadFile');
    }
  }

  /**
   * Generate a temporary pre-signed URL for viewing/downloading a file.
   * URL expires after the specified duration (default 5 minutes).
   *
   * @param {string} key - S3 object key
   * @param {number} [expiresInSeconds=300] - URL lifetime in seconds
   * @returns {Promise<string>} Pre-signed URL
   * @throws {AppError} If storage is not configured or file not found
   */
  async getSignedUrl(key, expiresInSeconds = 300) {
    this._validateConfiguration();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // Verify the object exists before generating the URL
      await s3Client.send(command);

      // Use GetObjectCommand for the actual download URL
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return getSignedUrl(s3Client, getCommand, { expiresIn: expiresInSeconds });
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw this._handleS3Error(error, 'getSignedUrl');
    }
  }

  /**
   * Download a file from cloud storage as a Buffer.
   *
   * Used by the plagiarism worker to fetch the file for text extraction.
   *
   * @param {string} key - S3 object key
   * @returns {Promise<Buffer>} File content as a Buffer
   * @throws {AppError} If storage is not configured or file not found
   */
  async downloadFile(key) {
    this._validateConfiguration();

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await s3Client.send(command);

      // Convert the readable stream to a Buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw this._handleS3Error(error, 'downloadFile');
    }
  }

  /**
   * Delete a file from cloud storage.
   *
   * @param {string} key - S3 object key
   * @returns {Promise<void>}
   * @throws {AppError} If storage is not configured or deletion fails
   */
  async deleteFile(key) {
    this._validateConfiguration();

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw this._handleS3Error(error, 'deleteFile');
    }
  }
}

// Singleton — one instance shared across the application
const storageService = new StorageService();
export default storageService;
