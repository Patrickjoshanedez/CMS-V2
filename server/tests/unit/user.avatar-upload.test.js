import { afterEach, describe, expect, it, vi } from 'vitest';
import userService from '../../modules/users/user.service.js';
import storageService from '../../services/storage.service.js';
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
