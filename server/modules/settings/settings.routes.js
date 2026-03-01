import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import auditLog from '../../middleware/auditLog.js';
import { ROLES } from '@cms/shared';
import { updateSettingsSchema } from './settings.validation.js';

const router = Router();

/**
 * Settings routes — /api/settings
 *
 * GET  / — Retrieve system settings (any authenticated user)
 * PUT  / — Update system settings (Instructor only)
 */

router.use(authenticate);

// Any authenticated user can view settings (e.g., to see announcements)
router.get('/', settingsController.getSettings);

// Only the Instructor (admin) can update system settings
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

export default router;
