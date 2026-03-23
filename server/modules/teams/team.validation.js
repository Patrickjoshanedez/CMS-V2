import { z } from 'zod';

/**
 * Zod validation schemas for team management endpoints.
 */

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, 'Team name must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  academicYear: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow the format YYYY-YYYY (e.g. 2024-2025)'),
});

export const inviteMemberSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
});

export const inviteCandidatesQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  limit: z.coerce.number().int().positive().max(20).default(8),
});

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow the format YYYY-YYYY')
    .optional(),
  sectionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sectionId').optional(),
  search: z.string().trim().max(100).optional(),
});

const TEAM_MEMBER_ROLES = [
  'Programmer',
  'Documentor',
  'Pitcher',
  'UI/UX',
  'QA/Tester',
  'Researcher',
  'Backend Developer',
  'Frontend Developer',
];

export const assignMemberRoleSchema = z.object({
  role: z
    .union([z.enum(TEAM_MEMBER_ROLES), z.literal('')])
    .optional()
    .default(''),
});

export const updateTeamGoogleDocLinkSchema = z.object({
  googleDocUrl: z
    .string()
    .trim()
    .max(2000, 'Google Docs URL is too long')
    .optional()
    .default(''),
});
