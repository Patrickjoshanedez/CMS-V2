import { describe, expect, it, vi, afterEach } from 'vitest';
import userService from '../../modules/users/user.service.js';
import User from '../../modules/users/user.model.js';

describe('UserService.listUsers role expansion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands role "faculty" into { $in: ["faculty", "adviser", "panelist"] }', async () => {
    let capturedFilter = null;
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: 'u1', role: 'adviser' }]),
    };

    vi.spyOn(User, 'find').mockImplementation((filter) => {
      capturedFilter = filter;
      return chainable;
    });
    vi.spyOn(User, 'countDocuments').mockResolvedValue(1);

    const result = await userService.listUsers({ role: 'faculty' });

    expect(capturedFilter.role).toEqual({ $in: ['faculty', 'adviser', 'panelist'] });
    expect(result.users).toHaveLength(1);
  });

  it('keeps single non-faculty role as a direct string filter', async () => {
    let capturedFilter = null;
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };

    vi.spyOn(User, 'find').mockImplementation((filter) => {
      capturedFilter = filter;
      return chainable;
    });
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);

    await userService.listUsers({ role: 'student' });
    expect(capturedFilter.role).toBe('student');
  });

  it('expands role list when faculty is part of comma-separated string', async () => {
    let capturedFilter = null;
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };

    vi.spyOn(User, 'find').mockImplementation((filter) => {
      capturedFilter = filter;
      return chainable;
    });
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);

    await userService.listUsers({ role: 'student,faculty' });
    expect(capturedFilter.role.$in).toContain('student');
    expect(capturedFilter.role.$in).toContain('faculty');
    expect(capturedFilter.role.$in).toContain('adviser');
    expect(capturedFilter.role.$in).toContain('panelist');
  });
});
