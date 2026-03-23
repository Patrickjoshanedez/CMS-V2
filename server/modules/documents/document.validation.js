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
