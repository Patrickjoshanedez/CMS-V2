import { describe, expect, it, vi, afterEach } from 'vitest';
import userService from '../../modules/users/user.service.js';
import User from '../../modules/users/user.model.js';
import RefreshToken from '../../modules/auth/refreshToken.model.js';

describe('UserService.getMe team roster projection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns accurate team virtuals without exposing member IDs', async () => {
    const userDoc = {
      toObject: () => ({
        _id: 'user-1',
        teamId: {
          _id: 'team-1',
          name: 'Test Team',
          isLocked: false,
          members: ['user-1', 'user-2'],
          memberCount: 2,
          isFull: false,
        },
      }),
    };
    const query = {
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      then: (resolve, reject) => Promise.resolve(userDoc).then(resolve, reject),
    };
    vi.spyOn(User, 'findById').mockReturnValue(query);

    const { user } = await userService.getMe('user-1');

    expect(query.populate).toHaveBeenCalledWith(
      'teamId',
      'name isLocked members memberRoles capstoneEnrollments projectId',
    );
    expect(user.teamId.memberCount).toBe(2);
    expect(user.teamId.isFull).toBe(false);
    expect(user.teamId.members).toBeUndefined();
  });
});

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

describe('UserService access-session invalidation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('increments sessionVersion and revokes refresh tokens when the primary role changes', async () => {
    const currentUser = { role: 'student', facultyRole: null, isActive: true, isVerified: true };
    const updatedUser = { _id: 'user-1', role: 'faculty', sessionVersion: 1 };
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(currentUser),
    });
    const update = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedUser);
    const revoke = vi.spyOn(RefreshToken, 'revokeAllForUser').mockResolvedValue(undefined);

    await userService.updateUser('user-1', { role: 'faculty' });

    expect(update).toHaveBeenCalledWith(
      'user-1',
      { role: 'faculty', $inc: { sessionVersion: 1 } },
      { returnDocument: 'after', runValidators: true },
    );
    expect(revoke).toHaveBeenCalledWith('user-1');
  });
});
