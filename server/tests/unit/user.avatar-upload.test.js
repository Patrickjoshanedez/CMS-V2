import { afterEach, describe, expect, it, vi } from 'vitest';
import userService from '../../modules/users/user.service.js';
import storageService from '../../services/storage.service.js';
import User from '../../modules/users/user.model.js';
import AppError from '../../utils/AppError.js';

describe('UserService.uploadAvatar error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 503 when storage throws a non-operational error', async () => {
    vi.spyOn(storageService, 'uploadFile').mockRejectedValue(new Error('fetch failed'));

    await expect(
      userService.uploadAvatar('507f1f77bcf86cd799439011', Buffer.from('x'), 'image/png'),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'AVATAR_UPLOAD_ERROR',
      isOperational: true,
    });
  });

  it('rethrows operational storage errors unchanged', async () => {
    const storageError = new AppError(
      'Storage service is temporarily unavailable. Please try again later.',
      503,
      'STORAGE_CONNECTION_ERROR',
    );

    vi.spyOn(storageService, 'uploadFile').mockRejectedValue(storageError);

    await expect(
      userService.uploadAvatar('507f1f77bcf86cd799439011', Buffer.from('x'), 'image/png'),
    ).rejects.toBe(storageError);
  });
});

describe('UserService.getAvatar streaming', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 404 when user or profilePicture does not exist', async () => {
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(userService.getAvatar('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
      code: 'AVATAR_NOT_FOUND',
    });
  });

  it('downloads avatar and detects PNG mimeType from buffer signature', async () => {
    const updatedAt = new Date();
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        profilePicture: 'avatars/507f1f77bcf86cd799439011/profile',
        updatedAt,
      }),
    });

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(pngBuffer);

    const result = await userService.getAvatar('507f1f77bcf86cd799439011');
    expect(result.buffer).toBe(pngBuffer);
    expect(result.mimeType).toBe('image/png');
    expect(result.updatedAt).toBe(updatedAt);
  });
});
