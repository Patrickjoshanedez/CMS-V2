import { z } from 'zod';
import { ROLE_VALUES, ACADEMIC_TERM_VALUES } from '@cms/shared';

/**
 * Zod validation schemas for user management endpoints.
 */

export const createUserSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  middleName: z
    .string()
    .trim()
    .max(50, 'Middle name must not exceed 50 characters')
    .optional()
    .default(''),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  role: z.enum(ROLE_VALUES, {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be one of: ' + ROLE_VALUES.join(', '),
  }),
});

export const updateUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .optional(),
  middleName: z.string().trim().max(50, 'Middle name must not exceed 50 characters').optional(),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .optional(),
  isActive: z.boolean().optional(),
  role: z.enum(ROLE_VALUES).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .optional(),
  middleName: z.string().trim().max(50, 'Middle name must not exceed 50 characters').optional(),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .optional(),
  profilePicture: z
    .string()
    .trim()
    .max(2048, 'Profile picture URL/key must not exceed 2048 characters')
    .refine((val) => val === '' || /^avatars\/[a-f\d]{24}\/[a-zA-Z0-9._-]+$/.test(val), {
      message: 'Profile picture must be a valid user avatar storage key',
    })
    .nullable()
    .optional(),
  digitalSignature: z
    .string()
    .max(250000, 'Digital signature payload exceeds maximum allowed size')
    .nullable()
    .optional(),
  sectionId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid sectionId format')
    .nullable()
    .optional(),
  instructorId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid instructorId format')
    .nullable()
    .optional(),
  studentId: z.string().trim().max(32, 'Student ID must not exceed 32 characters').optional(),
  academicTerm: z.enum(ACADEMIC_TERM_VALUES).nullable().optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(ROLE_VALUES, {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be one of: ' + ROLE_VALUES.join(', '),
  }),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  role: z
    .union([
      z.enum(ROLE_VALUES),
      z.array(z.enum(ROLE_VALUES)),
      z
        .string()
        .transform((val) =>
          val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
        .pipe(z.array(z.enum(ROLE_VALUES))),
    ])
    .optional(),
  search: z.string().trim().max(100).optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});
