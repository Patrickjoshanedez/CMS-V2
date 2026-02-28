/**
 * Project model — represents a capstone project tied to a team.
 * Each team can have at most one active project. The project tracks
 * title submission, adviser/panelist assignment, deadlines, and overall status.
 */
import mongoose from 'mongoose';
import {
  TITLE_STATUS_VALUES,
  TITLE_STATUSES,
  PROJECT_STATUS_VALUES,
  PROJECT_STATUSES,
} from '@cms/shared';

const titleModificationRequestSchema = new mongoose.Schema(
  {
    proposedTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 300,
    },
    justification: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const deadlineSchema = new mongoose.Schema(
  {
    chapter1: { type: Date, default: null },
    chapter2: { type: Date, default: null },
    chapter3: { type: Date, default: null },
    proposal: { type: Date, default: null },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      unique: true, // One project per team
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [10, 'Project title must be at least 10 characters'],
      maxlength: [300, 'Project title must not exceed 300 characters'],
    },
    abstract: {
      type: String,
      trim: true,
      maxlength: [500, 'Abstract must not exceed 500 characters'],
      default: '',
    },
    keywords: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A project can have at most 10 keywords',
      },
      default: [],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      match: [/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'],
    },
    capstonePhase: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    titleStatus: {
      type: String,
      enum: {
        values: TITLE_STATUS_VALUES,
        message: 'Invalid title status',
      },
      default: TITLE_STATUSES.DRAFT,
    },
    projectStatus: {
      type: String,
      enum: {
        values: PROJECT_STATUS_VALUES,
        message: 'Invalid project status',
      },
      default: PROJECT_STATUSES.ACTIVE,
    },
    adviserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    panelistIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      validate: {
        validator: (arr) => arr.length <= 3,
        message: 'A project can have at most 3 panelists',
      },
      default: [],
    },
    deadlines: {
      type: deadlineSchema,
      default: () => ({}),
    },
    titleModificationRequest: {
      type: titleModificationRequestSchema,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rejection reason must not exceed 1000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Indexes ---
// teamId unique index is already created by `unique: true` in the schema field.
projectSchema.index({ titleStatus: 1 });
projectSchema.index({ adviserId: 1 });
projectSchema.index({ academicYear: 1, projectStatus: 1 });
projectSchema.index({ title: 'text', keywords: 'text' });

const Project = mongoose.model('Project', projectSchema);

export default Project;
