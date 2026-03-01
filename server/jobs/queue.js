/**
 * BullMQ queue definitions for asynchronous job processing.
 *
 * Queues:
 *   - plagiarismQueue: Originality / plagiarism check jobs
 *   - emailQueue:      Email dispatch jobs
 *
 * Each queue is created lazily and only when Redis is available.
 * In test or fallback mode, enqueue helpers return null and callers
 * should handle the synchronous fallback path.
 */
import { Queue } from 'bullmq';
import { getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';

/** @type {Queue|null} */
let plagiarismQueue = null;

/** @type {Queue|null} */
let emailQueue = null;

/* ─────────────── Queue Names (exported for workers) ─────────────── */
export const QUEUE_NAMES = Object.freeze({
  PLAGIARISM: 'plagiarism-check',
  EMAIL: 'email-dispatch',
});

/* ─────────────── Default Job Options ─────────────── */

const plagiarismJobDefaults = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }, // 5 s → 10 s → 20 s
  removeOnComplete: { count: 200 }, // keep last 200 completed
  removeOnFail: { count: 500 }, // keep last 500 failed for inspection
};

const emailJobDefaults = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
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

/* ─────────────── Enqueue Helpers ─────────────── */

/**
 * Enqueue a plagiarism check job.
 *
 * @param {Object} payload
 * @param {string} payload.submissionId - Submission MongoDB _id
 * @param {string} payload.storageKey   - S3 key for the uploaded file
 * @param {string} payload.fileType     - MIME type (application/pdf, etc.)
 * @param {string} payload.projectId    - Owning project _id
 * @param {number} payload.chapter      - Chapter number
 * @returns {Promise<string|null>} The BullMQ job ID, or null if queue unavailable
 */
export async function enqueuePlagiarismJob(payload) {
  const queue = getPlagiarismQueue();
  if (!queue) return null;

  const job = await queue.add('check', payload, {
    jobId: `plag-${payload.submissionId}`, // Prevents duplicate jobs for same submission
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

/* ─────────────── Graceful Shutdown ─────────────── */

/**
 * Close all queue connections. Called during app shutdown.
 */
export async function closeQueues() {
  const promises = [];
  if (plagiarismQueue) promises.push(plagiarismQueue.close());
  if (emailQueue) promises.push(emailQueue.close());
  await Promise.all(promises);
  plagiarismQueue = null;
  emailQueue = null;
}

export default {
  QUEUE_NAMES,
  getPlagiarismQueue,
  getEmailQueue,
  enqueuePlagiarismJob,
  enqueueEmailJob,
  closeQueues,
};
