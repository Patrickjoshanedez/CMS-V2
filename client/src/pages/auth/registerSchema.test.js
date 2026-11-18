import { describe, expect, it } from 'vitest';
import { registerSchema } from './registerSchema.js';

const registration = (email, overrides = {}) => ({
  firstName: 'Alex',
  middleName: '',
  lastName: 'Student',
  studentId: '2021-12345',
  email,
  password: 'Password123',
  confirmPassword: 'Password123',
  ...overrides,
});

describe('student registration email validation', () => {
  it('accepts BukSU student email addresses', () => {
    expect(registerSchema.safeParse(registration('alex@student.buksu.edu.ph')).success).toBe(true);
  });

  it('requires the selected student account to use the student domain', () => {
    const result = registerSchema.safeParse(registration('alex@buksu.edu.ph'));

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      'Student registration requires a @student.buksu.edu.ph email address.',
    );
  });

  it('allows faculty registration without a student ID and normalizes staff email', () => {
    const result = registerSchema.safeParse(
      registration('Alex@BUKSU.EDU.PH', { role: 'faculty', studentId: undefined }),
    );
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('alex@buksu.edu.ph');
  });

  it('rejects student email for faculty and excludes instructor self-registration', () => {
    expect(
      registerSchema.safeParse(registration('alex@student.buksu.edu.ph', { role: 'faculty' }))
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse(registration('alex@buksu.edu.ph', { role: 'instructor' })).success,
    ).toBe(false);
  });

  it('rejects non-institutional email addresses', () => {
    expect(registerSchema.safeParse(registration('alex@gmail.com')).success).toBe(false);
  });

  it('rejects missing or empty student ID number', () => {
    const emptyResult = registerSchema.safeParse(
      registration('alex@student.buksu.edu.ph', { studentId: '   ' }),
    );
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error.issues[0].message).toBe('Student ID no. is required.');
  });

  it('rejects student ID exceeding 32 characters', () => {
    const longResult = registerSchema.safeParse(
      registration('alex@student.buksu.edu.ph', { studentId: 'A'.repeat(33) }),
    );
    expect(longResult.success).toBe(false);
    expect(longResult.error.issues[0].message).toBe('Student ID must not exceed 32 characters.');
  });
});
