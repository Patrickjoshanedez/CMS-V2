import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authService from '../../modules/auth/auth.service.js';
import { resetPasswordSchema } from '../../modules/auth/auth.validation.js';
import User from '../../modules/users/user.model.js';
import OTP from '../../modules/auth/otp.model.js';
import RefreshToken from '../../modules/auth/refreshToken.model.js';

const resetRequest = {
  email: 'owner@example.com',
  code: '123456',
  newPassword: 'NewPassword123',
};

describe('password reset OTP proof', () => {
  let otpRecord;
  let user;

  beforeEach(() => {
    otpRecord = {
      _id: 'otp-1',
      email: resetRequest.email,
      type: 'password_reset',
      isVerified: true,
      expiresAt: new Date(Date.now() + 60_000),
      compareCode: vi.fn(async (candidate) => candidate === resetRequest.code),
    };
    user = {
      _id: 'user-1',
      comparePassword: vi.fn().mockResolvedValue(false),
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(OTP, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(otpRecord),
    });
    vi.spyOn(OTP, 'findOneAndDelete').mockResolvedValue(otpRecord);
    vi.spyOn(OTP, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });
    vi.spyOn(RefreshToken, 'revokeAllForUser').mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('requires the caller to include the OTP in the reset request', () => {
    const { code: _code, ...withoutCode } = resetRequest;
    expect(resetPasswordSchema.safeParse(withoutCode).success).toBe(false);
    expect(resetPasswordSchema.safeParse(resetRequest).success).toBe(true);
  });

  it('rejects a reset with no caller-held code before loading the account', async () => {
    await expect(
      authService.resetPassword({ ...resetRequest, code: undefined }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' });

    expect(otpRecord.compareCode).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
    expect(OTP.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('rejects an incorrect code without consuming the OTP or changing the password', async () => {
    await expect(
      authService.resetPassword({ ...resetRequest, code: '000000' }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' });

    expect(OTP.findOneAndDelete).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  it('consumes a valid OTP before saving the password and revokes refresh sessions', async () => {
    await authService.resetPassword(resetRequest);

    expect(OTP.findOneAndDelete).toHaveBeenCalledWith({
      _id: otpRecord._id,
      email: resetRequest.email,
      type: 'password_reset',
      isVerified: true,
      expiresAt: { $gt: expect.any(Date) },
    });
    expect(OTP.findOneAndDelete.mock.invocationCallOrder[0]).toBeLessThan(
      user.save.mock.invocationCallOrder[0],
    );
    expect(user.password).toBe(resetRequest.newPassword);
    expect(user.save).toHaveBeenCalledOnce();
    expect(RefreshToken.revokeAllForUser).toHaveBeenCalledWith(user._id);
  });

  it('allows only one concurrent request to consume the same OTP', async () => {
    OTP.findOneAndDelete.mockResolvedValueOnce(otpRecord).mockResolvedValueOnce(null);

    const results = await Promise.allSettled([
      authService.resetPassword(resetRequest),
      authService.resetPassword(resetRequest),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(user.save).toHaveBeenCalledOnce();
    expect(RefreshToken.revokeAllForUser).toHaveBeenCalledOnce();
  });
});
