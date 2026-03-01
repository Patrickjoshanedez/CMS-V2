/**
 * Submission model — tracks individual chapter / document uploads per capstone project.
 *
 * Each upload creates a new Submission document. Re-uploads for the same chapter
 * increment the version number. Previous versions are retained for audit purposes.
 * The latest version for a given chapter is the one with the highest version number.
 *
 * Storage: File binaries live in S3; this model stores only metadata and the S3 key.
 */
import mongoose from 'mongoose';
import {
  SUBMISSION_STATUS_VALUES,
  SUBMISSION_STATUSES,
  PLAGIARISM_STATUS_VALUES,
} from '@cms/shared';

/**
 * Embedded schema for matched sources found during plagiarism checking.
 */
const matchedSourceSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
    },
    projectTitle: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    chapter: {
      type: Number,
      default: null,
    },
    matchPercentage: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
  },
  { _id: false },
);

/**
 * Embedded schema for the plagiarism/originality check result.
 * Populated asynchronously by the plagiarism job worker.
 */
const plagiarismResultSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: {
        values: PLAGIARISM_STATUS_VALUES,
        message: 'Invalid plagiarism status',
      },
      default: null,
    },
    originalityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    matchedSources: {
      type: [matchedSourceSchema],
      default: [],
    },
    processedAt: {
      type: Date,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

/**
 * Embedded schema for adviser annotations (highlight & comment tool).
 * Each annotation records a comment, page, and optional highlight coordinates.
 */
const annotationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    page: {
      type: Number,
      min: 1,
      default: 1,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    highlightCoords: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const submissionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    chapter: {
      type: Number,
      required: [true, 'Chapter number is required'],
      min: [1, 'Chapter must be between 1 and 5'],
      max: [5, 'Chapter must be between 1 and 5'],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    // --- File metadata (binary lives in S3) ---
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: 255,
    },
    fileType: {
      type: String,
      required: [true, 'File MIME type is required'],
      trim: true,
      maxlength: 100,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 1,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
    },

    // --- Workflow ---
    status: {
      type: String,
      enum: {
        values: SUBMISSION_STATUS_VALUES,
        message: 'Invalid submission status',
      },
      default: SUBMISSION_STATUSES.PENDING,
    },
    originalityScore: {
      type: Number,
      default: null, // Populated asynchronously by the plagiarism job
      min: 0,
      max: 100,
    },

    // --- Plagiarism / originality check result (async) ---
    plagiarismResult: {
      type: plagiarismResultSchema,
      default: () => ({}),
    },

    // --- Extracted text (cached for corpus building) ---
    extractedText: {
      type: String,
      default: null,
      select: false, // Excluded from default queries to save bandwidth
    },

    // --- People ---
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitter is required'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // --- Late submission ---
    isLate: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Remarks must not exceed 1000 characters'],
      default: null,
    },

    // --- Review feedback ---
    reviewNote: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review note must not exceed 2000 characters'],
      default: null,
    },

    // --- Adviser annotations (highlight & comment) ---
    annotations: {
      type: [annotationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Indexes ---
// Fast lookups: all submissions for a project/chapter combo
submissionSchema.index({ projectId: 1, chapter: 1, version: -1 });
// Find the latest version quickly
submissionSchema.index({ projectId: 1, chapter: 1, status: 1 });
// Faculty lookups: submissions awaiting review
submissionSchema.index({ status: 1, createdAt: -1 });
// Submitter history
submissionSchema.index({ submittedBy: 1, createdAt: -1 });
// Plagiarism status lookups
submissionSchema.index({ 'plagiarismResult.status': 1 });
// Ensure unique version per project-chapter combo
submissionSchema.index({ projectId: 1, chapter: 1, version: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
