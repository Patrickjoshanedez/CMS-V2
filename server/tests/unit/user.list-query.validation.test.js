import { describe, expect, it } from 'vitest';
import { listUsersQuerySchema } from '../../modules/users/user.validation.js';

describe('listUsersQuerySchema', () => {
  it('accepts limit up to 500 and defaults to 20', () => {
    const parsedDefault = listUsersQuerySchema.safeParse({});
    expect(parsedDefault.success).toBe(true);
    expect(parsedDefault.data.limit).toBe(20);

    const parsed200 = listUsersQuerySchema.safeParse({ limit: '200' });
    expect(parsed200.success).toBe(true);
    expect(parsed200.data.limit).toBe(200);

    const parsed500 = listUsersQuerySchema.safeParse({ limit: '500' });
    expect(parsed500.success).toBe(true);
    expect(parsed500.data.limit).toBe(500);

    const parsed501 = listUsersQuerySchema.safeParse({ limit: '501' });
    expect(parsed501.success).toBe(false);
  });

  it('supports single role enum', () => {
    const parsed = listUsersQuerySchema.safeParse({ role: 'adviser' });
    expect(parsed.success).toBe(true);
    expect(parsed.data.role).toBe('adviser');
  });

  it('supports comma-separated roles parsed into an array', () => {
    const parsed = listUsersQuerySchema.safeParse({
      role: 'instructor,adviser,panelist,faculty',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data.role).toEqual(['instructor', 'adviser', 'panelist', 'faculty']);
  });

  it('supports array of roles directly', () => {
    const parsed = listUsersQuerySchema.safeParse({
      role: ['adviser', 'panelist'],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data.role).toEqual(['adviser', 'panelist']);
  });

  it('rejects invalid roles in comma-separated string', () => {
    const parsed = listUsersQuerySchema.safeParse({
      role: 'instructor,superhero',
    });
    expect(parsed.success).toBe(false);
  });

  it('robustly parses string or boolean isActive values', () => {
    expect(listUsersQuerySchema.safeParse({ isActive: 'true' }).data.isActive).toBe(true);
    expect(listUsersQuerySchema.safeParse({ isActive: true }).data.isActive).toBe(true);
    expect(listUsersQuerySchema.safeParse({ isActive: 'false' }).data.isActive).toBe(false);
    expect(listUsersQuerySchema.safeParse({ isActive: false }).data.isActive).toBe(false);
    expect(listUsersQuerySchema.safeParse({}).data.isActive).toBeUndefined();
  });
});
