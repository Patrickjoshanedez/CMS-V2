import { PLAGIARISM_STATUSES } from '@cms/shared';
import AppError from '../../utils/AppError.js';

/**
 * Require real, usable scan evidence before a plagiarism-gated decision.
 *
 * @param {Object|null} result - Submission or collection plagiarism result
 * @param {string} label - Human-readable document label
 * @returns {Object} The scan report associated with the result
 */
export function assertPlagiarismScanCanClear(result, label = 'submission') {
  if (!result || result.status !== PLAGIARISM_STATUSES.COMPLETED) {
    throw new AppError(
      `A completed plagiarism scan is required for this ${label}.`,
      400,
      'PLAGIARISM_CHECK_REQUIRED',
    );
  }

  const report = result.fullReport || result.rawData || null;
  if (result.mode === 'mock' || report?.mode === 'mock' || report?.mode === 'mock-manual') {
    throw new AppError(
      `Simulated plagiarism results cannot clear this ${label}. Run a real scan first.`,
      400,
      'PLAGIARISM_MOCK_NOT_ALLOWED',
    );
  }

  const scanCoverage = result.scanCoverage || report?.scanCoverage;
  if (scanCoverage === 'degraded' || report?.scanType === 'syntactic_fallback') {
    throw new AppError(
      `The plagiarism scan for this ${label} used degraded syntactic mode and requires review.`,
      400,
      'PLAGIARISM_SCAN_DEGRADED',
    );
  }

  if (!['full', 'lexical_only'].includes(scanCoverage)) {
    throw new AppError(
      `The plagiarism scan for this ${label} has no verified text coverage. Re-run the scan after correcting the document.`,
      400,
      scanCoverage === 'insufficient_text'
        ? 'PLAGIARISM_TEXT_INSUFFICIENT'
        : 'PLAGIARISM_SCAN_COVERAGE_REQUIRED',
    );
  }

  if (
    result.similarityPercentage === null ||
    result.similarityPercentage === undefined ||
    !Number.isFinite(Number(result.similarityPercentage)) ||
    Number(result.similarityPercentage) < 0 ||
    Number(result.similarityPercentage) > 100
  ) {
    throw new AppError(
      `The plagiarism scan for this ${label} has no valid similarity score. Re-run the scan.`,
      400,
      'PLAGIARISM_SCORE_REQUIRED',
    );
  }

  return report;
}
