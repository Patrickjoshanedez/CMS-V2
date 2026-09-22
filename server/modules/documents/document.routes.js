import { Router } from 'express';
import * as documentController from './document.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { pdfMetadataUpload } from '../../middleware/upload.js';
import validateFile from '../../middleware/fileValidation.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { ROLES } from '@cms/shared';
import {
  projectIdParamSchema,
  projectDocumentTypeParamSchema,
  uploadManuscriptSchema,
  listProjectManuscriptsQuerySchema,
  submitMetadataFeedbackSchema,
  extractionJobIdParamSchema,
} from './document.validation.js';

const router = Router();

router.use(authenticate);

/**
 * Extract title and abstract metadata from a PDF file.
 * Accepts multipart/form-data with a single 'file' field.
 * Returns HTTP 202 with jobId when BullMQ async worker is active,
 * or HTTP 200 directly when fallback or synchronous mode is engaged.
 */
router.post(
  '/extract-pdf-metadata',
  authorize(ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.ADVISER),
  uploadLimiter,
  pdfMetadataUpload.single('file'),
  validateFile,
  documentController.extractPdfMetadataHandler,
);

/**
 * Poll extraction job status and retrieve cached metadata.
 */
router.get(
  '/extraction-status/:jobId',
  authorize(ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.ADVISER),
  validate(extractionJobIdParamSchema, 'params'),
  documentController.getExtractionStatusHandler,
);

router.post(
  '/metadata-feedback',
  authorize(ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.ADVISER),
  validate(submitMetadataFeedbackSchema),
  documentController.submitMetadataFeedback,
);

router.post(
  '/projects/:projectId/manuscripts',
  authorize(ROLES.STUDENT, ROLES.INSTRUCTOR),
  validate(projectIdParamSchema, 'params'),
  validate(uploadManuscriptSchema),
  documentController.uploadManuscript,
);

router.get(
  '/projects/:projectId/manuscripts',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectIdParamSchema, 'params'),
  validate(listProjectManuscriptsQuerySchema, 'query'),
  documentController.listProjectManuscripts,
);

router.get(
  '/projects/:projectId/manuscripts/:documentType/open-link',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectDocumentTypeParamSchema, 'params'),
  documentController.getOpenLink,
);

router.post(
  '/projects/:projectId/manuscripts/:documentType/sync-permissions',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.INSTRUCTOR),
  validate(projectDocumentTypeParamSchema, 'params'),
  documentController.syncPermissions,
);

router.post(
  '/projects/:projectId/manuscripts/:documentType/submit-review',
  authorize(ROLES.ADVISER, ROLES.INSTRUCTOR),
  validate(projectDocumentTypeParamSchema, 'params'),
  documentController.submitReview,
);

router.post(
  '/projects/:projectId/manuscripts/:documentType/sync-comments',
  authorize(ROLES.ADVISER, ROLES.INSTRUCTOR),
  validate(projectDocumentTypeParamSchema, 'params'),
  documentController.syncComments,
);

router.get(
  '/projects/:projectId/manuscripts/:documentType/comments',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectDocumentTypeParamSchema, 'params'),
  documentController.getArchivedComments,
);

export default router;
