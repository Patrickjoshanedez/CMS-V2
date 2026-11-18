import { describe, expect, it } from 'vitest';
import { assertPlagiarismScanCanClear } from '../../modules/plagiarism/plagiarismClearance.js';

describe('plagiarism clearance evidence', () => {
  it.each([
    [null, 'PLAGIARISM_CHECK_REQUIRED'],
    [{ status: 'completed', mode: 'mock', scanCoverage: 'full' }, 'PLAGIARISM_MOCK_NOT_ALLOWED'],
    [{ status: 'completed', scanCoverage: 'degraded' }, 'PLAGIARISM_SCAN_DEGRADED'],
    [{ status: 'completed', scanCoverage: 'insufficient_text' }, 'PLAGIARISM_TEXT_INSUFFICIENT'],
    [{ status: 'completed' }, 'PLAGIARISM_SCAN_COVERAGE_REQUIRED'],
  ])('rejects invalid evidence %#', (result, code) => {
    expect(() => assertPlagiarismScanCanClear(result)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it.each(['full', 'lexical_only'])('accepts explicit %s coverage', (scanCoverage) => {
    expect(() =>
      assertPlagiarismScanCanClear({
        status: 'completed',
        scanCoverage,
        similarityPercentage: 0,
      }),
    ).not.toThrow();
  });

  it('rejects cleared coverage without a numeric similarity score', () => {
    expect(() =>
      assertPlagiarismScanCanClear({ status: 'completed', scanCoverage: 'full' }),
    ).toThrowError(expect.objectContaining({ code: 'PLAGIARISM_SCORE_REQUIRED' }));
  });
});
