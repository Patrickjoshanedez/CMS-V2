/**
 * Evaluation routes — /api/evaluations
 *
 * All routes require authentication.
 *
 * Route groups:
 *  - Panelist: get/create evaluation, update draft, submit
 *  - Instructor: release evaluations to students
 *  - Shared: view evaluations (respects RBAC visibility)
 */
import { Router } from 'express';
import * as evaluationController from './evaluation.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  projectDefenseParamSchema,
  evaluationIdParamSchema,
  updateEvaluationSchema,
} from './evaluation.validation.js';

const router = Router();

/**
 * All evaluation routes require authentication.
 */
router.use(authenticate);

/* ────── Shared read routes (must come before parameterized catch-alls) ────── */

/**
 * GET /project/:projectId/:defenseType
 * List all evaluations for a project's defense.
 * Faculty see all; students see only released evaluations.
 */
router.get(
  '/project/:projectId/:defenseType',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(projectDefenseParamSchema, 'params'),
  evaluationController.getProjectEvaluations,
);

/**
 * GET /detail/:evaluationId
 * Get a single evaluation by ID.
 */
router.get(
  '/detail/:evaluationId',
  authorize(ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  validate(evaluationIdParamSchema, 'params'),
  evaluationController.getEvaluation,
);

/* ────── Panelist routes ────── */

/**
 * GET /:projectId/:defenseType
 * Get or create a panelist's evaluation for a project's defense.
 * NOTE: This catch-all must come AFTER static prefix routes like /project/ and /detail/.
 */
router.get(
  '/:projectId/:defenseType',
  authorize(ROLES.PANELIST),
  validate(projectDefenseParamSchema, 'params'),
  evaluationController.getOrCreateEvaluation,
);

/**
 * PATCH /:evaluationId
 * Update a draft evaluation's criteria scores and comments.
 */
router.patch(
  '/:evaluationId',
  authorize(ROLES.PANELIST),
  validate(evaluationIdParamSchema, 'params'),
  validate(updateEvaluationSchema),
  evaluationController.updateEvaluation,
);

/**
 * POST /:evaluationId/submit
 * Submit a draft evaluation, locking it from further edits.
 */
router.post(
  '/:evaluationId/submit',
  authorize(ROLES.PANELIST),
  validate(evaluationIdParamSchema, 'params'),
  evaluationController.submitEvaluation,
);

/* ────── Instructor routes ────── */

/**
 * POST /:projectId/:defenseType/release
 * Release all submitted evaluations for a project's defense to students.
 */
router.post(
  '/:projectId/:defenseType/release',
  authorize(ROLES.INSTRUCTOR),
  validate(projectDefenseParamSchema, 'params'),
  evaluationController.releaseEvaluations,
);

export default router;
