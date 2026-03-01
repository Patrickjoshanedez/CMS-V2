import SystemSettings from './settings.model.js';

/**
 * SettingsService — business logic for system-wide configuration.
 *
 * Manages the singleton SystemSettings document. Only Instructors
 * (Research Coordinators / Admins) may update settings.
 */
class SettingsService {
  /**
   * Retrieve all system settings.
   * @returns {Promise<Object>} The settings document (lean).
   */
  async getSettings() {
    const settings = await SystemSettings.getSettings();
    return {
      plagiarismThreshold: settings.plagiarismThreshold,
      titleSimilarityThreshold: settings.titleSimilarityThreshold,
      maxFileSize: settings.maxFileSize,
      systemAnnouncement: settings.systemAnnouncement,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update system settings.
   * @param {Object} updates - Fields to update.
   * @param {string} userId - The ID of the user making the change.
   * @returns {Promise<Object>} The updated settings.
   */
  async updateSettings(updates, userId) {
    const allowedFields = [
      'plagiarismThreshold',
      'titleSimilarityThreshold',
      'maxFileSize',
      'systemAnnouncement',
    ];

    // Only include whitelisted fields
    const sanitized = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitized[field] = updates[field];
      }
    }

    sanitized.updatedBy = userId;

    const settings = await SystemSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: sanitized },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    return {
      plagiarismThreshold: settings.plagiarismThreshold,
      titleSimilarityThreshold: settings.titleSimilarityThreshold,
      maxFileSize: settings.maxFileSize,
      systemAnnouncement: settings.systemAnnouncement,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Get just the plagiarism threshold value.
   * Used internally by the project archiving gate.
   * @returns {Promise<number>} The threshold (0-100).
   */
  async getPlagiarismThreshold() {
    const settings = await SystemSettings.getSettings();
    return settings.plagiarismThreshold;
  }
}

export default new SettingsService();
