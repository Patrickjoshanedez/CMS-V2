/**
 * Classroom-style manuscript review model.
 *
 * Stores one active manuscript reference per project + documentType.
 * The drafting source is link-first (for example Google Docs share links),
 * while archived comments and permission snapshots remain internal.
 */
import mongoose from 'mongoose';
import { DOCUMENT_TYPE_VALUES } from '@cms/shared';

const permissionEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['writer', 'commenter', 'reader'],
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const archivedReplySchema = new mongoose.Schema(
  {
    externalReplyId: { type: String, required: true },
    content: { type: String, default: '' },
    authorName: { type: String, default: '' },
    authorEmail: { type: String, default: '' },
    createdAtExternal: { type: Date, default: null },
    modifiedAtExternal: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const archivedCommentSchema = new mongoose.Schema(
  {
    externalCommentId: { type: String, required: true },
    content: { type: String, default: '' },
    quotedText: { type: String, default: '' },
    authorName: { type: String, default: '' },
    authorEmail: { type: String, default: '' },
    createdAtExternal: { type: Date, default: null },
    modifiedAtExternal: { type: Date, default: null },
    resolved: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    replies: {
      type: [archivedReplySchema],
      default: [],
    },
  },
  { _id: false },
);

const manuscriptSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPE_VALUES,
        message: 'Invalid document type',
      },
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      minlength: [3, 'Document title must be at least 3 characters'],
      maxlength: [300, 'Document title must not exceed 300 characters'],
    },
    originalFileName: {
      type: String,
      trim: true,
      default: '',
    },
    mimeType: {
      type: String,
      trim: true,
      required: [true, 'MIME type is required'],
    },
    externalDocUrl: {
      type: String,
      required: [true, 'External document URL is required'],
      trim: true,
    },
    externalDocProvider: {
      type: String,
      enum: ['google_docs', 'other'],
      default: 'google_docs',
    },
    driveFileId: {
      type: String,
      trim: true,
      default: null,
    },
    driveWebViewLink: {
      type: String,
      trim: true,
      default: null,
    },
    driveEditLink: {
      type: String,
      trim: true,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'in_review', 'review_submitted', 'finalized'],
      default: 'pending_review',
    },
    reviewSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewSubmittedAt: {
      type: Date,
      default: null,
    },
    commentsLastSyncedAt: {
      type: Date,
      default: null,
    },
    commentsSyncCursor: {
      type: String,
      default: null,
    },
    permissionSnapshot: {
      students: {
        type: [permissionEntrySchema],
        default: [],
      },
      adviser: {
        type: [permissionEntrySchema],
        default: [],
      },
      panelists: {
        type: [permissionEntrySchema],
        default: [],
      },
      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },
    archivedComments: {
      type: [archivedCommentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

manuscriptSchema.index({ projectId: 1, documentType: 1 }, { unique: true });
manuscriptSchema.index({ uploadedBy: 1, createdAt: -1 });
manuscriptSchema.index({ reviewStatus: 1, updatedAt: -1 });

const metadataFeedbackSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String,
      required: [true, 'Feedback field name is required'],
      enum: ['title', 'abstract', 'authors', 'year', 'doi', 'venue', 'keywords'],
      trim: true,
    },
    extractedValue: {
      type: String,
      default: '',
      trim: true,
      maxlength: [4000, 'Extracted value must not exceed 4000 characters'],
    },
    correctedValue: {
      type: String,
      required: [true, 'Corrected value is required'],
      trim: true,
      maxlength: [4000, 'Corrected value must not exceed 4000 characters'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    sourceFileName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [255, 'Source file name must not exceed 255 characters'],
    },
    sourceHash: {
      type: String,
      default: '',
      trim: true,
      maxlength: [128, 'Source hash must not exceed 128 characters'],
    },
    feedbackNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Feedback notes must not exceed 1000 characters'],
    },
    context: {
      type: String,
      default: 'archive/capstone-upload',
      trim: true,
      maxlength: [120, 'Feedback context must not exceed 120 characters'],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

metadataFeedbackSchema.index({ fieldName: 1, createdAt: -1 });
metadataFeedbackSchema.index({ sourceHash: 1, fieldName: 1, createdAt: -1 });

const Manuscript = mongoose.model('Manuscript', manuscriptSchema);
export const MetadataExtractionFeedback = mongoose.model(
  'MetadataExtractionFeedback',
  metadataFeedbackSchema,
);

export default Manuscript;
