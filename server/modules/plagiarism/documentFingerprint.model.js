import mongoose from 'mongoose';

const documentFingerprintSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    chapter: {
      type: Number,
      default: null,
    },
    type: {
      type: String,
      default: null,
      trim: true,
    },
    hash: {
      type: String,
      required: true,
      index: true,
    },
    positions: {
      type: [Number],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

documentFingerprintSchema.index({ submissionId: 1, hash: 1 }, { unique: true });
documentFingerprintSchema.index({ hash: 1, submissionId: 1 });
documentFingerprintSchema.index({ projectId: 1, hash: 1 });

export default mongoose.model('DocumentFingerprint', documentFingerprintSchema);
