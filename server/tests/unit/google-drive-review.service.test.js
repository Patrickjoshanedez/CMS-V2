import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAuthorize,
  mockCommentsList,
  mockDrive,
  mockJwt,
} = vi.hoisted(() => {
  const mockAuthorize = vi.fn().mockResolvedValue(undefined);
  const mockCommentsList = vi.fn();
  const mockDrive = vi.fn();
  const mockJwt = vi.fn();

  return {
    mockAuthorize,
    mockCommentsList,
    mockDrive,
    mockJwt,
  };
});

vi.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: mockJwt.mockImplementation(function MockJwt() {
        return { authorize: mockAuthorize };
      }),
      OAuth2: vi.fn(function MockOAuth2() {
        return {};
      }),
    },
    drive: mockDrive.mockImplementation(function MockDrive() {
      return {
        comments: {
          list: mockCommentsList,
        },
      };
    }),
  },
}));

vi.mock('../../config/env.js', () => ({
  default: {
    GOOGLE_DRIVE_AUTH_MODE: 'service_account',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service-account@example.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'private-key',
  },
}));

import googleDriveReviewService from '../../services/google-drive-review.service.js';

describe('GoogleDriveReviewService comment reading', () => {
  beforeEach(() => {
    mockAuthorize.mockClear();
    mockCommentsList.mockReset();
    mockCommentsList.mockResolvedValue({
      data: {
        comments: [
          {
            id: 'comment-1',
            content: 'Looks good',
            resolved: false,
          },
        ],
        nextPageToken: 'page-2',
      },
    });
    mockDrive.mockClear();
    mockJwt.mockClear();

    googleDriveReviewService._initialized = false;
    googleDriveReviewService.drive = null;
  });

  it('lists comments from a Google Doc', async () => {
    const result = await googleDriveReviewService.listComments('doc-123');

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].id).toBe('comment-1');
    expect(result.nextPageToken).toBe('page-2');
    expect(mockAuthorize).toHaveBeenCalledTimes(1);
    expect(mockCommentsList).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'doc-123',
        includeDeleted: false,
        pageSize: 100,
      }),
    );
  });

  it('rejects a missing file id', async () => {
    await expect(googleDriveReviewService.listComments(null)).rejects.toThrow(
      'File ID is required',
    );
  });
});