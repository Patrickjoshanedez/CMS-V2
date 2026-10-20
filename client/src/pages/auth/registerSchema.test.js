import { describe, expect, it } from 'vitest';
import { registerSchema } from './registerSchema.js';

const registration = (email) => ({
  firstName: 'Alex',
  middleName: '',
  lastName: 'Student',
  email,
  password: 'Password123',
  confirmPassword: 'Password123',
});

describe('student registration email validation', () => {
  it('accepts BukSU student email addresses', () => {
    expect(registerSchema.safeParse(registration('alex@student.buksu.edu.ph')).success).toBe(true);
  });

  it('rejects the general BukSU domain because registration is student-only', () => {
    const result = registerSchema.safeParse(registration('alex@buksu.edu.ph'));

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      'Student registration requires a @student.buksu.edu.ph email address.',
    );
  });

  it('rejects non-institutional email addresses', () => {
    expect(registerSchema.safeParse(registration('alex@gmail.com')).success).toBe(false);
  });
});
