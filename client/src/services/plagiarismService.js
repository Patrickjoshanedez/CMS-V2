import { plagiarismService as basePlagiarismService } from './plagiarism.service';

/**
 * Plagiarism API service — all plagiarism/originality-related HTTP calls.
 *
 * Currently supports fetching the plagiarism result for a given submission.
 * Additional endpoints (re-run check, admin reports) can be added here
 * as the plagiarism module grows.
 */
export const plagiarismService = {
  /**
   * Fetch the plagiarism / originality check result for a submission.
   *
   * @param {string} submissionId - MongoDB ObjectId of the submission.
   * @returns {Promise<import('axios').AxiosResponse>}
   *   Resolves with `{ data: { success, data: { plagiarismResult } } }`
   */
  getPlagiarismStatus: basePlagiarismService.getPlagiarismStatus,

  /**
   * Fetch the full PlagiarismReport with character-level span data.
   * Only succeeds once the plagiarism check status is "completed".
   *
   * @param {string} submissionId - MongoDB ObjectId of the submission.
   * @returns {Promise<import('axios').AxiosResponse>}
   *   Resolves with `{ data: { success, data: { submissionId, originalityScore,
   *     extractedText, fullReport, matchedSources, processedAt } } }`
   */
  getPlagiarismReport: basePlagiarismService.getPlagiarismReport,

  /**
   * Upload a PDF and run an immediate plagiarism scan against archived corpus sources.
   *
   * @param {File|Blob} file
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  scanArchivedPdf: basePlagiarismService.scanArchivedPdf,

  /**
   * Alias for scanArchivedPdf used by newer archive checker UIs.
   *
   * @param {File|Blob} file
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  scanArchive: basePlagiarismService.scanArchive || basePlagiarismService.scanArchivedPdf,
};
