import { z } from 'zod';
import { TITLE_STATUS_VALUES, PROJECT_STATUS_VALUES } from '@cms/shared';

/* ───── Reusable field schemas ───── */

const academicYearPattern = /^\d{4}-\d{4}$/;
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdPattern, 'Invalid ObjectId');

/* ───── Create project ───── */

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must not exceed 300 characters'),
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
  academicYear: z.string().regex(academicYearPattern, 'Academic year must follow YYYY-YYYY format'),
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
