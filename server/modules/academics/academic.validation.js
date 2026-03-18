import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const sectionLabelPattern = /^\d{1,2}[A-Za-z]$/;

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

export const createSectionSchema = z
  .object({
    // New explicit field for section/year label (e.g., 1A)
    section: z
      .string()
      .trim()
      .regex(sectionLabelPattern, 'Section must follow format like 1A')
      .optional(),

    // Backward-compat field used by existing clients and database model
    name: z
      .string()
      .trim()
      .regex(sectionLabelPattern, 'Section must follow format like 1A')
      .optional(),

    code: z
      .string({ required_error: 'Section code is required' })
      .trim()
      .min(2, 'Section code must be at least 2 characters')
      .max(20, 'Section code must not exceed 20 characters'),
    courseId: z.string().regex(objectIdPattern, 'Invalid course ID'),
    academicYear: z
      .string({ required_error: 'Academic year is required' })
      .regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format'),
  })
  .superRefine((data, ctx) => {
    if (!data.section && !data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'Section is required (e.g., 1A)',
      });
    }
  })
  .transform((data) => {
    const normalizedSection = (data.section || data.name || '').toUpperCase();
    return {
      ...data,
      section: normalizedSection,
      name: normalizedSection,
    };
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
