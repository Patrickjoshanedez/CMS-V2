import api from './api';

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
  getPlagiarismStatus: (submissionId) => api.get(`/submissions/${submissionId}/plagiarism`),

  /**
   * Fetch the full PlagiarismReport with character-level span data.
   * Only succeeds once the plagiarism check status is "completed".
   *
   * @param {string} submissionId - MongoDB ObjectId of the submission.
   * @returns {Promise<import('axios').AxiosResponse>}
   *   Resolves with `{ data: { success, data: { submissionId, originalityScore,
   *     extractedText, fullReport, matchedSources, processedAt } } }`
   */
  getPlagiarismReport: (submissionId) => api.get(`/submissions/${submissionId}/plagiarism/report`),
};
