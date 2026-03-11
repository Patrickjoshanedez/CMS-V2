/**
 * Plagiarism API Service
 *
 * Frontend service for plagiarism analysis endpoints.
 * Provides methods for:
 *  - Triggering plagiarism checks
 *  - Polling for results
 *  - Indexing submissions
 *  - Managing plagiarism data
 */

import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * @typedef {{ text: string, title: string, chapter: string, projectId: string }} CheckPayload
 */

/**
 * @typedef {{ status: 'pending'|'completed'|'failed', similarity_percentage?: number, text_matches?: Array<*>, warning_flag?: boolean }} PlagiarismResult
 */

/**
 * Trigger plagiarism check on a submission
 * @param {string} submissionId
 * @param {CheckPayload} payload
 * @returns {Promise<{ taskId: string }>}
 */
export async function startPlagiarismCheck(submissionId, payload) {
  const response = await fetch(`${API_BASE}/submissions/${submissionId}/plagiarism/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start plagiarism check');
  }

  logger.info(`Plagiarism check started for submission: ${submissionId}`);
  return response.json();
}

/**
 * Get plagiarism check result
 * @param {string} submissionId
 * @returns {Promise<PlagiarismResult>}
 */
export async function getPlagiarismResult(submissionId) {
  const response = await fetch(`${API_BASE}/submissions/${submissionId}/plagiarism/result`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch plagiarism result');
  }

  return response.json();
}

/**
 * Index submission in plagiarism corpus (after approval)
 * @param {string} submissionId
 * @param {CheckPayload} payload
 * @returns {Promise<{ message: string }>}
 */
export async function indexSubmissionInCorpus(submissionId, payload) {
  const response = await fetch(`${API_BASE}/submissions/${submissionId}/plagiarism/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to index submission');
  }

  logger.info(`Submission indexed in corpus: ${submissionId}`);
  return response.json();
}

/**
 * Remove submission from plagiarism corpus
 * @param {string} submissionId
 * @returns {Promise<{ message: string }>}
 */
export async function removeFromCorpus(submissionId) {
  const response = await fetch(`${API_BASE}/submissions/${submissionId}/plagiarism/index`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to remove submission from corpus');
  }

  logger.info(`Submission removed from corpus: ${submissionId}`);
  return response.json();
}

/**
 * Poll plagiarism result with retry logic
 * @param {string} submissionId
 * @param {number} [maxAttempts=60]
 * @param {number} [intervalMs=2000]
 * @returns {Promise<PlagiarismResult>}
 */
export async function pollPlagiarismResult(submissionId, maxAttempts = 60, intervalMs = 2000) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await getPlagiarismResult(submissionId);

      if (result.status === 'completed') {
        logger.info(`Plagiarism check completed: ${submissionId}`, result);
        return result;
      }

      if (result.status === 'failed') {
        throw new Error('Plagiarism check failed');
      }

      // Still pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      logger.error(`Error polling plagiarism result: ${error.message}`);
      throw error;
    }
  }

  throw new Error(
    'Plagiarism check timeout — result not available after ' + maxAttempts * intervalMs + 'ms',
  );
}
