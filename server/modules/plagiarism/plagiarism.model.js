import mongoose from 'mongoose';

const matchedBlockSchema = new mongoose.Schema(
  {
    studentStart: { type: Number, min: 0 },
    studentEnd: { type: Number, min: 0 },
    sourceStart: { type: Number, min: 0 },
    sourceEnd: { type: Number, min: 0 },
    matchedText: { type: String, default: '' },
  },
  { _id: false },
);

const textMatchSchema = new mongoose.Schema(
  {
    sourceId: { type: String, default: null },
    sourceTitle: { type: String, default: 'Unknown source' },
    similarityPercentage: { type: Number, min: 0, max: 100, default: null },
    colorCode: { type: String, default: '#ef4444' },
    matchedBlocks: {
      type: [matchedBlockSchema],
      default: [],
    },

    // Backward-compatible aliases used by older API payloads.
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
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
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
