import { z } from 'zod';
import {
  TITLE_STATUS_VALUES,
  PROJECT_STATUS_VALUES,
  CAPSTONE_TITLE_VALUES,
  SDG_TAG_SUGGESTIONS,
} from '@cms/shared';

/* ───── Reusable field schemas ───── */

const academicYearPattern = /^\d{4}-\d{4}$/;
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdPattern, 'Invalid ObjectId');
const titleProposalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Each proposed title must be at least 10 characters')
    .max(300, 'Each proposed title must not exceed 300 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Each proposal description must be at least 20 characters')
    .max(1000, 'Each proposal description must not exceed 1000 characters'),
  capstoneType: z
    .array(
      z
        .string()
        .trim()
        .min(2, 'Each capstone type must be at least 2 characters')
        .max(120, 'Each capstone type must not exceed 120 characters'),
    )
    .min(1, 'Each proposal must include at least one capstone type')
    .max(10, 'Each proposal can have at most 10 capstone types'),
  sdgTags: z
    .array(z.enum(SDG_TAG_SUGGESTIONS))
    .min(1, 'Each proposal must include at least one SDG tag')
    .max(17, 'Each proposal can have at most 17 SDG tags'),
});

/* ───── Create project ───── */

export const checkTitleSimilaritySchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must not exceed 300 characters'),
  keywords: z
    .array(z.string().trim().min(1))
    .max(10, 'A project can have at most 10 keywords')
    .optional()
    .default([]),
  excludeProjectId: z.string().regex(objectIdPattern, 'Invalid ObjectId').optional(),
});

const createProjectDraftPayloadSchema = z
  .object({
    form: z
      .object({
        title: z.string().max(300).optional(),
        abstract: z.string().max(5000).optional(),
        keywords: z.string().max(500).optional(),
        academicYear: z.string().max(20).optional(),
        sectionId: z.string().max(64).optional(),
      })
      .partial()
      .optional(),
    titleProposals: z
      .array(
        z
          .object({
            title: z.string().max(300).optional(),
            description: z.string().max(5000).optional(),
            capstoneType: z.array(z.string().max(120)).max(10).optional(),
            sdgTags: z.array(z.enum(SDG_TAG_SUGGESTIONS)).max(17).optional(),
          })
          .passthrough(),
      )
      .max(10)
      .optional(),
    keywordList: z.array(z.string().trim().max(120)).max(10).optional(),
    sdgTagList: z.array(z.enum(SDG_TAG_SUGGESTIONS)).max(17).optional(),
    expandedProposalIndex: z.number().int().min(-1).max(20).optional(),
    source: z.string().max(50).optional(),
    proposalIndex: z.number().int().min(0).max(20).nullable().optional(),
    savedAt: z.string().max(100).optional(),
  })
  .passthrough();

export const saveCreateProjectDraftSchema = z.object({
  draft: createProjectDraftPayloadSchema.nullable(),
});

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must not exceed 300 characters'),
  titleProposals: z
    .array(titleProposalSchema)
    .min(3, 'At least 3 title proposals are required')
    .max(10, 'At most 10 title proposals are allowed'),
  abstract: z
    .string()
    .trim()
    .max(500, 'Abstract must not exceed 500 characters')
    .optional()
    .default(''),
  keywords: z
    .array(z.string().trim().min(1))
    .max(10, 'A project can have at most 10 keywords')
    .optional()
    .default([]),
  sdgTags: z
    .array(z.enum(SDG_TAG_SUGGESTIONS))
    .min(1, 'At least one SDG tag is required')
    .max(17, 'A project can have at most 17 SDG tags'),
  academicYear: z.string().regex(academicYearPattern, 'Academic year must follow YYYY-YYYY format'),
  sectionId: objectId.optional(),
  memberRoleAssignments: z
    .array(
      z.object({
        userId: objectId,
        professionalTitle: z.enum(CAPSTONE_TITLE_VALUES),
      }),
    )
    .min(1, 'At least one member role assignment is required'),
  allowSoloCapstone: z.boolean().optional().default(false),
  soloCapstoneConfirmed: z.boolean().optional().default(false),
});

/* ───── Update title (draft stage only) ───── */

export const updateTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must not exceed 300 characters'),
  abstract: z.string().trim().max(500, 'Abstract must not exceed 500 characters').optional(),
  keywords: z
    .array(z.string().trim().min(1))
    .max(10, 'A project can have at most 10 keywords')
    .optional(),
});

/* ───── Submit title for approval ───── */

export const submitTitleSchema = z.object({}).strict();

/* ───── Approve title (instructor action) ───── */

export const approveTitleSchema = z.object({}).strict();

/* ───── Reject title (instructor action) ───── */

export const rejectTitleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(1000, 'Rejection reason must not exceed 1000 characters'),
});

/* ───── Add comment to a title proposal ───── */

export const addTitleCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Comment must not be empty')
    .max(1000, 'Comment must not exceed 1000 characters'),
});

/* ───── Request title modification (student action) ───── */

export const requestTitleModificationSchema = z.object({
  proposedTitle: z
    .string()
    .trim()
    .min(10, 'Proposed title must be at least 10 characters')
    .max(300, 'Proposed title must not exceed 300 characters'),
  justification: z
    .string()
    .trim()
    .min(20, 'Justification must be at least 20 characters')
    .max(1000, 'Justification must not exceed 1000 characters'),
});

/* ───── Resolve title modification (instructor action) ───── */

export const resolveTitleModificationSchema = z.object({
  action: z.enum(['approved', 'denied']),
  reviewNote: z
    .string()
    .trim()
    .max(500, 'Review note must not exceed 500 characters')
    .optional()
    .default(''),
});

/* ───── Assign adviser (instructor action) ───── */

export const assignAdviserSchema = z.object({
  adviserId: objectId,
});

/* ───── Assign panelist (instructor action) ───── */

export const assignPanelistSchema = z.object({
  panelistId: objectId,
});

/* ───── Remove panelist (instructor action) ───── */

export const removePanelistSchema = z.object({
  panelistId: objectId,
});

/* ───── Set deadlines (instructor/adviser action) ───── */

export const setDeadlinesSchema = z.object({
  chapter1: z.coerce.date().optional(),
  chapter2: z.coerce.date().optional(),
  chapter3: z.coerce.date().optional(),
  proposal: z.coerce.date().optional(),
  chapter4: z.coerce.date().optional(),
  chapter5: z.coerce.date().optional(),
  defense: z.coerce.date().optional(),
  applyToSection: z.boolean().optional(),
  tba: z
    .array(
      z.enum(['chapter1', 'chapter2', 'chapter3', 'proposal', 'chapter4', 'chapter5', 'defense']),
    )
    .optional(),
});

/* ───── Reject project entirely ───── */

export const rejectProjectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(1000, 'Rejection reason must not exceed 1000 characters'),
});

/* ───── List projects query ───── */

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  academicYear: z.string().regex(academicYearPattern, 'Invalid academic year format').optional(),
  titleStatus: z.enum(TITLE_STATUS_VALUES).optional(),
  projectStatus: z.enum(PROJECT_STATUS_VALUES).optional(),
  search: z.string().trim().max(200).optional(),
  adviserId: z.string().regex(objectIdPattern).optional(),
});

/* ───── Advance capstone phase (instructor action) ───── */

export const advancePhaseSchema = z.object({}).strict();

/* ───── Add prototype link (student action — link type only) ───── */

export const addPrototypeLinkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Prototype title must be at least 3 characters')
    .max(200, 'Prototype title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
  url: z
    .string()
    .trim()
    .url('A valid URL is required for link-type prototypes')
    .max(2000, 'URL must not exceed 2000 characters'),
});

/* ───── Add prototype media (student — file upload; title & description come as form fields) ───── */

export const addPrototypeMediaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Prototype title must be at least 3 characters')
    .max(200, 'Prototype title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
});

/* ───── Remove prototype (student action — ID in URL params) ───── */

export const removePrototypeSchema = z.object({
  prototypeId: objectId,
});

/* ───── Archive project ───── */

export const archiveProjectSchema = z.object({
  completionNotes: z
    .string()
    .trim()
    .max(2000, 'Completion notes must not exceed 2000 characters')
    .optional(),
});

/* ───── Search archive ───── */

export const searchArchiveQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().trim().max(200).optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format')
    .optional(),
  courseId: objectId.optional(),
  keyword: z.string().trim().max(100).optional(),
});

/* ───── Generate report query ───── */

export const reportQuerySchema = z.object({
  academicYear: z.string().regex(academicYearPattern, 'Academic year must follow YYYY-YYYY format').optional(),
  year: z.string().regex(academicYearPattern, 'Academic year must follow YYYY-YYYY format').optional(),
  adviserId: objectId.optional(),
  title: z.string().trim().max(300, 'Title must not exceed 300 characters').optional(),
  author: z.string().trim().max(200, 'Author must not exceed 200 characters').optional(),
  courseId: objectId.optional(),
  keyword: z.string().trim().max(100, 'Keyword must not exceed 100 characters').optional(),
  sortBy: z.enum(['title', 'academicYear', 'archivedAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/** Bulk-upload archived capstone bundle metadata (Instructor only). */
export const bulkUploadSchema = z.object({
  title: z.string().trim().max(300).optional().default(''),
  abstract: z.string().trim().max(500).optional().default(''),
  keywords: z.preprocess(
    (val) =>
      typeof val === 'string'
        ? val
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : val,
    z.array(z.string().trim().min(1)).max(10).optional().default([]),
  ),
  authors: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return val;
    },
    z.array(z.string().trim().min(1).max(200)).max(20).optional().default([]),
  ),
  publicationYear: z
    .preprocess(
      (val) => {
        if (val === '' || val == null) return undefined;
        const parsed = Number(val);
        return Number.isFinite(parsed) ? parsed : val;
      },
      z.number().int().min(1900).max(2100).optional(),
    ),
  doi: z.string().trim().max(255).optional().default(''),
  publicationVenue: z.string().trim().max(255).optional().default(''),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'),
});
