/**
 * File validation middleware — MIME type & size enforcement.
 *
 * Security Rule 2B: Never trust the file extension provided by the client.
 * This middleware uses the `file-type` library to inspect the actual binary
 * signature (magic bytes) of each uploaded file. It also enforces file-size
 * limits and an explicit MIME-type allowlist.
 *
 * Works with multer — must be placed AFTER multer middleware in the chain.
 */
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

/**
 * Allowed MIME types for document submissions.
 * Maps the detected MIME (from magic bytes) to human-readable labels.
 */
const ALLOWED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

/**
 * Additional MIME types where file-type may not detect but are still valid.
 * Plain text files (.txt) have no magic bytes — detected by extension fallback.
 */
const EXTENSION_FALLBACK_TYPES = {
  '.txt': 'text/plain',
};

/**
 * Validate the uploaded file's real MIME type via magic bytes,
 * enforce size limits, and reject files that don't match the allowlist.
 *
 * @param {Object} _req - Express request (unused — file is on req.file)
 * @param {Object} _res - Express response (unused)
 * @param {Function} next - Express next function
 */
const validateFile = async (req, _res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded.', 400, 'NO_FILE'));
    }

    const { buffer, originalname, size } = req.file;

    // --- Size check ---
    const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (size > maxBytes) {
      return next(
        new AppError(
          `File size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds the ${env.MAX_UPLOAD_SIZE_MB}MB limit.`,
          413,
          'FILE_TOO_LARGE',
        ),
      );
    }

    // --- Magic-byte MIME detection ---
    // file-type is ESM-only since v17; dynamic import for compatibility
    const { fileTypeFromBuffer } = await import('file-type');
    const typeResult = await fileTypeFromBuffer(buffer);

    let detectedMime;

    if (typeResult) {
      detectedMime = typeResult.mime;
    } else {
      // Fallback for types without magic bytes (e.g. .txt)
      const ext = '.' + originalname.split('.').pop().toLowerCase();
      detectedMime = EXTENSION_FALLBACK_TYPES[ext] || null;
    }

    if (!detectedMime) {
      return next(
        new AppError(
          'Unable to determine the file type. Please upload a PDF or DOCX file.',
          400,
          'UNRECOGNIZED_FILE_TYPE',
        ),
      );
    }

    // --- Allowlist check ---
    // Also allow text/plain for .txt fallback
    const allAllowed = { ...ALLOWED_MIME_TYPES, 'text/plain': 'TXT' };
    if (!allAllowed[detectedMime]) {
      return next(
        new AppError(
          `File type "${detectedMime}" is not allowed. Accepted types: PDF, DOCX, TXT.`,
          400,
          'INVALID_FILE_TYPE',
        ),
      );
    }

    // Attach validated MIME type to the request for downstream use
    req.file.validatedMime = detectedMime;

    next();
  } catch (error) {
    next(error);
  }
};

export { ALLOWED_MIME_TYPES, EXTENSION_FALLBACK_TYPES };
export default validateFile;
