/**
 * Multer configuration for file uploads.
 * Uses memory storage (buffer) so files can be inspected for magic bytes
 * before being forwarded to S3 via StorageService.
 *
 * File size limits are enforced both here (multer) and in fileValidation
 * middleware for defense-in-depth.
 */
import multer from 'multer';
import env from '../config/env.js';

const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const createMemoryUpload = (fileSizeLimitBytes, maxFiles) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: fileSizeLimitBytes,
      files: maxFiles,
    },
  });

const upload = createMemoryUpload(maxBytes, 1);

/**
 * Multer instance for archive bundle uploads requiring two files:
 * one academic paper and one journal paper.
 */
const archiveDualUpload = createMemoryUpload(maxBytes, 2);

/**
 * Larger multer instance for prototype media uploads (images/videos).
 * Uses MAX_PROTOTYPE_SIZE_MB (default 50 MB).
 */
const prototypeMaxBytes = env.MAX_PROTOTYPE_SIZE_MB * 1024 * 1024;

const prototypeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: prototypeMaxBytes,
    files: 1,
  },
});

export { prototypeUpload, archiveDualUpload };
export default upload;
