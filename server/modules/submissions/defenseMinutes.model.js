import mongoose from 'mongoose';
import { DEFENSE_TYPE_VALUES } from '@cms/shared';

const defenseMinutesEntrySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'Manuscript / Literature',
        'System Architecture / Backend',
        'UI/UX',
        'Database Schema',
        'Methodology & Implementation',
        'General / Other',
      ],
      default: 'General / Other',
    },
    panelistName: {
      type: String,
      required: [true, 'Panelist name is required'],
      trim: true,
      maxlength: 150,
    },
    panelistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    critique: {
      type: String,
      required: [true, 'Critique or recommendation is required'],
      trim: true,
      maxlength: 2000,
    },
    expectedAction: {
      type: String,
      required: [true, 'Expected action is required'],
      trim: true,
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: ['minor', 'major', 'critical'],
      default: 'minor',
    },
    pageOrModule: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const panelScoreSnapshotSchema = new mongoose.Schema(
  {
    panelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    panelistName: { type: String, default: '', trim: true },
    panelRole: { type: String, default: 'member', trim: true },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: 100 },
    percentage: { type: Number, default: null },
    decision: { type: String, default: null },
    status: { type: String, default: 'draft' },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const defenseMinutesSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    defenseType: {
      type: String,
      enum: DEFENSE_TYPE_VALUES,
      required: true,
      index: true,
    },
    secretaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionStatus: {
      type: String,
      enum: ['scheduled', 'in_progress', 'concluded', 'published'],
      default: 'in_progress',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    entries: {
      type: [defenseMinutesEntrySchema],
      default: [],
    },
    consensusVerdict: {
      verdict: {
        type: String,
        enum: [
          'approved',
          'approved_with_minor_revisions',
          'major_revisions_redefense',
          'failed',
          'pending',
        ],
        default: 'pending',
      },
      remarks: {
        type: String,
        trim: true,
        maxlength: 4000,
        default: '',
      },
      finalizedAt: {
        type: Date,
        default: null,
      },
      finalizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      chairConfirmed: {
        type: Boolean,
        default: false,
      },
      chairConfirmedAt: {
        type: Date,
        default: null,
      },
      chairConfirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    compositeScores: {
      isLocked: {
        type: Boolean,
        default: false,
      },
      lockedAt: {
        type: Date,
        default: null,
      },
      lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      chairConfirmed: {
        type: Boolean,
        default: false,
      },
      chairConfirmedAt: {
        type: Date,
        default: null,
      },
      chairConfirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      averageScore: {
        type: Number,
        default: null,
      },
      averageMaxScore: {
        type: Number,
        default: null,
      },
      averagePercentage: {
        type: Number,
        default: null,
      },
      passingThreshold: {
        type: Number,
        default: 75,
      },
      passingThresholdMet: {
        type: Boolean,
        default: false,
      },
      panelScores: {
        type: [panelScoreSnapshotSchema],
        default: [],
      },
    },
    matrixPublished: {
      type: Boolean,
      default: false,
    },
    matrixPublishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

defenseMinutesSchema.index({ projectId: 1, defenseType: 1 }, { unique: true });

const DefenseMinutes = mongoose.model('DefenseMinutes', defenseMinutesSchema);

export default DefenseMinutes;
