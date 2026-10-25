import { z } from 'zod';
import { ACADEMIC_TERM_VALUES, inferCapstoneCourseFromSection } from '@cms/shared';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const sectionLabelPattern = /^\d{1,2}[A-Za-z]$/;
const sectionCodePattern = /^T\d{1,5}$/i;

export const createAcademicYearSchema = z.object({
  year: z
    .string({ required_error: 'Academic year is required' })
    .transform((v) => v.replace(/–/g, '-').trim())
    .pipe(z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format')),
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
    // New explicit field for section/year label (e.g., 3A, 4A)
    section: z
      .string()
      .trim()
      .regex(sectionLabelPattern, 'Section must follow format like 3A or 4A')
      .optional(),

    // Backward-compat field used by existing clients and database model
    name: z
      .string()
      .trim()
      .regex(sectionLabelPattern, 'Section must follow format like 3A or 4A')
      .optional(),

    code: z
      .string({ required_error: 'Section code is required' })
      .trim()
      .regex(
        sectionCodePattern,
        'Section code must start with T followed by numbers (e.g., T65, T87)',
      ),
    courseId: z.string().regex(objectIdPattern, 'Invalid course ID'),
    academicYear: z
      .string({ required_error: 'Academic year is required' })
      .transform((v) => v.replace(/–/g, '-').trim())
      .pipe(z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format')),
    academicTerm: z.enum(ACADEMIC_TERM_VALUES).optional(),
    capstoneCourse: z.coerce.number().int().min(1).max(3).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.section && !data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'Section is required (e.g., 3A or 4A)',
      });
    }
  })
  .transform((data) => {
    const normalizedSection = (data.section || data.name || '').toUpperCase();
    const normalizedCode = data.code.trim().toUpperCase();
    const resolvedTerm =
      data.academicTerm || (data.capstoneCourse === 2 ? '2nd Semester' : '1st Semester');
    const resolvedCapstoneCourse =
      data.capstoneCourse ?? inferCapstoneCourseFromSection(normalizedSection, resolvedTerm);
    return {
      ...data,
      section: normalizedSection,
      name: normalizedSection,
      code: normalizedCode,
      academicTerm: resolvedTerm,
      capstoneCourse: resolvedCapstoneCourse,
    };
  });

export const listSectionsQuerySchema = z.object({
  courseId: z.string().regex(objectIdPattern, 'Invalid course ID').optional(),
  academicYear: z
    .string()
    .transform((v) => v.replace(/–/g, '-').trim())
    .pipe(z.string().regex(/^\d{4}-\d{4}$/, 'Invalid academic year format'))
    .optional(),
  academicTerm: z.enum(ACADEMIC_TERM_VALUES).optional(),
  capstoneCourse: z.coerce.number().int().min(1).max(3).optional(),
  fallback: z.coerce.boolean().optional().default(false),
});

export const hierarchyQuerySchema = z.object({
  courseId: z.string().regex(objectIdPattern, 'Invalid course ID').optional(),
  academicYear: z
    .string()
    .transform((v) => v.replace(/–/g, '-').trim())
    .pipe(z.string().regex(/^\d{4}-\d{4}$/, 'Invalid academic year format'))
    .optional(),
  academicTerm: z.enum(ACADEMIC_TERM_VALUES).optional(),
  sectionId: z.string().regex(objectIdPattern, 'Invalid section ID').optional(),
});
