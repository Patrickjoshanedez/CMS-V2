import { Router } from 'express';
import * as documentController from './document.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import upload from '../../middleware/upload.js';
import { ROLES } from '@cms/shared';
import {
  projectIdParamSchema,
  projectDocumentTypeParamSchema,
  uploadManuscriptSchema,
} from './document.validation.js';

const router = Router();

router.use(authenticate);

/**
 * Extract title and abstract metadata from a PDF file.
 * Accepts multipart/form-data with a single 'file' field.
 */
router.post(
  '/extract-pdf-metadata',
  authorize(ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.ADVISER),
  upload.single('file'),
  documentController.extractPdfMetadataHandler,
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
