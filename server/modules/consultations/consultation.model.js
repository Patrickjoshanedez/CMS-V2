/**
 * Consultation model — optional student-adviser consultation logging.
 * Records scheduled and completed consultation sessions between students and their adviser.
 */
import mongoose from 'mongoose';
import softDeletePlugin from '../../middleware/softDelete.js';

const consultationSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    adviserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [300, 'Topic must not exceed 300 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must not exceed 2000 characters'],
      default: '',
    },
    scheduledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

consultationSchema.index({ projectId: 1, status: 1 });
consultationSchema.index({ adviserId: 1, scheduledAt: -1 });
consultationSchema.plugin(softDeletePlugin);

const Consultation = mongoose.model('Consultation', consultationSchema);
export default Consultation;
