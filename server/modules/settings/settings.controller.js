import settingsService from './settings.service.js';

/**
 * SettingsController — thin HTTP handlers for system settings.
 * Delegates all business logic to SettingsService.
 */

/**
 * GET /api/settings
 * Retrieve current system settings. Any authenticated user can view them.
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Update system settings. Instructor-only.
 */
export const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body, req.user._id);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
