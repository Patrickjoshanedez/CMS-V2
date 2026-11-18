import { z } from 'zod';
import {
  STRICT_EMAIL_REGEX,
  isBuksuInstitutionalEmail,
  isBuksuStudentEmail,
  passwordSchema,
} from '@cms/shared';

export const registerSchema = z
  .object({
    role: z.enum(['student', 'faculty']).default('student'),
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name must not exceed 50 characters.'),
    middleName: z
      .string()
      .trim()
      .max(50, 'Middle name must not exceed 50 characters.')
      .optional()
      .default(''),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name must not exceed 50 characters.'),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .regex(STRICT_EMAIL_REGEX, 'Please enter a valid email address.')
      .toLowerCase(),
    studentId: z
      .string({ required_error: 'Student ID no. is required.' })
      .trim()
      .max(32, 'Student ID must not exceed 32 characters.')
      .optional()
      .default(''),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .superRefine((data, ctx) => {
    const student = data.role === 'student';
    if (
      student
        ? !isBuksuStudentEmail(data.email)
        : !isBuksuInstitutionalEmail(data.email) || isBuksuStudentEmail(data.email)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: student
          ? 'Student registration requires a @student.buksu.edu.ph email address.'
          : 'Faculty registration requires a @buksu.edu.ph email address.',
      });
    }
    if (student && !data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentId'],
        message: 'Student ID no. is required.',
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
