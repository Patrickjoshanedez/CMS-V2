import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createAcademicYearSchema = z.object({
  year: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'),
});

export const createCourseSchema = z.object({
  name: z
    .string({ required_error: 'Course name is required' })
    .trim()
    .min(2, 'Course name must be at least 2 characters')
    .max(120, 'Course name must not exceed 120 characters'),
  code: z
    .string({ required_error: 'Course code is required' })
    .trim()
    .min(2, 'Course code must be at least 2 characters')
    .max(20, 'Course code must not exceed 20 characters'),
});

export const createSectionSchema = z.object({
  name: z
    .string({ required_error: 'Section name is required' })
    .trim()
    .min(2, 'Section name must be at least 2 characters')
    .max(40, 'Section name must not exceed 40 characters'),
  courseId: z.string().regex(objectIdPattern, 'Invalid course ID'),
  academicYear: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'),
});

export const listSectionsQuerySchema = z.object({
  courseId: z.string().regex(objectIdPattern, 'Invalid course ID').optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Invalid academic year format')
    .optional(),
});

export const hierarchyQuerySchema = z.object({
  courseId: z.string().regex(objectIdPattern, 'Invalid course ID').optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Invalid academic year format')
    .optional(),
  sectionId: z.string().regex(objectIdPattern, 'Invalid section ID').optional(),
});
