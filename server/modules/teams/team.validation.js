import { z } from 'zod';

/**
 * Zod validation schemas for team management endpoints.
 */

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .trim()
    .min(3, 'Team name must be at least 3 characters')
    .max(100, 'Team name must not exceed 100 characters'),
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

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow the format YYYY-YYYY')
    .optional(),
  search: z.string().trim().max(100).optional(),
  isLocked: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});
