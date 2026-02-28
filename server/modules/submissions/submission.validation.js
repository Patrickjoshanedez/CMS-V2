/**
 * Zod validation schemas for submission endpoints.
 * Validates request body, query params, and URL params for the submissions module.
 */
import { z } from 'zod';
import { SUBMISSION_STATUS_VALUES } from '@cms/shared';

/* ═══════════════════ Reusable fields ═══════════════════ */

const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

/* ═══════════════════ Params ═══════════════════ */

/**
 * Validate :projectId URL parameter — must be a valid 24-char hex MongoDB ObjectId.
 */
export const projectIdParamSchema = z.object({
  projectId: objectIdField,
});

/**
 * Validate :submissionId URL parameter.
 */
export const submissionIdParamSchema = z.object({
  submissionId: objectIdField,
});

/**
 * Validate :projectId + :chapter URL parameters together.
 * Used by chapter history and latest-chapter routes.
 */
export const projectChapterParamSchema = z.object({
  projectId: objectIdField,
  chapter: z.coerce
    .number()
    .int()
    .min(1, 'Chapter must be between 1 and 5')
    .max(5, 'Chapter must be between 1 and 5'),
});

/**
 * Validate :submissionId + :annotationId URL parameters together.
 * Used by the delete-annotation route.
 */
export const submissionAnnotationParamSchema = z.object({
  submissionId: objectIdField,
  annotationId: objectIdField,
});

/* ═══════════════════ Body ═══════════════════ */

/**
 * Upload chapter body — sent as multipart form data.
 * The file itself is handled by multer; Zod validates the text fields.
 */
export const uploadChapterSchema = z.object({
  chapter: z.coerce
    .number()
    .int('Chapter must be a whole number')
    .min(1, 'Chapter must be between 1 and 5')
    .max(5, 'Chapter must be between 1 and 5'),
  remarks: z
    .string()
    .trim()
    .max(1000, 'Remarks must not exceed 1000 characters')
    .optional()
    .default(''),
});

/**
 * Review submission (approve / request revisions / reject).
 */
export const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'revisions_required', 'rejected'], {
    required_error: 'Review status is required',
    invalid_type_error: 'Status must be approved, revisions_required, or rejected',
  }),
  reviewNote: z
    .string()
    .trim()
    .max(2000, 'Review note must not exceed 2000 characters')
    .optional()
    .default(''),
});

/**
 * Add an annotation (highlight & comment) to a submission.
 */
export const addAnnotationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  content: z
    .string()
    .trim()
    .min(1, 'Annotation content is required')
    .max(2000, 'Annotation must not exceed 2000 characters'),
  highlightCoords: z.any().optional().default(null),
});

/**
 * Request to unlock a locked submission.
 */
export const unlockRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Unlock reason must be at least 10 characters')
    .max(1000, 'Unlock reason must not exceed 1000 characters'),
});

/* ═══════════════════ Query ═══════════════════ */

/**
 * Query params for listing submissions by project.
 */
export const listSubmissionsQuerySchema = z.object({
  chapter: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(SUBMISSION_STATUS_VALUES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
