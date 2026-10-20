import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ deleteFile: vi.fn() }));
vi.mock('../../services/storage.index.js', () => ({ default: storage }));
vi.mock('../../modules/submissions/submission.model.js', () => ({ default: {} }));
vi.mock('../../modules/submissions/submissionRound.model.js', () => ({ default: {} }));
vi.mock('../../modules/submissions/chapterVersion.service.js', () => ({
  reserveChapterVersion: vi.fn(),
}));
vi.mock('../../modules/projects/project.model.js', () => ({ default: {} }));
vi.mock('../../modules/teams/team.model.js', () => ({ default: {} }));
vi.mock('../../modules/users/user.model.js', () => ({ default: {} }));
vi.mock('../../modules/notifications/notification.model.js', () => ({ default: {} }));
vi.mock('../../modules/plagiarism/plagiarism.model.js', () => ({ default: {} }));
vi.mock('../../modules/academics/section.model.js', () => ({ default: {} }));
vi.mock('../../services/google-drive-review.service.js', () => ({ default: {} }));
vi.mock('../../modules/audit/audit.service.js', () => ({ default: {} }));
vi.mock('../../services/agentRuntimeConfig.service.js', () => ({ default: {} }));
vi.mock('../../modules/settings/settings.service.js', () => ({ default: {} }));
vi.mock('../../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../../jobs/queue.js', () => ({
  enqueuePlagiarismJob: vi.fn(),
  enqueueEmailJob: vi.fn(),
  enqueueDocxConversionJob: vi.fn(),
}));
vi.mock('../../services/documentConversion.service.js', () => ({ default: {} }));
vi.mock('../../jobs/plagiarism.job.js', () => ({ runPlagiarismCheckSync: vi.fn() }));
vi.mock('../../services/socket.service.js', () => ({ emitToUser: vi.fn() }));
vi.mock('../../utils/pdfMetadataExtractor.js', () => ({ extractPdfMetadata: vi.fn() }));
vi.mock('../../utils/docxComments.js', () => ({ extractDocxComments: vi.fn() }));
vi.mock('../../utils/pdfComments.js', () => ({ extractPdfComments: vi.fn() }));
vi.mock('../../utils/extractText.js', () => ({ extractText: vi.fn() }));

import submissionService from '../../modules/submissions/submission.service.js';

// Exercise the public cleanup boundary with injected pipeline failures. These
// tests perform no MongoDB operations, storage writes, or background queue work.
describe('SubmissionService.uploadChapter uncommitted file cleanup', () => {
  beforeEach(() => storage.deleteFile.mockReset().mockResolvedValue(undefined));
  afterEach(() => vi.restoreAllMocks());

  it('cleans a streamed manuscript when authorization or validation fails early', async () => {
    const failure = new Error('student cannot upload this chapter');
    vi.spyOn(submissionService, '_uploadChapterWithReservedVersion').mockRejectedValue(failure);

    await expect(
      submissionService.uploadChapter(
        'student',
        'project',
        { chapter: 1 },
        { storageKey: 'streamed/manuscript.docx' },
      ),
    ).rejects.toBe(failure);

    expect(storage.deleteFile).toHaveBeenCalledTimes(1);
    expect(storage.deleteFile).toHaveBeenCalledWith('streamed/manuscript.docx');
  });

  it('cleans manuscript and justification objects on a failure before record commit', async () => {
    const failure = new Error('submission persistence failed');
    vi.spyOn(submissionService, '_uploadChapterWithReservedVersion').mockImplementation(
      async (_user, _project, _data, _file, _letter, pending) => {
        pending.add('chapter/manuscript.docx');
        pending.add('chapter/late-letter.pdf');
        throw failure;
      },
    );

    await expect(
      submissionService.uploadChapter(
        'student',
        'project',
        { chapter: 1 },
        { buffer: Buffer.from('document') },
        { buffer: Buffer.from('letter') },
      ),
    ).rejects.toBe(failure);

    expect(storage.deleteFile.mock.calls.map(([key]) => key).sort()).toEqual([
      'chapter/late-letter.pdf',
      'chapter/manuscript.docx',
    ]);
  });

  it('logs cleanup failures, attempts every key, and preserves the original upload error', async () => {
    const failure = new Error('record validation failed');
    const cleanupFailure = new Error('storage unavailable');
    storage.deleteFile.mockRejectedValueOnce(cleanupFailure).mockResolvedValueOnce(undefined);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(submissionService, '_uploadChapterWithReservedVersion').mockImplementation(
      async (_user, _project, _data, _file, _letter, pending) => {
        pending.add('chapter/late-letter.pdf');
        throw failure;
      },
    );

    await expect(
      submissionService.uploadChapter(
        'student',
        'project',
        { chapter: 1 },
        { key: 'streamed/manuscript.docx' },
      ),
    ).rejects.toBe(failure);

    expect(storage.deleteFile).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledWith(
      '[SubmissionService] Uncommitted chapter file cleanup failed:',
      'streamed/manuscript.docx',
      cleanupFailure,
    );
  });

  it('preserves committed manuscript objects when a downstream operation fails', async () => {
    const failure = new Error('downstream queue failed after record commit');
    vi.spyOn(submissionService, '_uploadChapterWithReservedVersion').mockImplementation(
      async (_user, _project, _data, _file, _letter, pending) => {
        pending.add('chapter/late-letter.pdf');
        pending.clear();
        throw failure;
      },
    );

    await expect(
      submissionService.uploadChapter(
        'student',
        'project',
        { chapter: 1 },
        { storageKey: 'committed/manuscript.docx' },
      ),
    ).rejects.toBe(failure);

    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it('returns successful uploads without deleting stored files', async () => {
    const response = { submission: { _id: 'accepted-submission' } };
    vi.spyOn(submissionService, '_uploadChapterWithReservedVersion').mockResolvedValue(response);

    await expect(
      submissionService.uploadChapter(
        'student',
        'project',
        { chapter: 1 },
        { storageKey: 'accepted/manuscript.docx' },
      ),
    ).resolves.toBe(response);

    expect(storage.deleteFile).not.toHaveBeenCalled();
  });
});
