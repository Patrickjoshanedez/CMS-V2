import mongoose from 'mongoose';

const submissionRoundSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    chapter: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    type: {
      type: String,
      enum: ['chapter', 'proposal', 'final_academic', 'final_journal'],
      default: 'chapter',
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    sourceSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
      index: true,
    },
    filePath: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pending_student_upload',
        'pending_instructor_review',
        'revision_requested',
        'approved',
      ],
      default: 'pending_student_upload',
      index: true,
    },
    overallFeedback: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPlaceholder: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

submissionRoundSchema.index(
  { projectId: 1, chapter: 1, type: 1, roundNumber: 1 },
  { unique: true },
);

const SubmissionRound = mongoose.model('SubmissionRound', submissionRoundSchema);
export default SubmissionRound;
