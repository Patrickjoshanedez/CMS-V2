import mongoose from 'mongoose';

const textMatchSchema = new mongoose.Schema(
  {
    submissionId: { type: String, default: null },
    documentId: { type: String, default: null },
    id: { type: String, default: null },
    title: { type: String, default: 'Unknown' },
    url: { type: String, default: null },
    chapter: { type: Number, default: null },
    excerpt: { type: String, default: '' },
    sourceSnippet: { type: String, default: '' },
    similarity: { type: Number, min: 0, max: 100, default: null },
    matchPercentage: { type: Number, min: 0, max: 100, default: null },
    spans: {
      type: [
        {
          start: { type: Number, required: true },
          end: { type: Number, required: true },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const plagiarismResultSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
      unique: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    // Includes legacy 'pending' for backward compatibility with historical tests/data.
    status: {
      type: String,
      enum: ['queued', 'processing', 'pending', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    similarityPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    warningFlag: {
      type: Boolean,
      default: false,
    },
    textMatches: {
      type: [textMatchSchema],
      default: [],
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    checkedAt: {
      type: Date,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

plagiarismResultSchema.index({ submissionId: 1, status: 1 });

export default mongoose.model('PlagiarismResult', plagiarismResultSchema);
