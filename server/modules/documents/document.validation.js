import { z } from 'zod';
import { DOCUMENT_TYPE_VALUES } from '@cms/shared';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const projectIdParamSchema = z.object({
  projectId: z.string().regex(objectIdPattern, 'Invalid project ID'),
});

export const projectDocumentTypeParamSchema = z.object({
  projectId: z.string().regex(objectIdPattern, 'Invalid project ID'),
  documentType: z.enum(DOCUMENT_TYPE_VALUES, {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
});

export const uploadManuscriptSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_VALUES, {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(300, 'Title must not exceed 300 characters')
    .optional(),
  externalDocUrl: z.string().trim().url('externalDocUrl must be a valid URL'),
  externalDocProvider: z.enum(['google_docs', 'other']).optional(),
});

export const listProjectManuscriptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const submitMetadataFeedbackSchema = z.object({
  fieldName: z.enum(['title', 'abstract', 'authors', 'year', 'doi', 'venue', 'keywords'], {
    errorMap: () => ({ message: 'Invalid metadata field name' }),
  }),
  extractedValue: z.string().trim().max(4000).optional(),
  correctedValue: z
    .string()
    .trim()
    .min(1, 'Corrected value is required')
    .max(4000, 'Corrected value must not exceed 4000 characters'),
  confidence: z.coerce.number().min(0).max(100).optional(),
  sourceFileName: z.string().trim().max(255).optional(),
  sourceHash: z.string().trim().max(128).optional(),
  feedbackNotes: z.string().trim().max(1000).optional(),
  context: z.string().trim().max(120).optional(),
});
