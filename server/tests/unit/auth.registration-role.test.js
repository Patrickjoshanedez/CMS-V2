import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authService from '../../modules/auth/auth.service.js';
import User from '../../modules/users/user.model.js';
import OTP from '../../modules/auth/otp.model.js';

vi.mock('../../modules/notifications/email.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

const payload = {
  firstName: 'Ana',
  lastName: 'Faculty',
  email: 'ana@buksu.edu.ph',
  password: 'Password123',
  role: 'faculty',
};

describe('registration account roles', () => {
  beforeEach(() => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User, 'create').mockImplementation(async (data) => data);
    vi.spyOn(OTP, 'deleteMany').mockResolvedValue({});
    vi.spyOn(OTP, 'create').mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it('creates faculty with the faculty role and discards student ID', async () => {
    const { user } = await authService.register({ ...payload, studentId: 'stale student value' });
    expect(user.role).toBe('faculty');
    expect(user.studentId).toBe('');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'faculty' }));
    expect(OTP.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: payload.email, type: 'verification' }),
    );
  });

  it('keeps legacy student registrations as students', async () => {
    const { user } = await authService.register({
      ...payload,
      email: 'ana@student.buksu.edu.ph',
      role: undefined,
      studentId: ' 2026-12345 ',
    });
    expect(user.role).toBe('student');
    expect(user.studentId).toBe('2026-12345');
  });

  it('rejects instructor or committee-role self-registration before database access', async () => {
    for (const role of ['instructor', 'adviser', 'panelist', 'admin']) {
      await expect(authService.register({ ...payload, role })).rejects.toMatchObject({
        code: 'INVALID_REGISTRATION_ROLE',
      });
    }
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('does not reclassify an existing unverified account', async () => {
    const save = vi.fn();
    User.findOne.mockResolvedValue({ role: 'instructor', isVerified: false, save });
    await expect(authService.register(payload)).rejects.toMatchObject({
      code: 'REGISTRATION_ROLE_MISMATCH',
    });
    expect(save).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });
});
