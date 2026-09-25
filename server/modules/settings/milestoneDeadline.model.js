/**
 * MilestoneDeadline Model
 * Manages institutional milestone submission deadlines for capstone deliverables.
 * Deadlines can be assigned globally at the Batch level (targetType: 'batch')
 * or customized per Section (targetType: 'section').
 */
import mongoose from 'mongoose';
import { CAPSTONE_STAGE_VALUES, DELIVERABLE_TYPE_VALUES } from '@cms/shared';

const milestoneDeadlineSchema = new mongoose.Schema(
  {
    batchYear: {
      type: String,
      required: [true, 'Academic batch year is required (e.g. 2025-2026)'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'],
      index: true,
    },
    targetType: {
      type: String,
      enum: {
        values: ['batch', 'section'],
        message: 'Target type must be either batch or section',
      },
      default: 'batch',
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
      index: true,
    },
    stage: {
      type: String,
      enum: {
        values: CAPSTONE_STAGE_VALUES,
        message: 'Invalid capstone stage. Must be capstone_1, capstone_2, capstone_3, or final.',
      },
      required: [true, 'Capstone stage is required'],
      index: true,
    },
    deliverable: {
      type: String,
      enum: {
        values: DELIVERABLE_TYPE_VALUES,
        message: 'Invalid deliverable type',
      },
      required: [true, 'Deliverable type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    deadlineDate: {
      type: Date,
      required: [true, 'Deadline date is required'],
      index: true,
    },
    isMandatory: {
      type: Boolean,
      default: true,
    },
    allowLateSubmission: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Normalize deadlineDate to EOD UTC (23:59:59.999Z) if passed without time
milestoneDeadlineSchema.pre('save', function () {
  if (this.isModified('deadlineDate') && this.deadlineDate) {
    const d = new Date(this.deadlineDate);
    // If exact midnight UTC, normalize to 23:59:59.999Z
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
      d.setUTCHours(23, 59, 59, 999);
      this.deadlineDate = d;
    }
  }
});

// Compound unique index ensuring only one deadline per deliverable per target scope
milestoneDeadlineSchema.index(
  { batchYear: 1, targetType: 1, sectionId: 1, deliverable: 1 },
  { unique: true },
);

// Composite query indexes
milestoneDeadlineSchema.index({ batchYear: 1, stage: 1, deadlineDate: 1 });

const MilestoneDeadline = mongoose.model('MilestoneDeadline', milestoneDeadlineSchema);

export default MilestoneDeadline;
