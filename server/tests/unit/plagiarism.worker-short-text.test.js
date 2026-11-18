import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/fingerprintIndex.service.js', () => ({
  findFingerprintCandidates: vi.fn(),
  getFingerprintLookup: vi.fn(),
  upsertSubmissionFingerprints: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/storage.index.js', () => ({
  default: { downloadFile: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')) },
}));
vi.mock('../../utils/extractText.js', () => ({ extractText: vi.fn() }));

import { processJob } from '../../jobs/plagiarism.job.js';
import Submission from '../../modules/submissions/submission.model.js';
import PlagiarismResult from '../../modules/plagiarism/plagiarism.model.js';
import { extractText } from '../../utils/extractText.js';

describe('plagiarism worker rejects insufficient extracted text', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(extractText).mockResolvedValue('');
    vi.spyOn(Submission, 'findById').mockImplementation(() => ({
      select: () => ({ lean: async () => ({ submittedBy: 'student-id' }) }),
    }));
    vi.spyOn(Submission, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(PlagiarismResult, 'findOneAndUpdate').mockResolvedValue({});
  });

  it.each([
    ['empty document', ''],
    ['whitespace-only document', '   \n\t '],
    ['49-character document', 'a'.repeat(49)],
    ['image-only extraction', ''],
  ])('stores failed, scoreless results for %s', async (_label, extractedText) => {
    vi.mocked(extractText).mockResolvedValue(extractedText);

    const result = await processJob({
      id: `short-${_label}`,
      data: {
        submissionId: 'submission-id',
        storageKey: 'submission.pdf',
        fileType: 'application/pdf',
        projectId: 'project-id',
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('failed');
    const submissionUpdate = vi.mocked(Submission.findByIdAndUpdate).mock.calls.at(-1)[1];
    expect(submissionUpdate).toMatchObject({
      originalityScore: null,
      'plagiarismResult.status': 'failed',
      'plagiarismResult.scanCoverage': 'insufficient_text',
      'plagiarismResult.originalityScore': null,
    });

    const resultUpdate = vi.mocked(PlagiarismResult.findOneAndUpdate).mock.calls.at(-1)[1].$set;
    expect(resultUpdate).toMatchObject({
      status: 'failed',
      scanCoverage: 'insufficient_text',
      originalityScore: null,
      similarityPercentage: null,
      rawData: { mode: 'analysis_failed', scanCoverage: 'insufficient_text' },
    });
  });
});
