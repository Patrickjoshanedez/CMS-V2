import { Router } from 'express';
import * as documentController from './document.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  templateIdParamSchema,
  generateDocumentSchema,
  listProjectDocsQuerySchema,
  projectDocParamSchema,
  projectDocIdParamSchema,
} from './document.validation.js';

const router = Router();

/**
 * Document routes — /api/documents
 * All routes require authentication.
 */
router.use(authenticate);

/* ══════════ Template routes (Instructor only) ══════════ */

router.post(
  '/templates',
  authorize(ROLES.INSTRUCTOR),
  validate(createTemplateSchema),
  documentController.createTemplate,
);

router.get(
  '/templates',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.STUDENT, ROLES.PANELIST),
  validate(listTemplatesQuerySchema, 'query'),
  documentController.listTemplates,
);

router.get(
  '/templates/:id',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.STUDENT, ROLES.PANELIST),
  validate(templateIdParamSchema, 'params'),
  documentController.getTemplate,
);

router.patch(
  '/templates/:id',
  authorize(ROLES.INSTRUCTOR),
  validate(templateIdParamSchema, 'params'),
  validate(updateTemplateSchema),
  documentController.updateTemplate,
);

router.delete(
  '/templates/:id',
  authorize(ROLES.INSTRUCTOR),
  validate(templateIdParamSchema, 'params'),
  documentController.deleteTemplate,
);

/* ══════════ Project document routes ══════════ */

router.post(
  '/projects/:projectId/generate',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.INSTRUCTOR),
  validate(projectDocParamSchema, 'params'),
  validate(generateDocumentSchema),
  documentController.generateDocument,
);

router.get(
  '/projects/:projectId',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectDocParamSchema, 'params'),
  validate(listProjectDocsQuerySchema, 'query'),
  documentController.listProjectDocuments,
);

router.get(
  '/projects/:projectId/:docId',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectDocIdParamSchema, 'params'),
  documentController.getProjectDocument,
);

router.delete(
  '/projects/:projectId/:docId',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.INSTRUCTOR),
  validate(projectDocIdParamSchema, 'params'),
  documentController.deleteProjectDocument,
);

export default router;
