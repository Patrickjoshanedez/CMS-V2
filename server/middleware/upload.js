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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxBytes,
    files: 1, // Only one file per request
  },
});

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

export { prototypeUpload };
export default upload;
