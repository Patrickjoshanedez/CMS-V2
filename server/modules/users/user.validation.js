import { z } from 'zod';
import { ROLE_VALUES } from '@cms/shared';

/**
 * Zod validation schemas for user management endpoints.
 */

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  role: z
    .enum(ROLE_VALUES, {
      required_error: 'Role is required',
      invalid_type_error: 'Role must be one of: ' + ROLE_VALUES.join(', '),
    }),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  isActive: z.boolean().optional(),
  role: z.enum(ROLE_VALUES).optional(),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  profilePicture: z
    .string()
    .url('Profile picture must be a valid URL')
    .nullable()
    .optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(ROLE_VALUES, {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be one of: ' + ROLE_VALUES.join(', '),
  }),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(ROLE_VALUES).optional(),
  search: z.string().trim().max(100).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});
