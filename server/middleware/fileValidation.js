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

const DOCUMENT_ALLOWLIST = { ...ALLOWED_MIME_TYPES, 'text/plain': 'TXT' };

const detectDocumentMime = async (buffer, originalname) => {
  // file-type is ESM-only since v17; dynamic import for compatibility
  const { fileTypeFromBuffer } = await import('file-type');
  const typeResult = await fileTypeFromBuffer(buffer);

  if (typeResult) {
    return typeResult.mime;
  }

  // Fallback for types without magic bytes (e.g. .txt)
  const ext = '.' + originalname.split('.').pop().toLowerCase();
  return EXTENSION_FALLBACK_TYPES[ext] || null;
};

const assertValidDocumentFile = async (file, fieldLabel = 'File') => {
  const { buffer, originalname, size } = file;

  // --- Size check ---
  const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  if (size > maxBytes) {
    throw new AppError(
      `${fieldLabel} size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds the ${env.MAX_UPLOAD_SIZE_MB}MB limit.`,
      413,
      'FILE_TOO_LARGE',
    );
  }

  // --- Magic-byte MIME detection ---
  const detectedMime = await detectDocumentMime(buffer, originalname);
  if (!detectedMime) {
    throw new AppError(
      `${fieldLabel} type could not be determined. Please upload a PDF or DOCX file.`,
      400,
      'UNRECOGNIZED_FILE_TYPE',
    );
  }

  // --- Allowlist check ---
  if (!DOCUMENT_ALLOWLIST[detectedMime]) {
    throw new AppError(
      `${fieldLabel} type "${detectedMime}" is not allowed. Accepted types: PDF, DOCX, TXT.`,
      400,
      'INVALID_FILE_TYPE',
    );
  }

  return detectedMime;
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

    // Attach validated MIME type to the request for downstream use
    req.file.validatedMime = await assertValidDocumentFile(req.file, 'File');

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate the dual-file archive bundle payload.
 * Requires exactly one file for each field:
 * - academicPaperFile
 * - academicJournalFile
 */
const validateDualArchiveFiles = async (req, _res, next) => {
  try {
    const academicPaperFiles = req.files?.academicPaperFile || [];
    const academicJournalFiles = req.files?.academicJournalFile || [];

    if (academicPaperFiles.length !== 1 || academicJournalFiles.length !== 1) {
      return next(
        new AppError(
          'Exactly one Academic Paper file and one Academic Journal file are required.',
          400,
          'DUAL_ARCHIVE_FILES_REQUIRED',
        ),
      );
    }

    const academicPaperFile = academicPaperFiles[0];
    const academicJournalFile = academicJournalFiles[0];

    academicPaperFile.validatedMime = await assertValidDocumentFile(
      academicPaperFile,
      'Academic Paper',
    );
    academicJournalFile.validatedMime = await assertValidDocumentFile(
      academicJournalFile,
      'Academic Journal',
    );

    next();
  } catch (error) {
    next(error);
  }
};

export { ALLOWED_MIME_TYPES, EXTENSION_FALLBACK_TYPES, validateDualArchiveFiles };
export default validateFile;

/**
 * Allowed MIME types for prototype media uploads (images and videos).
 * Used during Capstone 2 & 3 for showcasing system prototypes.
 */
const ALLOWED_PROTOTYPE_MIME_TYPES = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
};

/**
 * Validate an uploaded prototype media file (image/video).
 * Follows the same magic-byte detection pattern as validateFile,
 * but uses a separate allowlist for media types and a larger max size.
 *
 * Max size: 50 MB (configurable via MAX_PROTOTYPE_SIZE_MB env var).
 */
const validatePrototypeFile = async (req, _res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded.', 400, 'NO_FILE'));
    }

    const { buffer, originalname, size } = req.file;

    // --- Size check (default 50 MB for media) ---
    const maxPrototypeMB = Number(env.MAX_PROTOTYPE_SIZE_MB) || 50;
    const maxBytes = maxPrototypeMB * 1024 * 1024;
    if (size > maxBytes) {
      return next(
        new AppError(
          `File size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds the ${maxPrototypeMB}MB limit for prototype media.`,
          413,
          'FILE_TOO_LARGE',
        ),
      );
    }

    // --- Magic-byte MIME detection ---
    const { fileTypeFromBuffer } = await import('file-type');
    const typeResult = await fileTypeFromBuffer(buffer);

    if (!typeResult) {
      return next(
        new AppError(
          `Unable to determine the file type for "${originalname}". Please upload a JPEG, PNG, GIF, WEBP, MP4, or WEBM file.`,
          400,
          'UNRECOGNIZED_FILE_TYPE',
        ),
      );
    }

    const detectedMime = typeResult.mime;

    // --- Allowlist check ---
    if (!ALLOWED_PROTOTYPE_MIME_TYPES[detectedMime]) {
      return next(
        new AppError(
          `File type "${detectedMime}" is not allowed for prototypes. Accepted types: JPEG, PNG, GIF, WEBP, MP4, WEBM.`,
          400,
          'INVALID_FILE_TYPE',
        ),
      );
    }

    req.file.validatedMime = detectedMime;
    next();
  } catch (error) {
    next(error);
  }
};

export { ALLOWED_PROTOTYPE_MIME_TYPES, validatePrototypeFile };

/**
 * Allowed MIME types for avatar uploads (images only, no video).
 */
const ALLOWED_AVATAR_MIME_TYPES = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};

/**
 * Validate an uploaded avatar image.
 * Max 5 MB, JPEG/PNG/WEBP only, magic-byte verified.
 */
export const validateAvatarFile = async (req, _res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded.', 400, 'NO_FILE'));
    }

    const { buffer, size } = req.file;
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (size > maxBytes) {
      return next(
        new AppError(
          `File size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB limit for avatars.`,
          413,
          'FILE_TOO_LARGE',
        ),
      );
    }

    const { fileTypeFromBuffer } = await import('file-type');
    const typeResult = await fileTypeFromBuffer(buffer);

    if (!typeResult || !ALLOWED_AVATAR_MIME_TYPES[typeResult.mime]) {
      return next(
        new AppError(
          'Only JPEG, PNG, and WEBP images are allowed for avatars.',
          400,
          'INVALID_FILE_TYPE',
        ),
      );
    }

    req.file.validatedMime = typeResult.mime;
    next();
  } catch (error) {
    next(error);
  }
};
