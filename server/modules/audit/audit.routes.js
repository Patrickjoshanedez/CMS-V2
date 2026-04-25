import { Router } from 'express';
import * as auditController from './audit.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import { queryLogsSchema } from './audit.validation.js';

const router = Router();

/**
 * Audit log routes — /api/audit
 *
 * GET  /                          — Query all audit logs (Instructor only)
 * GET  /project/:projectId        — Full project-scoped trail (faculty)
 * GET  /:targetType/:targetId     — Entity-specific history (faculty)
 */

router.use(authenticate);

// Full audit log query — Instructor-only
router.get(
  '/',
  authorize(ROLES.INSTRUCTOR),
  validate(queryLogsSchema, 'query'),
  auditController.queryLogs,
);

// Project-scoped full audit trail — MUST be before /:targetType/:targetId
router.get(
  '/project/:projectId',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST),
  auditController.getProjectHistory,
);

// Entity history — available to faculty roles
router.get(
  '/:targetType/:targetId',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST),
  auditController.getEntityHistory,
);

export default router;
