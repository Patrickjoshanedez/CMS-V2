/**
 * BullMQ queue definitions for asynchronous job processing.
 *
 * Queues:
 *   - plagiarismQueue:    Originality / plagiarism check jobs (with Simple Mode deduplication)
 *   - emailQueue:         Email dispatch jobs
 *   - plagiarismDlqQueue: Dead-Letter Queue for permanently failed plagiarism jobs
 *
 * Each queue is created lazily and only when Redis is available.
 * In test or fallback mode, enqueue helpers return null and callers
 * should handle the synchronous fallback path.
 *
 * Deduplication Strategy:
 *   Plagiarism jobs use BullMQ's `deduplication.id` in Simple Mode. This extends
 *   the deduplication window only until the job completes or fails, allowing
 *   legitimate user retries after transient failures while preventing concurrent
 *   duplicate processing of the same submission.
 */
import { Queue } from 'bullmq';
import { getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';

/** @type {Queue|null} */
let plagiarismQueue = null;

/** @type {Queue|null} */
let emailQueue = null;

/** @type {Queue|null} */
let plagiarismDlqQueue = null;

/* ─────────────── Queue Names (exported for workers) ─────────────── */
export const QUEUE_NAMES = Object.freeze({
  PLAGIARISM: 'plagiarism-check',
  EMAIL: 'email-dispatch',
  PLAGIARISM_DLQ: 'plagiarism-check-dlq',
});

/* ─────────────── Default Job Options ─────────────── */

const plagiarismJobDefaults = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }, // 5 s → 10 s → 20 s
  removeOnComplete: { count: 200 }, // keep last 200 completed
  removeOnFail: false, // retain all failed jobs for DLQ routing inspection
};

const emailJobDefaults = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

const plagiarismDlqJobDefaults = {
  attempts: 1, // DLQ jobs are not retried automatically
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 500 },
};

/* ─────────────── Lazy Initializers ─────────────── */

/**
 * Get or create the plagiarism check queue.
 * Returns null if Redis is not available.
 * @returns {Queue|null}
 */
export function getPlagiarismQueue() {
  if (!isRedisAvailable()) return null;

  if (!plagiarismQueue) {
    plagiarismQueue = new Queue(QUEUE_NAMES.PLAGIARISM, {
      connection: getRedisConnectionOpts(),
      defaultJobOptions: plagiarismJobDefaults,
    });
  }
  return plagiarismQueue;
}

/**
 * Get or create the email dispatch queue.
 * Returns null if Redis is not available.
 * @returns {Queue|null}
 */
export function getEmailQueue() {
  if (!isRedisAvailable()) return null;

  if (!emailQueue) {
    emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: getRedisConnectionOpts(),
      defaultJobOptions: emailJobDefaults,
    });
  }
  return emailQueue;
}

/**
 * Get or create the plagiarism Dead-Letter Queue.
 * Receives jobs that have exhausted all retry attempts.
 * Returns null if Redis is not available.
 * @returns {Queue|null}
 */
export function getPlagiarismDlqQueue() {
  if (!isRedisAvailable()) return null;

  if (!plagiarismDlqQueue) {
    plagiarismDlqQueue = new Queue(QUEUE_NAMES.PLAGIARISM_DLQ, {
      connection: getRedisConnectionOpts(),
      defaultJobOptions: plagiarismDlqJobDefaults,
    });
  }
  return plagiarismDlqQueue;
}

/* ─────────────── Enqueue Helpers ─────────────── */

/**
 * Enqueue a plagiarism check job with Simple Mode deduplication.
 *
 * Uses BullMQ's `deduplication.id` (Simple Mode) to prevent concurrent
 * duplicate processing. The deduplication lock is released automatically
 * once the job reaches a completed or failed terminal state, allowing
 * legitimate retries after transient failures.
 *
 * A deterministic deduplication ID is computed from the submissionId and
 * the file's SHA-256 checksum (if provided) to ensure idempotent job creation.
 *
 * @param {Object} payload
 * @param {string} payload.submissionId - Submission MongoDB _id
 * @param {string} payload.storageKey   - S3 key for the uploaded file
 * @param {string} payload.fileType     - MIME type (application/pdf, etc.)
 * @param {string} payload.projectId    - Owning project _id
 * @param {number} payload.chapter      - Chapter number
 * @param {string} [payload.checksum]   - Optional SHA-256 of the file for stronger deduplication
 * @returns {Promise<string|null>} The BullMQ job ID, or null if queue unavailable
 */
export async function enqueuePlagiarismJob(payload) {
  const queue = getPlagiarismQueue();
  if (!queue) return null;

  // Build a deterministic deduplication ID that includes the file checksum when available.
  // Simple Mode: the lock is released once the job reaches completed/failed state.
  const dedupId = payload.checksum
    ? `plag_${payload.submissionId}_${payload.checksum}`
    : `plag_${payload.submissionId}`;

  const job = await queue.add('check', payload, {
    deduplication: { id: dedupId },
  });

  return job.id;
}

/**
 * Enqueue an email dispatch job.
 *
 * @param {Object} payload
 * @param {string} payload.to       - Recipient email
 * @param {string} payload.subject  - Email subject
 * @param {string} payload.html     - Email HTML body
 * @param {string} [payload.text]   - Plain text alternative
 * @returns {Promise<string|null>} The BullMQ job ID, or null if queue unavailable
 */
export async function enqueueEmailJob(payload) {
  const queue = getEmailQueue();
  if (!queue) return null;

  const job = await queue.add('send', payload);
  return job.id;
}

/**
 * Route a permanently failed plagiarism job to the Dead-Letter Queue.
 *
 * Preserves the original job payload, error context, and execution metadata
 * for administrative inspection and manual retry via Bull Board.
 *
 * @param {Object} originalJob - The failed BullMQ job object.
 * @param {Error} error - The terminal error that caused the failure.
 * @returns {Promise<string|null>} The DLQ job ID, or null if queue unavailable.
 */
export async function routeToPlagiarismDlq(originalJob, error) {
  const dlqQueue = getPlagiarismDlqQueue();
  if (!dlqQueue) return null;

  const dlqPayload = {
    originalJobId: String(originalJob.id),
    originalData: originalJob.data,
    failedAt: new Date().toISOString(),
    errorMessage: error.message,
    errorStack: error.stack,
    attemptsMade: originalJob.attemptsMade,
  };

  const dlqJob = await dlqQueue.add('failed-plagiarism', dlqPayload, {
    jobId: `dlq-plag-${originalJob.data.submissionId}-${Date.now()}`,
  });

  return dlqJob.id;
}

/* ─────────────── Graceful Shutdown ─────────────── */

/**
 * Close all queue connections. Called during app shutdown.
 */
export async function closeQueues() {
  const promises = [];
  if (plagiarismQueue) promises.push(plagiarismQueue.close());
  if (emailQueue) promises.push(emailQueue.close());
  if (plagiarismDlqQueue) promises.push(plagiarismDlqQueue.close());
  await Promise.all(promises);
  plagiarismQueue = null;
  emailQueue = null;
  plagiarismDlqQueue = null;
}

export default {
  QUEUE_NAMES,
  getPlagiarismQueue,
  getEmailQueue,
  getPlagiarismDlqQueue,
  enqueuePlagiarismJob,
  enqueueEmailJob,
  routeToPlagiarismDlq,
  closeQueues,
};
