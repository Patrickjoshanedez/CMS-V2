import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerSchema } from '../../modules/auth/auth.validation.js';

const originalNodeEnv = process.env.NODE_ENV;

const registration = (email) => ({
  firstName: 'Alex',
  middleName: '',
  lastName: 'Student',
  email,
  password: 'Password123',
});

describe('student registration domain enforcement', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('accepts student-domain addresses case-insensitively and normalizes them', () => {
    const result = registerSchema.safeParse(registration('Alex@STUDENT.BUKSU.EDU.PH'));

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('alex@student.buksu.edu.ph');
  });

  it('rejects the general BukSU domain for student registration', () => {
    expect(registerSchema.safeParse(registration('alex@buksu.edu.ph')).success).toBe(false);
  });

  it('rejects non-institutional domains', () => {
    expect(registerSchema.safeParse(registration('alex@gmail.com')).success).toBe(false);
  });

  it('accepts and trims studentId when provided', () => {
    const result = registerSchema.safeParse({
      ...registration('alex@student.buksu.edu.ph'),
      studentId: '  2021-12345  ',
    });
    expect(result.success).toBe(true);
    expect(result.data.studentId).toBe('2021-12345');
  });

  it('defaults studentId to empty string when omitted', () => {
    const result = registerSchema.safeParse(registration('alex@student.buksu.edu.ph'));
    expect(result.success).toBe(true);
    expect(result.data.studentId).toBe('');
  });

  it('rejects studentId longer than 32 characters', () => {
    const result = registerSchema.safeParse({
      ...registration('alex@student.buksu.edu.ph'),
      studentId: 'A'.repeat(33),
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Student ID must not exceed 32 characters');
  });
});
