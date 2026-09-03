import api from './api';

/**
 * Service layer for system settings API.
 * Communicates with /api/settings endpoints.
 */
const settingsService = {
  /**
   * Retrieve current system settings.
   */
  getSettings: () => api.get('/settings'),

  /**
   * Update general system settings (Instructor only).
   */
  updateSettings: (updates) => api.put('/settings', updates),

  /**
   * Update document templates (Google Doc links, etc.)
   */
  updateTemplates: (templates) => api.put('/settings/templates', { templates }),

  /**
   * Update milestone deadlines
   */
  updateDeadlines: (deadlines) => api.put('/settings/deadlines', { deadlines }),

  /**
   * Update plagiarism thresholds
   */
  updateThresholds: (thresholds) => api.put('/settings/thresholds', thresholds),
};

export { settingsService };
export default settingsService;
