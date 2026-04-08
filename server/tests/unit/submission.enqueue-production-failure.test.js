import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAGIARISM_STATUSES } from '@cms/shared';

describe('SubmissionService._enqueuePlagiarism production failure hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('marks plagiarism result as failed when queue is unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_ACCESS_SECRET', 'ProdAccessSecret_123456789');
    vi.stubEnv('JWT_REFRESH_SECRET', 'ProdRefreshSecret_123456789');
    vi.stubEnv('REDIS_PASSWORD', 'ProdRedisSecret_123456789');
    vi.stubEnv('CLIENT_URL', 'https://cms.example.com');
    vi.stubEnv('S3_ACCESS_KEY_ID', 'AKIAPRODKEY123456789');
    vi.stubEnv('S3_SECRET_ACCESS_KEY', 'ProdS3SecretKey_123456789');
    vi.stubEnv('S3_ENDPOINT', 'https://s3.amazonaws.com');
    vi.resetModules();

    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');

    const updateSpy = vi.spyOn(Submission, 'findByIdAndUpdate').mockResolvedValue(null);

    await submissionService._enqueuePlagiarism(
      { _id: '507f1f77bcf86cd799439011' },
      {
        projectId: '507f191e810c19729de860ea',
        storageKey: 'uploads/project/chapter1.pdf',
        fileType: 'application/pdf',
      },
    );

    expect(updateSpy).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        'plagiarismResult.status': PLAGIARISM_STATUSES.FAILED,
        'plagiarismResult.jobId': null,
      }),
    );

    const lastUpdate = updateSpy.mock.calls[0][1];
    expect(lastUpdate['plagiarismResult.error']).toContain('Plagiarism queue is unavailable');
    expect(lastUpdate['plagiarismResult.processedAt']).toBeInstanceOf(Date);
  });
});
