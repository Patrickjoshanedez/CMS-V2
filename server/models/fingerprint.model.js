import mongoose from 'mongoose';

const fingerprintHashSchema = new mongoose.Schema(
  {
    hash: {
      type: String,
      required: true,
      trim: true,
    },
    startIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    endIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const fingerprintSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true,
    },
    chapter: {
      type: String,
      default: null,
      trim: true,
    },
    hashes: {
      type: [fingerprintHashSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

fingerprintSchema.index({ 'hashes.hash': 1 });

export default mongoose.models.Fingerprint || mongoose.model('Fingerprint', fingerprintSchema);
