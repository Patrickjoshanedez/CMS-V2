/**
 * EvaluationTemplate model — allows instructors to define and manage reusable
 * rubric templates for capstone defense evaluations.
 *
 * Templates contain an ordered list of grading criteria (name + maxScore).
 * When a panelist opens an evaluation, the system seeds criteria from the
 * active default template for that defenseType.
 */
import mongoose from 'mongoose';
import { DEFENSE_TYPE_VALUES } from '@cms/shared';
import softDeletePlugin from '../../middleware/softDelete.js';

const templateCriterionSchema = new mongoose.Schema(
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
    order: { type: Number, default: 0 },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: '',
    },
  },
  { _id: false },
);

const evaluationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name must not exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: '',
    },
    defenseType: {
      type: String,
      enum: {
        values: DEFENSE_TYPE_VALUES,
        message: 'Defense type must be one of: ' + DEFENSE_TYPE_VALUES.join(', '),
      },
      required: [true, 'Defense type is required'],
    },
    criteria: {
      type: [templateCriterionSchema],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 20,
        message: 'A template must have between 1 and 20 criteria',
      },
      default: [],
    },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

evaluationTemplateSchema.index({ defenseType: 1, isDefault: 1 });
evaluationTemplateSchema.index({ createdBy: 1 });
evaluationTemplateSchema.plugin(softDeletePlugin);

const EvaluationTemplate = mongoose.model('EvaluationTemplate', evaluationTemplateSchema);
export default EvaluationTemplate;
