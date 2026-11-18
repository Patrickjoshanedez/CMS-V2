import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshTokenModel, userModel, tokenHelpers } = vi.hoisted(() => ({
  refreshTokenModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    claimForRotation: vi.fn(),
    deleteOne: vi.fn(),
    revokeAllForUser: vi.fn(),
  },
  userModel: { findById: vi.fn() },
  tokenHelpers: {
    generateAccessToken: vi.fn(() => 'new-access-token'),
    generateRefreshTokenString: vi.fn(),
    hashToken: vi.fn((token) => `hash:${token}`),
    getRefreshTokenExpiry: vi.fn(() => new Date(Date.now() + 60_000)),
  },
}));

vi.mock('../../modules/auth/refreshToken.model.js', () => ({ default: refreshTokenModel }));
vi.mock('../../modules/users/user.model.js', () => ({ default: userModel }));
vi.mock('../../utils/generateToken.js', () => tokenHelpers);

import authService from '../../modules/auth/auth.service.js';

describe('refresh token rotation concurrency', () => {
  const parentToken = {
    _id: 'parent-id',
    token: 'hash:parent-token',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };
  const user = { _id: 'user-id', role: 'student', isActive: true, sessionVersion: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    tokenHelpers.generateRefreshTokenString
      .mockReturnValueOnce('child-one')
      .mockReturnValueOnce('child-two');
    refreshTokenModel.findOne.mockResolvedValue(parentToken);
    refreshTokenModel.create.mockImplementation(async (data) => ({
      ...data,
      _id: `child-${data.token}`,
    }));
    refreshTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    userModel.findById.mockResolvedValue(user);
  });

  it('allows only one of two simultaneous requests to rotate the same parent', async () => {
    let parentClaimed = false;
    refreshTokenModel.claimForRotation.mockImplementation(async () => {
      if (parentClaimed) return null;
      parentClaimed = true;
      return { ...parentToken, revokedAt: new Date(), replacedByToken: 'child-hash' };
    });

    const results = await Promise.allSettled([
      authService.refreshToken('parent-token'),
      authService.refreshToken('parent-token'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected.reason.code).toBe('REFRESH_TOKEN_ROTATION_CONFLICT');
    expect(refreshTokenModel.claimForRotation).toHaveBeenCalledTimes(2);
    expect(refreshTokenModel.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('cleans up the unreturned successor if the atomic claim fails', async () => {
    const persistenceError = new Error('parent update unavailable');
    refreshTokenModel.claimForRotation.mockRejectedValue(persistenceError);

    await expect(authService.refreshToken('parent-token')).rejects.toBe(persistenceError);

    expect(refreshTokenModel.deleteOne).toHaveBeenCalledWith({ token: 'hash:child-one' });
  });

  it('preserves replay detection for requests arriving after the parent was rotated', async () => {
    refreshTokenModel.findOne.mockResolvedValue({ ...parentToken, revokedAt: new Date() });

    await expect(authService.refreshToken('parent-token')).rejects.toMatchObject({
      code: 'TOKEN_REUSE_DETECTED',
    });

    expect(refreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(refreshTokenModel.create).not.toHaveBeenCalled();
  });

  it('rejects a refresh session created before the account session version changed', async () => {
    refreshTokenModel.findOne.mockResolvedValue({ ...parentToken, sessionVersion: 0 });
    userModel.findById.mockResolvedValue({ ...user, sessionVersion: 1 });

    await expect(authService.refreshToken('parent-token')).rejects.toMatchObject({
      code: 'SESSION_INVALIDATED',
    });
    expect(refreshTokenModel.create).not.toHaveBeenCalled();
    expect(refreshTokenModel.claimForRotation).not.toHaveBeenCalled();
  });
});
