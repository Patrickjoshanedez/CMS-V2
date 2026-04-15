/**
 * Project model — represents a capstone project tied to a team.
 * Each team can have at most one active project. The project tracks
 * title submission, adviser/panelist assignment, deadlines, and overall status.
 */
import mongoose from 'mongoose';
import {
  TITLE_STATUS_VALUES,
  TITLE_STATUSES,
  PROJECT_STATUS_VALUES,
  PROJECT_STATUSES,
  PROTOTYPE_TYPE_VALUES,
  CAPSTONE_TITLE_VALUES,
  SDG_TAG_SUGGESTIONS,
} from '@cms/shared';

const titleModificationRequestSchema = new mongoose.Schema(
  {
    proposedTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 300,
    },
    justification: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const deadlineSchema = new mongoose.Schema(
  {
    chapter1: { type: Date, default: null },
    chapter2: { type: Date, default: null },
    chapter3: { type: Date, default: null },
    proposal: { type: Date, default: null },
    chapter4: { type: Date, default: null },
    chapter5: { type: Date, default: null },
    defense: { type: Date, default: null },
    /** Fields marked "To Be Announced" by the instructor. */
    tba: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * Prototype schema — represents a media item or link showcasing the team's
 * system development progress during Capstone 2 & 3.
 */
const prototypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Prototype title is required'],
      trim: true,
      minlength: [3, 'Prototype title must be at least 3 characters'],
      maxlength: [200, 'Prototype title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: '',
    },
    type: {
      type: String,
      required: [true, 'Prototype type is required'],
      enum: {
        values: PROTOTYPE_TYPE_VALUES,
        message: 'Prototype type must be one of: image, video, link',
      },
    },
    storageKey: {
      type: String,
      default: null, // null for link-type prototypes
    },
    url: {
      type: String,
      default: null, // Used for link-type prototypes
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const memberRoleAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    professionalTitle: {
      type: String,
      enum: {
        values: CAPSTONE_TITLE_VALUES,
        message: 'Invalid professional capstone title',
      },
      required: true,
    },
    traditionalRole: {
      type: String,
      required: true,
      trim: true,
    },
    responsibilities: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const titleProposalCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment must not exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const titleProposalCommentThreadSchema = new mongoose.Schema(
  {
    proposalIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    proposalTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Title proposal must not exceed 300 characters'],
    },
    comments: {
      type: [titleProposalCommentSchema],
      default: [],
    },
  },
  { _id: false },
);

const titleProposalMetadataSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Title proposal must be at least 10 characters'],
      maxlength: [300, 'Title proposal must not exceed 300 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, 'Title proposal description must be at least 20 characters'],
      maxlength: [1000, 'Title proposal description must not exceed 1000 characters'],
    },
    capstoneType: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 10,
        message: 'Must provide between 1 and 10 capstone types',
      },
    },
    sdgTags: {
      type: [String],
      enum: {
        values: SDG_TAG_SUGGESTIONS,
        message: 'Invalid SDG tag',
      },
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 17,
        message: 'Each title proposal must include between 1 and 17 SDG tags',
      },
      default: [],
    },
  },
  { _id: true },
);

const projectSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      unique: true, // One project per team
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [10, 'Project title must be at least 10 characters'],
      maxlength: [300, 'Project title must not exceed 300 characters'],
    },
    titleProposals: {
      type: [mongoose.Schema.Types.Mixed],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length >= 3 &&
          arr.length <= 10 &&
          arr.every(
            (proposal) =>
              typeof proposal === 'string' ||
              (proposal && typeof proposal === 'object' && typeof proposal.title === 'string'),
          ),
        message: 'A project must include between 3 and 10 title proposals',
      },
      required: [true, 'Title proposals are required'],
      default: [],
    },
    titleProposalMetadata: {
      type: [titleProposalMetadataSchema],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && (arr.length === 0 || (arr.length >= 3 && arr.length <= 10)),
        message: 'Title proposal metadata must include between 3 and 10 entries',
      },
      default: [],
    },
    titleProposalComments: {
      type: [titleProposalCommentThreadSchema],
      default: [],
    },
    abstract: {
      type: String,
      trim: true,
      maxlength: [500, 'Abstract must not exceed 500 characters'],
      default: '',
    },
    keywords: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A project can have at most 10 keywords',
      },
      default: [],
    },
    archiveMetadata: {
      authors: {
        type: [String],
        validate: {
          validator: (arr) => Array.isArray(arr) && arr.length <= 20,
          message: 'Archive metadata can have at most 20 authors',
        },
        default: [],
      },
      publicationYear: {
        type: Number,
        min: 1900,
        max: 2100,
        default: null,
      },
      doi: {
        type: String,
        trim: true,
        maxlength: [255, 'DOI must not exceed 255 characters'],
        default: '',
      },
      publicationVenue: {
        type: String,
        trim: true,
        maxlength: [255, 'Publication venue must not exceed 255 characters'],
        default: '',
      },
      extractedAt: {
        type: Date,
        default: null,
      },
      similarityAudit: {
        checkedAt: {
          type: Date,
          default: null,
        },
        titleThreshold: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.7,
        },
        abstractThreshold: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.7,
        },
        titleConflicts: {
          type: [
            {
              projectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Project',
              },
              title: {
                type: String,
                trim: true,
                maxlength: [300, 'Conflict title must not exceed 300 characters'],
              },
              academicYear: {
                type: String,
                trim: true,
                default: '',
              },
              publicationYear: {
                type: Number,
                min: 1900,
                max: 2100,
                default: null,
              },
              score: {
                type: Number,
                min: 0,
                max: 1,
                default: 0,
              },
              similarityPct: {
                type: Number,
                min: 0,
                max: 100,
                default: 0,
              },
            },
          ],
          default: [],
        },
        abstractConflicts: {
          type: [
            {
              projectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Project',
              },
              title: {
                type: String,
                trim: true,
                maxlength: [300, 'Conflict title must not exceed 300 characters'],
              },
              academicYear: {
                type: String,
                trim: true,
                default: '',
              },
              publicationYear: {
                type: Number,
                min: 1900,
                max: 2100,
                default: null,
              },
              score: {
                type: Number,
                min: 0,
                max: 1,
                default: 0,
              },
              similarityPct: {
                type: Number,
                min: 0,
                max: 100,
                default: 0,
              },
            },
          ],
          default: [],
        },
      },
    },
    sdgTags: {
      type: [String],
      enum: {
        values: SDG_TAG_SUGGESTIONS,
        message: 'Invalid SDG tag',
      },
      validate: {
        validator: (arr) => arr.length <= 17,
        message: 'A project can have at most 17 SDG tags',
      },
      default: [],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      match: [/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    memberRoleAssignments: {
      type: [memberRoleAssignmentSchema],
      default: [],
    },
    capstonePhase: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    titleStatus: {
      type: String,
      enum: {
        values: TITLE_STATUS_VALUES,
        message: 'Invalid title status',
      },
      default: TITLE_STATUSES.DRAFT,
    },
    projectStatus: {
      type: String,
      enum: {
        values: PROJECT_STATUS_VALUES,
        message: 'Invalid project status',
      },
      default: PROJECT_STATUSES.ACTIVE,
    },
    adviserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    panelistIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      validate: {
        validator: (arr) => arr.length <= 3,
        message: 'A project can have at most 3 panelists',
      },
      default: [],
    },
    deadlines: {
      type: deadlineSchema,
      default: () => ({}),
    },
    titleModificationRequest: {
      type: titleModificationRequestSchema,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rejection reason must not exceed 1000 characters'],
      default: null,
    },
    prototypes: {
      type: [prototypeSchema],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'A project can have at most 20 prototypes',
      },
      default: [],
    },

    // --- Archive & Completion fields ---
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    certificateStorageKey: {
      type: String,
      default: null,
    },
    completionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Completion notes must not exceed 2000 characters'],
      default: null,
    },
    // --- Google Drive Integration ---
    driveFolderId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Indexes ---
// teamId unique index is already created by `unique: true` in the schema field.
projectSchema.index({ titleStatus: 1 });
projectSchema.index({ adviserId: 1 });
projectSchema.index({ panelistIds: 1 });
projectSchema.index({ academicYear: 1, projectStatus: 1 });
projectSchema.index({ courseId: 1, sectionId: 1, academicYear: 1 });
projectSchema.index({ academicYear: 1, titleStatus: 1, projectStatus: 1, createdAt: -1 });
projectSchema.index({ adviserId: 1, projectStatus: 1, createdAt: -1 });
projectSchema.index({ capstonePhase: 1 });
projectSchema.index({ title: 'text', keywords: 'text' });
projectSchema.index({ isArchived: 1, academicYear: 1 });
projectSchema.index({ isArchived: 1, academicYear: 1, archivedAt: -1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
