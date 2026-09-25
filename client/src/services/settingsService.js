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

  /**
   * Retrieve milestone submission deadlines
   */
  getMilestoneDeadlines: (params) => api.get('/settings/deadlines/milestone', { params }),

  /**
   * Upsert milestone submission deadline (Instructor only)
   */
  upsertMilestoneDeadline: (data) => api.post('/settings/deadlines/milestone', data),

  /**
   * Delete milestone deadline (Instructor only)
   */
  deleteMilestoneDeadline: (id) => api.delete(`/settings/deadlines/milestone/${id}`),
};

export { settingsService };
export default settingsService;
