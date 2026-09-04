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
    .string()
    .regex(/^[0-9]{4}-[0-9]{4}$/, 'Academic year must follow the format YYYY-YYYY')
    .optional(),
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
  sectionId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid sectionId')
    .optional(),
  search: z.string().trim().max(100).optional(),
  teamId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid teamId')
    .optional(),
});

const TEAM_MEMBER_ROLES = [
  'Project Lead & Systems Analyst',
  'Frontend & UI/UX Developer',
  'Backend & Database Developer',
  'Full-Stack Developer',
  'QA & Technical Documentor',
  'Programmer',
  'Documentor',
  'Pitcher',
  'UI/UX',
  'QA/Tester',
  'Researcher',
  'Backend Developer',
  'Frontend Developer',
  'All-Around',
  'All-around',
];

export const assignMemberRoleSchema = z.object({
  role: z
    .union([z.enum(TEAM_MEMBER_ROLES), z.literal('')])
    .optional()
    .default(''),
});

export const transferTeamLeadershipSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid team id'),
  memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid memberId'),
});

export const updateTeamGoogleDocLinkSchema = z.object({
  googleDocUrl: z.string().trim().max(2000, 'Google Docs URL is too long').optional().default(''),
});

export const updateTeamGithubLinkSchema = z.object({
  githubUrl: z.string().trim().max(2000, 'GitHub URL is too long').optional().default(''),
});

export const assignCommitteeSchema = z.object({
  adviserId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid adviserId')
    .optional()
    .nullable(),
  secretaryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid secretaryId')
    .optional()
    .nullable(),
  panelistIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid panelistId'))
    .optional()
    .default([]),
});
