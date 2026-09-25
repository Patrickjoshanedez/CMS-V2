import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import * as milestoneDeadlineController from './milestoneDeadline.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import auditLog from '../../middleware/auditLog.js';
import validate from '../../middleware/validate.js';
import { updateSettingsSchema } from './settings.validation.js';
import { ROLES } from '@cms/shared';

const router = Router();

/**
 * Settings routes — /api/settings
 *
 * GET    /                     — Retrieve system settings (authenticated users)
 * PUT    /                     — Update system settings (Instructor only)
 * PUT    /templates            — Update document templates (Instructor only)
 * PUT    /deadlines            — Update legacy milestone deadlines (Instructor only)
 * GET    /deadlines/milestone  — Retrieve milestone submission deadlines (authenticated)
 * POST   /deadlines/milestone  — Upsert milestone submission deadline (Instructor only)
 * DELETE /deadlines/milestone/:id — Remove milestone deadline (Instructor only)
 * PUT    /thresholds           — Update plagiarism thresholds (Instructor only)
 */

router.use(authenticate);

// Any authenticated user can view settings (e.g. plagiarism thresholds, templates)
router.get('/', settingsController.getSettings);

// Milestone submission deadlines
router.get('/deadlines/milestone', milestoneDeadlineController.getMilestoneDeadlines);
router.post(
  '/deadlines/milestone',
  authorize(ROLES.INSTRUCTOR),
  auditLog('settings.deadlines.milestone.upserted', 'Settings', {
    getTargetId: (req) => `${req.body.batchYear}-${req.body.deliverable}`,
    getDescription: () => 'Upserted milestone submission deadline',
    getMetadata: (req) => ({ deadline: req.body }),
  }),
  milestoneDeadlineController.upsertMilestoneDeadline,
);
router.delete(
  '/deadlines/milestone/:id',
  authorize(ROLES.INSTRUCTOR),
  auditLog('settings.deadlines.milestone.deleted', 'Settings', {
    getTargetId: (req) => req.params.id,
    getDescription: () => 'Deleted milestone submission deadline',
  }),
  milestoneDeadlineController.deleteMilestoneDeadline,
);

// Only Instructor (admin) can update settings
router.put(
  '/',
  authorize(ROLES.INSTRUCTOR),
  validate(updateSettingsSchema),
  auditLog('settings.updated', 'Settings', {
    getTargetId: () => 'global',
    getDescription: () => 'Updated system settings',
    getMetadata: (req) => ({ changes: req.body }),
  }),
  settingsController.updateSettings,
);

router.put(
  '/templates',
  authorize(ROLES.INSTRUCTOR),
  auditLog('settings.templates.updated', 'Settings', {
    getTargetId: () => 'global',
    getDescription: () => 'Updated document templates',
    getMetadata: (req) => ({ templates: req.body }),
  }),
  settingsController.updateTemplates,
);

router.put(
  '/deadlines',
  authorize(ROLES.INSTRUCTOR),
  auditLog('settings.deadlines.updated', 'Settings', {
    getTargetId: () => 'global',
    getDescription: () => 'Updated milestone deadlines',
    getMetadata: (req) => ({ deadlines: req.body }),
  }),
  settingsController.updateDeadlines,
);

router.put(
  '/thresholds',
  authorize(ROLES.INSTRUCTOR),
  auditLog('settings.thresholds.updated', 'Settings', {
    getTargetId: () => 'global',
    getDescription: () => 'Updated plagiarism thresholds',
    getMetadata: (req) => ({ thresholds: req.body }),
  }),
  settingsController.updateThresholds,
);

export default router;
