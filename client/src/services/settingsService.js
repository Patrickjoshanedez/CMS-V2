import api from './api';

/**
 * Service layer for system settings API.
 * Communicates with /api/settings endpoints.
 */
const settingsService = {
  /**
   * Retrieve current system settings.
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getSettings: () => api.get('/settings'),

  /**
   * Update system settings (Instructor only).
   * @param {Object} updates - Partial settings to update
   * @param {number} [updates.plagiarismThreshold] - 0–100
   * @param {number} [updates.titleSimilarityThreshold] - 0–1
   * @param {number} [updates.maxFileSize] - bytes
   * @param {string} [updates.systemAnnouncement] - max 500 chars
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateSettings: (updates) => api.put('/settings', updates),
};

export default settingsService;
