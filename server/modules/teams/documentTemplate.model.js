import mongoose, { Schema } from 'mongoose';

const documentTemplateSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ['MANUSCRIPT_CHAPTERS_1_5', 'ACTION_DONE_MATRIX', 'PROPOSAL_SLIDES'],
      default: 'MANUSCRIPT_CHAPTERS_1_5',
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
    },
    versionLabel: {
      type: String,
      default: 'AY 2025–2026 v2.1',
    },
    distributionType: {
      type: String,
      enum: ['GOOGLE_DOCS', 'FILE_ATTACHMENT'],
      default: 'GOOGLE_DOCS',
    },
    resourcePayload: {
      googleDocsUrl: { type: String, default: null },
      fileAttachmentUrl: { type: String, default: null },
      fileName: { type: String, default: null },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

documentTemplateSchema.index({ targetType: 1, academicYear: 1, isActive: 1 });

const DocumentTemplate =
  mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', documentTemplateSchema);

export default DocumentTemplate;
