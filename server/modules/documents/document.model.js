/**
 * Document models — DocTemplate + ProjectDocument.
 *
 * DocTemplate: Instructor-defined templates (stored as Google Doc IDs).
 * ProjectDocument: Generated documents per project (copies of templates).
 */
import mongoose from 'mongoose';
import { DOCUMENT_TYPE_VALUES } from '@cms/shared';

// --------------- DocTemplate ---------------

const docTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Template title is required'],
      trim: true,
      minlength: [3, 'Template title must be at least 3 characters'],
      maxlength: [200, 'Template title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: '',
    },
    googleDocId: {
      type: String,
      required: [true, 'Google Doc ID is required'],
      trim: true,
    },
    googleDocUrl: {
      type: String,
      required: [true, 'Google Doc URL is required'],
      trim: true,
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPE_VALUES,
        message: 'Invalid document type',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

docTemplateSchema.index({ documentType: 1, isActive: 1 });
docTemplateSchema.index({ createdBy: 1 });

export const DocTemplate = mongoose.model('DocTemplate', docTemplateSchema);

// --------------- ProjectDocument ---------------

const projectDocumentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocTemplate',
      default: null, // null if created without a template (blank doc)
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      minlength: [3, 'Document title must be at least 3 characters'],
      maxlength: [300, 'Document title must not exceed 300 characters'],
    },
    googleDocId: {
      type: String,
      required: [true, 'Google Doc ID is required'],
      trim: true,
    },
    googleDocUrl: {
      type: String,
      required: [true, 'Google Doc URL is required'],
      trim: true,
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPE_VALUES,
        message: 'Invalid document type',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// A project can have one document per type (e.g., one Chapter 1 doc, one Proposal doc)
projectDocumentSchema.index({ projectId: 1, documentType: 1 }, { unique: true });
projectDocumentSchema.index({ googleDocId: 1 }, { unique: true });

export const ProjectDocument = mongoose.model('ProjectDocument', projectDocumentSchema);
