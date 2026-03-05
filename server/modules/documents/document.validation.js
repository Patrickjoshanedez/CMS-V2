import { z } from 'zod';
import { DOCUMENT_TYPE_VALUES } from '@cms/shared';

/* ───── Reusable fields ───── */

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdPattern, 'Invalid ObjectId');

/* ───── Template management (Instructor) ───── */

/**
 * POST /api/documents/templates
 * Register an existing Google Doc as a template.
 */
export const createTemplateSchema = z.object({
  googleDocId: z
    .string()
    .trim()
    .min(1, 'Google Doc ID is required'),
  title: z
    .string()
    .trim()
    .min(3, 'Template title must be at least 3 characters')
    .max(200, 'Template title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
  documentType: z.enum(DOCUMENT_TYPE_VALUES, {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
});

/**
 * PATCH /api/documents/templates/:id
 * Update template metadata (title, description, active flag).
 */
export const updateTemplateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Template title must be at least 3 characters')
    .max(200, 'Template title must not exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/documents/templates  (query params)
 */
export const listTemplatesQuerySchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_VALUES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

/* ───── Project documents ───── */

/**
 * POST /api/documents/projects/:projectId/generate
 * Generate a new Google Doc for a project from a template (or blank).
 */
export const generateDocumentSchema = z.object({
  templateId: z
    .string()
    .regex(objectIdPattern, 'Invalid template ID')
    .optional(),
  documentType: z.enum(DOCUMENT_TYPE_VALUES, {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
  title: z
    .string()
    .trim()
    .min(3, 'Document title must be at least 3 characters')
    .max(300, 'Document title must not exceed 300 characters')
    .optional(),
});

/**
 * GET /api/documents/projects/:projectId  (query params)
 */
export const listProjectDocsQuerySchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_VALUES).optional(),
});

/**
 * Param validation for template :id
 */
export const templateIdParamSchema = z.object({
  id: objectId,
});

/**
 * Param validation for project doc routes
 */
export const projectDocParamSchema = z.object({
  projectId: objectId,
});

/**
 * Param validation for single project doc
 */
export const projectDocIdParamSchema = z.object({
  projectId: objectId,
  docId: objectId,
});
