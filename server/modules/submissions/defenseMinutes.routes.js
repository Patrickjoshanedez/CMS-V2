import { Router } from 'express';
import * as defenseMinutesController from './defenseMinutes.controller.js';
import authorize, { authorizeSecretaryCapability } from '../../middleware/authorize.js';
import { ROLES, SECRETARY_CAPABILITIES } from '@cms/shared';

const router = Router();

// GET /api/defense-minutes/:projectId/:defenseType — Get or initialize defense session & live scores
router.get(
  '/:projectId/:defenseType',
  authorize(ROLES.FACULTY, ROLES.INSTRUCTOR, ROLES.STUDENT),
  defenseMinutesController.getOrCreateMinutes,
);

// POST /api/defense-minutes/:projectId/:defenseType/entries — Log revision comment
router.post(
  '/:projectId/:defenseType/entries',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.MINUTES_WRITE),
  defenseMinutesController.addEntry,
);

// PATCH /api/defense-minutes/:projectId/:defenseType/entries/:entryId — Edit revision comment
router.patch(
  '/:projectId/:defenseType/entries/:entryId',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.MINUTES_WRITE),
  defenseMinutesController.updateEntry,
);

// DELETE /api/defense-minutes/:projectId/:defenseType/entries/:entryId — Delete revision comment
router.delete(
  '/:projectId/:defenseType/entries/:entryId',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.MINUTES_WRITE),
  defenseMinutesController.deleteEntry,
);

// POST /api/defense-minutes/:projectId/:defenseType/verdict — Record consensus defense verdict
router.post(
  '/:projectId/:defenseType/verdict',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.VERDICT_FINALIZE),
  defenseMinutesController.finalizeVerdict,
);

// POST /api/defense-minutes/:projectId/:defenseType/lock-scores — Confirm & lock composite rubrics
router.post(
  '/:projectId/:defenseType/lock-scores',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.RUBRICS_AGGREGATE),
  defenseMinutesController.lockCompositeScores,
);

// POST /api/defense-minutes/:projectId/:defenseType/publish-matrix — Convert & publish to ADM
router.post(
  '/:projectId/:defenseType/publish-matrix',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.MATRIX_PUBLISH),
  defenseMinutesController.publishToADM,
);

export default router;
