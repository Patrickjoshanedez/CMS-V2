import mongoose from 'mongoose';

/**
 * SystemSettings model — stores global application configuration.
 *
 * Uses a singleton pattern: there is exactly one document in this collection,
 * identified by `key: 'global'`. The `getSettings()` static method uses
 * findOneAndUpdate with upsert to guarantee the document always exists.
 *
 * Configurable settings include:
 *   - plagiarismThreshold: minimum originality score for archiving (default 75%)
 *   - titleSimilarityThreshold: similarity cutoff for duplicate title detection (default 0.65)
 *   - maxFileSize: maximum upload file size in bytes (default 25MB)
 *   - systemAnnouncement: optional banner message displayed to all users
 */
const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      immutable: true,
    },

    // --- Plagiarism & Originality ---
    plagiarismThreshold: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },

    // --- Title Similarity ---
    titleSimilarityThreshold: {
      type: Number,
      default: 0.65,
      min: 0,
      max: 1,
    },

    // --- File Upload ---
    maxFileSize: {
      type: Number,
      default: 25 * 1024 * 1024, // 25MB
      min: 1024, // 1KB minimum
    },

    // --- System Announcement ---
    systemAnnouncement: {
      type: String,
      default: '',
      maxlength: 500,
    },

    // --- Updated by ---
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Retrieve the singleton settings document.
 * Creates the document with defaults if it doesn't exist.
 * @returns {Promise<Object>} The system settings document.
 */
systemSettingsSchema.statics.getSettings = async function () {
  const settings = await this.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return settings;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
