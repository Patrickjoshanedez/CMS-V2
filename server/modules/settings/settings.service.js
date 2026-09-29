import SystemSettings from './settings.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import DocumentTemplate from '../teams/documentTemplate.model.js';
import { emitToUser } from '../../services/socket.service.js';

/**
 * SettingsService — business logic for system-wide configuration.
 *
 * Manages the singleton SystemSettings document.
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
      plagiarismWarningThreshold: settings.plagiarismWarningThreshold,
      plagiarismRejectThreshold: settings.plagiarismRejectThreshold,
      titleSimilarityThreshold: settings.titleSimilarityThreshold,
      maxFileSize: settings.maxFileSize,
      documentTemplates: settings.documentTemplates || [],
      deadlines: settings.deadlines || [],
      systemAnnouncement: settings.systemAnnouncement,
      maintenanceMode: settings.maintenanceMode,
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
      'plagiarismWarningThreshold',
      'plagiarismRejectThreshold',
      'titleSimilarityThreshold',
      'maxFileSize',
      'documentTemplates',
      'deadlines',
      'systemAnnouncement',
      'maintenanceMode',
    ];

    const sanitized = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitized[field] = updates[field];
      }
    }

    sanitized.updatedBy = userId;
    const changedFields = allowedFields.filter((field) => updates[field] !== undefined);

    const settings = await SystemSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: sanitized },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
    );

    if (changedFields.length > 0) {
      await this._broadcastSettingsUpdate(changedFields);
    }

    // Synchronize to DocumentTemplate collection to keep student team widgets updated
    if (Array.isArray(updates.documentTemplates)) {
      try {
        const manuscriptTpl = updates.documentTemplates.find(
          (t) => t.documentType === 'manuscript_template' || t.documentType === 'proposal_template',
        );
        if (manuscriptTpl?.templateUrl) {
          await DocumentTemplate.updateMany(
            { targetType: 'MANUSCRIPT_CHAPTERS_1_5' },
            { $set: { isActive: false } },
          );
          await DocumentTemplate.create({
            targetType: 'MANUSCRIPT_CHAPTERS_1_5',
            academicYear: '2025-2026',
            versionLabel: 'AY 2025–2026 v2.1',
            distributionType: 'GOOGLE_DOCS',
            resourcePayload: {
              googleDocsUrl: manuscriptTpl.templateUrl,
            },
            updatedBy: userId,
            isActive: true,
          });
        }

        const admTpl = updates.documentTemplates.find((t) => t.documentType === 'adm_form');
        if (admTpl?.templateUrl) {
          await DocumentTemplate.updateMany(
            { targetType: 'ACTION_DONE_MATRIX' },
            { $set: { isActive: false } },
          );
          await DocumentTemplate.create({
            targetType: 'ACTION_DONE_MATRIX',
            academicYear: '2025-2026',
            versionLabel: 'AY 2025–2026 v2.1',
            distributionType: 'GOOGLE_DOCS',
            resourcePayload: {
              googleDocsUrl: admTpl.templateUrl,
            },
            updatedBy: userId,
            isActive: true,
          });
        }
      } catch (syncErr) {
        console.warn('[updateSettings] DocumentTemplate synchronization warning:', syncErr.message);
      }
    }

    return {
      plagiarismThreshold: settings.plagiarismThreshold,
      plagiarismWarningThreshold: settings.plagiarismWarningThreshold,
      plagiarismRejectThreshold: settings.plagiarismRejectThreshold,
      titleSimilarityThreshold: settings.titleSimilarityThreshold,
      maxFileSize: settings.maxFileSize,
      documentTemplates: settings.documentTemplates || [],
      deadlines: settings.deadlines || [],
      systemAnnouncement: settings.systemAnnouncement,
      maintenanceMode: settings.maintenanceMode,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update document templates.
   * @param {Array} templates
   * @param {string} userId
   */
  async updateTemplates(templates, userId) {
    return this.updateSettings({ documentTemplates: templates }, userId);
  }

  /**
   * Update milestone deadlines.
   * @param {Array} deadlines
   * @param {string} userId
   */
  async updateDeadlines(deadlines, userId) {
    return this.updateSettings({ deadlines }, userId);
  }

  /**
   * Update plagiarism thresholds.
   * @param {Object} thresholds
   * @param {string} userId
   */
  async updateThresholds(thresholds, userId) {
    return this.updateSettings(thresholds, userId);
  }

  /**
   * Retrieve the active plagiarism reject threshold (as a percentage 0-100).
   * @returns {Promise<number>}
   */
  async getPlagiarismThreshold() {
    const settings = await SystemSettings.getSettings();
    if (
      settings?.plagiarismRejectThreshold !== undefined &&
      settings?.plagiarismRejectThreshold !== null
    ) {
      return Number(settings.plagiarismRejectThreshold);
    }
    if (settings?.plagiarismThreshold !== undefined && settings?.plagiarismThreshold !== null) {
      return Number(settings.plagiarismThreshold);
    }
    return 50;
  }

  /**
   * Notify all active users that system settings have changed.
   * @param {string[]} changedFields
   * @returns {Promise<void>}
   */
  async _broadcastSettingsUpdate(changedFields) {
    const activeUsers = await User.find({ isActive: true }).select('_id').lean();
    if (activeUsers.length === 0) {
      return;
    }

    const notifications = await Notification.insertMany(
      activeUsers.map((user) => ({
        userId: user._id,
        type: 'system',
        title: 'System Settings Updated',
        message: 'System settings have been updated. Please review the latest configuration.',
        metadata: { changedFields },
      })),
    );

    notifications.forEach((notification) => {
      emitToUser(notification.userId, 'notification:new', notification);
    });
  }
}

export default new SettingsService();
