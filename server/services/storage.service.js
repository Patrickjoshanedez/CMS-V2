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
   * Resolve current static-credential/provider-chain configuration.
   *
   * @returns {{
   *   hasStaticCredentials: boolean,
   *   hasPartialStaticCredentials: boolean,
   *   usesProviderChain: boolean
   * }}
   */
  _getCredentialConfiguration() {
    const accessKey = typeof env.S3_ACCESS_KEY_ID === 'string' ? env.S3_ACCESS_KEY_ID.trim() : '';
    const secretKey =
      typeof env.S3_SECRET_ACCESS_KEY === 'string' ? env.S3_SECRET_ACCESS_KEY.trim() : '';

    const hasAccessKey = accessKey.length > 0;
    const hasSecretKey = secretKey.length > 0;

    return {
      hasStaticCredentials: hasAccessKey && hasSecretKey,
      hasPartialStaticCredentials: hasAccessKey !== hasSecretKey,
      usesProviderChain: !hasAccessKey && !hasSecretKey,
    };
  }

  /**
   * Check if bucket and credential mode are configured.
   * @returns {boolean}
   */
  _checkConfiguration() {
    const hasBucket = !!this.bucket;
    const { hasStaticCredentials, hasPartialStaticCredentials, usesProviderChain } =
      this._getCredentialConfiguration();

    if (hasPartialStaticCredentials) {
      return false;
    }

    return hasBucket && (hasStaticCredentials || usesProviderChain);
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

    const { hasPartialStaticCredentials } = this._getCredentialConfiguration();

    if (hasPartialStaticCredentials) {
      console.error('[StorageService] S3 static credentials are partially configured');
      throw new AppError(
        'Storage credentials are misconfigured. S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must both be set or both be blank.',
        503,
        'STORAGE_CREDENTIALS_NOT_CONFIGURED',
      );
    }
  }

  /**
   * Collect error names/codes/messages from nested causes.
   * Handles wrapped SDK errors (e.g. AggregateError with inner ECONNREFUSED).
   *
   * @param {Error} error
   * @returns {{ names: Set<string>, codes: Set<string>, messages: Set<string> }}
   */
  _collectErrorSignals(error) {
    const queue = [error];
    const visited = new Set();
    const names = new Set();
    const codes = new Set();
    const messages = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (typeof current.name === 'string' && current.name) {
        names.add(current.name);
      }

      const code = current.code || current.Code;
      if (typeof code === 'string' && code) {
        codes.add(code);
      }

      if (typeof current.message === 'string' && current.message) {
        messages.add(current.message);
      }

      if (current.cause && typeof current.cause === 'object') {
        queue.push(current.cause);
      }

      if (Array.isArray(current.errors)) {
        queue.push(...current.errors);
      }
    }

    return { names, codes, messages };
  }

  _hasSignal(signals, signalSet) {
    return signals.some((signal) => signalSet.has(signal));
  }

  _hasMessagePattern(messages, pattern) {
    for (const message of messages) {
      if (pattern.test(message)) {
        return true;
      }
    }
    return false;
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
    const { names, codes, messages } = this._collectErrorSignals(error);

    console.error(`[StorageService] ${operation} failed:`, {
      names: Array.from(names),
      codes: Array.from(codes),
      messages: Array.from(messages),
      $metadata: error.$metadata,
    });

    // Credentials errors
    if (
      this._hasSignal(
        ['CredentialsProviderError', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'],
        names,
      ) ||
      this._hasSignal(
        ['CredentialsProviderError', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'],
        codes,
      ) ||
      this._hasMessagePattern(messages, /credential|signature/i)
    ) {
      return new AppError(
        'Storage authentication failed. Please contact support.',
        503,
        'STORAGE_CREDENTIALS_ERROR',
      );
    }

    // Bucket errors
    if (this._hasSignal(['NoSuchBucket'], names) || this._hasSignal(['NoSuchBucket'], codes)) {
      return new AppError(
        'Storage bucket not found. Please contact support.',
        503,
        'STORAGE_BUCKET_NOT_FOUND',
      );
    }

    // Object not found
    if (
      this._hasSignal(['NoSuchKey', 'NotFound'], names) ||
      this._hasSignal(['NoSuchKey', 'NotFound'], codes)
    ) {
      return new AppError('The requested file was not found.', 404, 'STORAGE_FILE_NOT_FOUND');
    }

    // Access denied
    if (this._hasSignal(['AccessDenied'], names) || this._hasSignal(['AccessDenied'], codes)) {
      return new AppError(
        'Storage access denied. Please contact support.',
        503,
        'STORAGE_ACCESS_DENIED',
      );
    }

    // Network/connection errors
    if (
      this._hasSignal(['NetworkingError', 'TimeoutError', 'UnknownEndpoint'], names) ||
      this._hasSignal(
        ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'],
        codes,
      ) ||
      this._hasMessagePattern(messages, /fetch failed|socket|network|connect|timeout|timed out/i)
    ) {
      return new AppError(
        'Storage service is temporarily unavailable. Please try again later.',
        503,
        'STORAGE_CONNECTION_ERROR',
      );
    }

    // Request too large
    if (this._hasSignal(['EntityTooLarge'], names) || this._hasSignal(['EntityTooLarge'], codes)) {
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
    const { hasStaticCredentials, hasPartialStaticCredentials, usesProviderChain } =
      this._getCredentialConfiguration();
    const credentialMode = hasPartialStaticCredentials
      ? 'invalid-static-pair'
      : hasStaticCredentials
        ? 'static'
        : 'provider-chain';

    if (!this.isConfigured) {
      return {
        healthy: false,
        message: 'Storage not configured: missing bucket or invalid static credential pair',
        bucketConfigured: !!this.bucket,
        credentialMode,
      };
    }

    try {
      // Simple connectivity test - list buckets
      const command = new ListBucketsCommand({});
      await s3Client.send(command);
      return { healthy: true, message: 'S3 connection successful', credentialMode };
    } catch (error) {
      console.error('[StorageService] Health check failed:', error.message);
      return {
        healthy: false,
        message: `S3 connection failed: ${error.name}`,
        credentialMode,
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
