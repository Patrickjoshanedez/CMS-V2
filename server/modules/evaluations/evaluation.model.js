/**
 * Evaluation model — tracks panelist defense grading for capstone projects.
 *
 * Each panelist assigned to a project submits one Evaluation per defense type
 * (proposal defense or final defense). Each Evaluation contains scored criteria.
 * The instructor can release grades so students can view them.
 */
import mongoose from 'mongoose';
import {
  EVALUATION_STATUS_VALUES,
  EVALUATION_STATUSES,
  DEFENSE_TYPE_VALUES,
} from '@cms/shared';

/**
 * Embedded schema for individual grading criteria within an evaluation.
 * Each criterion has a name, max possible score, actual score, and optional comment.
 */
const criterionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Criterion name is required'],
      trim: true,
      maxlength: [200, 'Criterion name must not exceed 200 characters'],
    },
    maxScore: {
      type: Number,
      required: [true, 'Max score is required'],
      min: [1, 'Max score must be at least 1'],
      max: [100, 'Max score must not exceed 100'],
    },
    score: {
      type: Number,
      default: null,
      min: [0, 'Score cannot be negative'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment must not exceed 500 characters'],
      default: '',
    },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    panelistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Panelist ID is required'],
    },
    defenseType: {
      type: String,
      enum: {
        values: DEFENSE_TYPE_VALUES,
        message: 'Defense type must be one of: proposal, final',
      },
      required: [true, 'Defense type is required'],
    },

    /** Criteria-based scoring rubric */
    criteria: {
      type: [criterionSchema],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 20,
        message: 'An evaluation must have between 1 and 20 criteria',
      },
      default: [],
    },

    /** Computed total score (sum of criteria scores) */
    totalScore: {
      type: Number,
      default: null,
      min: 0,
    },

    /** Computed maximum possible score (sum of criteria maxScores) */
    maxTotalScore: {
      type: Number,
      default: null,
      min: 0,
    },

    /** Free-form overall comments from the panelist */
    overallComment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Overall comment must not exceed 2000 characters'],
      default: '',
    },

    /** Workflow status: draft → submitted → released (by instructor) */
    status: {
      type: String,
      enum: {
        values: EVALUATION_STATUS_VALUES,
        message: 'Invalid evaluation status',
      },
      default: EVALUATION_STATUSES.DRAFT,
    },

    /** Timestamp when panelist submitted the evaluation */
    submittedAt: {
      type: Date,
      default: null,
    },

    /** Timestamp when instructor released the evaluation to students */
    releasedAt: {
      type: Date,
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
// One evaluation per panelist per project per defense type
evaluationSchema.index(
  { projectId: 1, panelistId: 1, defenseType: 1 },
  { unique: true },
);
// Quick lookup: all evaluations for a project
evaluationSchema.index({ projectId: 1, defenseType: 1 });
// Panelist's evaluations
evaluationSchema.index({ panelistId: 1, status: 1 });

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
