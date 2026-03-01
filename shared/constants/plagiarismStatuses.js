/**
 * Plagiarism check result statuses.
 *
 * These represent the lifecycle of an async plagiarism/originality check
 * associated with a submission document.
 */
export const PLAGIARISM_STATUSES = Object.freeze({
  /** Job has been enqueued but not yet picked up by the worker. */
  QUEUED: 'queued',
  /** Worker is actively processing (text extraction + comparison). */
  PROCESSING: 'processing',
  /** Check completed successfully — score and sources available. */
  COMPLETED: 'completed',
  /** All retries exhausted — check could not be completed. */
  FAILED: 'failed',
});

export const PLAGIARISM_STATUS_VALUES = Object.values(PLAGIARISM_STATUSES);
