import { z } from 'zod';
import { studentEmailSchema, passwordSchema } from '@cms/shared';

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name must not exceed 50 characters.'),
    middleName: z
      .string()
      .max(50, 'Middle name must not exceed 50 characters.')
      .optional()
      .default(''),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name must not exceed 50 characters.'),
    email: studentEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
