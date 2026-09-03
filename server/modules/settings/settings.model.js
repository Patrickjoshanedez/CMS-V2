import mongoose from 'mongoose';

/**
 * Embedded schema for configurable document templates (Google Docs links, etc.)
 */
const documentTemplateSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
    },
    templateUrl: {
      type: String,
      required: [true, 'Template URL is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

/**
 * Embedded schema for academic milestone deadlines
 */
const globalDeadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deadline title is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    stage: {
      type: String,
      default: 'proposal',
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true },
);

/**
 * SystemSettings model — stores global application configuration.
 *
 * Uses a singleton pattern: there is exactly one document in this collection,
 * identified by `key: 'global'`.
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
    plagiarismWarningThreshold: {
      type: Number,
      default: Number(process.env.PLAGIARISM_WARNING_THRESHOLD) || 15,
      min: 0,
      max: 100,
    },
    plagiarismRejectThreshold: {
      type: Number,
      default: Number(process.env.PLAGIARISM_REJECT_THRESHOLD) || 25,
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

    // --- Dynamic Document Templates ---
    documentTemplates: {
      type: [documentTemplateSchema],
      default: [
        {
          documentType: 'proposal_template',
          templateUrl: 'https://docs.google.com/document/d/example-proposal',
          description: 'Capstone 1 Proposal Manuscript Template',
          lastUpdated: new Date(),
        },
        {
          documentType: 'adm_form',
          templateUrl: 'https://docs.google.com/document/d/example-adm',
          description: 'Action Done Matrix (ADM) Official Template',
          lastUpdated: new Date(),
        },
      ],
    },

    // --- Milestone Deadlines ---
    deadlines: {
      type: [globalDeadlineSchema],
      default: [],
    },

    // --- System Announcement ---
    systemAnnouncement: {
      type: String,
      default: '',
      maxlength: 500,
    },

    // --- Maintenance Mode ---
    maintenanceMode: {
      type: Boolean,
      default: false,
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
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return settings;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
