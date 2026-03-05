import catchAsync from '../../utils/catchAsync.js';
import settingsService from './settings.service.js';

/**
 * SettingsController — thin HTTP handlers for system settings.
 * Delegates all business logic to SettingsService.
 * Uses catchAsync for consistent error forwarding (same pattern as all other controllers).
 */

/**
 * GET /api/settings
 * Retrieve current system settings. Any authenticated user can view them.
 */
export const getSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.getSettings();
  res.json({ success: true, data: settings });
});

/**
 * PUT /api/settings
 * Update system settings. Instructor-only.
 */
export const updateSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, req.user._id);
  res.json({ success: true, data: settings });
});
