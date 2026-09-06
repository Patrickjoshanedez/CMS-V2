import { describe, expect, it } from 'vitest';
import { createProjectSchema } from '../../modules/projects/project.validation.js';

describe('createProjectSchema - sectionId robustness', () => {
  const baseValidPayload = {
    title: 'Valid Project Title For Capstone Defense',
    titleProposals: [
      {
        title: 'Valid Project Title For Capstone Defense',
        description:
          'Comprehensive system description that fulfills the minimum twenty characters requirement.',
        capstoneType: ['Software Engineering & Web Applications'],
        sdgTags: ['SDG 4: Quality Education'],
      },
    ],
    academicYear: '2024-2025',
    sdgTags: ['SDG 4: Quality Education'],
  };

  it('accepts a valid 24-character hexadecimal ObjectId string', () => {
    const validId = '507f1f77bcf86cd799439011';
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
      sectionId: validId,
    });
    expect(result.success).toBe(true);
    expect(result.data.sectionId).toBe(validId);
  });

  it('coerces empty string sectionId to undefined without throwing Invalid ObjectId', () => {
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
      sectionId: '',
    });
    expect(result.success).toBe(true);
    expect(result.data.sectionId).toBeUndefined();
  });

  it('coerces whitespace-only sectionId to undefined', () => {
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
      sectionId: '   ',
    });
    expect(result.success).toBe(true);
    expect(result.data.sectionId).toBeUndefined();
  });

  it('coerces null sectionId to undefined', () => {
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
      sectionId: null,
    });
    expect(result.success).toBe(true);
    expect(result.data.sectionId).toBeUndefined();
  });

  it('allows sectionId to be omitted completely (undefined)', () => {
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
    });
    expect(result.success).toBe(true);
    expect(result.data.sectionId).toBeUndefined();
  });

  it('rejects an invalid non-empty string that does not match 24-character ObjectId pattern', () => {
    const result = createProjectSchema.safeParse({
      ...baseValidPayload,
      sectionId: 'not-a-valid-object-id',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid ObjectId');
  });
});
