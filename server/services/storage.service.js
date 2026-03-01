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
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../config/storage.js';
import env from '../config/env.js';

class StorageService {
  constructor() {
    this.bucket = env.S3_BUCKET;
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
   * Upload a file buffer to cloud storage.
   *
   * @param {Buffer} buffer - File content
   * @param {string} key - S3 object key (use buildKey())
   * @param {string} contentType - MIME type (e.g. 'application/pdf')
   * @param {Object} [metadata={}] - Optional metadata tags
   * @returns {Promise<{ key: string, bucket: string }>}
   */
  async uploadFile(buffer, key, contentType, metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await s3Client.send(command);

    return { key, bucket: this.bucket };
  }

  /**
   * Generate a temporary pre-signed URL for viewing/downloading a file.
   * URL expires after the specified duration (default 5 minutes).
   *
   * @param {string} key - S3 object key
   * @param {number} [expiresInSeconds=300] - URL lifetime in seconds
   * @returns {Promise<string>} Pre-signed URL
   */
  async getSignedUrl(key, expiresInSeconds = 300) {
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
  }

  /**
   * Download a file from cloud storage as a Buffer.
   *
   * Used by the plagiarism worker to fetch the file for text extraction.
   *
   * @param {string} key - S3 object key
   * @returns {Promise<Buffer>} File content as a Buffer
   */
  async downloadFile(key) {
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
  }

  /**
   * Delete a file from cloud storage.
   *
   * @param {string} key - S3 object key
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await s3Client.send(command);
  }
}

// Singleton — one instance shared across the application
const storageService = new StorageService();
export default storageService;
