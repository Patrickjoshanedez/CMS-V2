import catchAsync from '../../utils/catchAsync.js';
import settingsService from './settings.service.js';

/**
 * SettingsController — HTTP handlers for system settings.
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
 * Update general system settings. Instructor-only.
 */
export const updateSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, req.user._id);
  res.json({ success: true, data: settings });
});

/**
 * PUT /api/settings/templates
 * Update dynamic Google Doc templates. Instructor-only.
 */
export const updateTemplates = catchAsync(async (req, res) => {
  const templates = req.body.templates || req.body;
  const settings = await settingsService.updateTemplates(
    Array.isArray(templates) ? templates : [templates],
    req.user._id,
  );
  res.json({ success: true, data: settings });
});

/**
 * PUT /api/settings/deadlines
 * Update milestone deadlines. Instructor-only.
 */
export const updateDeadlines = catchAsync(async (req, res) => {
  const deadlines = req.body.deadlines || req.body;
  const settings = await settingsService.updateDeadlines(
    Array.isArray(deadlines) ? deadlines : [deadlines],
    req.user._id,
  );
  res.json({ success: true, data: settings });
});

/**
 * PUT /api/settings/thresholds
 * Update plagiarism thresholds. Instructor-only.
 */
export const updateThresholds = catchAsync(async (req, res) => {
  const settings = await settingsService.updateThresholds(req.body, req.user._id);
  res.json({ success: true, data: settings });
});
