import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import auditLog from '../../middleware/auditLog.js';
import { ROLES } from '@cms/shared';

const router = Router();

/**
 * Settings routes — /api/settings
 *
 * GET  /           — Retrieve system settings (authenticated users)
 * PUT  /           — Update system settings (Instructor only)
 * PUT  /templates  — Update document templates (Instructor only)
 * PUT  /deadlines  — Update milestone deadlines (Instructor only)
 * PUT  /thresholds — Update plagiarism thresholds (Instructor only)
 */

router.use(authenticate);

// Any authenticated user can view settings (e.g. plagiarism thresholds, templates)
router.get('/', settingsController.getSettings);

// Only Instructor (admin) can update settings
router.put(
  '/',
  authorize(ROLES.INSTRUCTOR),
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
