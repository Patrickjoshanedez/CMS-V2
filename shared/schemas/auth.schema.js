/**
 * Auth schemas — Shared Zod validation schemas for authentication and registration.
 *
 * Defines cross-domain contracts for credentials, student emails, and user registration.
 *
 * @module shared/schemas/auth.schema
 */
import { z } from 'zod';
import { STRICT_EMAIL_REGEX, isBuksuStudentEmail } from '../constants/validation.js';

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must include uppercase, lowercase, and a number.',
  );

export const studentEmailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Please enter a valid email address.')
  .regex(STRICT_EMAIL_REGEX, 'Please enter a valid email address.')
  .refine(
    (email) => isBuksuStudentEmail(email),
    'Student registration requires a @student.buksu.edu.ph email address.',
  );
