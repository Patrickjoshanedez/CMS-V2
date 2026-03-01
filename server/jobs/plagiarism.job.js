/* eslint-disable no-console */
/**
 * Plagiarism Check Job Worker (BullMQ).
 *
 * Processes jobs from the 'plagiarism-check' queue:
 *   1. Downloads the submission file from S3
 *   2. Extracts plain text (PDF / DOCX / TXT)
 *   3. Builds a corpus from existing approved submissions in the archive
 *   4. Runs originality check (internal engine or external API)
 *   5. Updates the Submission document with result
 *   6. Creates a notification for the student
 *
 * Retry policy: 3 attempts with exponential backoff (configured in queue.js).
 * If all retries fail, marks the plagiarismResult.status as 'failed'.
 *
 * @module jobs/plagiarism.job
 */
import { Worker } from 'bullmq';
import { getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';
import { QUEUE_NAMES } from './queue.js';
import { extractText } from '../utils/extractText.js';
import { checkOriginality } from '../services/plagiarism.service.js';
import storageService from '../services/storage.service.js';
import Submission from '../modules/submissions/submission.model.js';
import Project from '../modules/projects/project.model.js';
import Notification from '../modules/notifications/notification.model.js';
import { PLAGIARISM_STATUSES } from '@cms/shared';

/** @type {Worker|null} */
let plagiarismWorker = null;

/**
 * Build the comparison corpus from existing submissions.
 * Includes approved/locked submissions from ALL projects (archive-wide check),
 * excluding submissions belonging to the same project.
 *
 * @param {string} excludeProjectId - Exclude submissions from this project
 * @param {string} excludeSubmissionId - Exclude this specific submission
 * @returns {Promise<Array<{ id: string, title: string, chapter: number, text: string }>>}
 */
async function buildCorpus(excludeProjectId, excludeSubmissionId) {
  // Find submissions that have extractedText stored and are not from the same project
  const candidates = await Submission.find({
    projectId: { $ne: excludeProjectId },
    _id: { $ne: excludeSubmissionId },
    extractedText: { $exists: true, $nin: [null, ''] },
  })
    .select('_id projectId chapter extractedText')
    .limit(100) // Cap to prevent excessive memory usage
    .lean();

  // Enrich with project titles
  const projectIds = [...new Set(candidates.map((c) => c.projectId.toString()))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id title')
    .lean();
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.title]));

  return candidates.map((c) => ({
    id: c._id.toString(),
    title: projectMap.get(c.projectId.toString()) || 'Unknown Project',
    chapter: c.chapter,
    text: c.extractedText,
  }));
}

/**
 * Process a single plagiarism check job.
 *
 * @param {Object} job - BullMQ job
 * @param {Object} job.data
 * @param {string} job.data.submissionId
 * @param {string} job.data.storageKey
 * @param {string} job.data.fileType
 * @param {string} job.data.projectId
 * @param {number} job.data.chapter
 */
async function processJob(job) {
  const { submissionId, storageKey, fileType, projectId, chapter } = job.data;

  console.log(`[Plagiarism Worker] Processing job ${job.id} for submission ${submissionId}`);

  // Update status to processing
  await Submission.findByIdAndUpdate(submissionId, {
    'plagiarismResult.status': PLAGIARISM_STATUSES.PROCESSING,
    'plagiarismResult.jobId': job.id,
  });

  // Step 1: Download file from S3
  const fileBuffer = await storageService.downloadFile(storageKey);

  // Step 2: Extract text
  const extractedText = await extractText(fileBuffer, fileType);

  if (!extractedText || extractedText.trim().length < 50) {
    // Too little text to meaningfully compare — mark as completed with 100% originality
    await Submission.findByIdAndUpdate(submissionId, {
      extractedText: extractedText || '',
      originalityScore: 100,
      'plagiarismResult.status': PLAGIARISM_STATUSES.COMPLETED,
      'plagiarismResult.originalityScore': 100,
      'plagiarismResult.matchedSources': [],
      'plagiarismResult.processedAt': new Date(),
    });

    console.log(`[Plagiarism Worker] Submission ${submissionId}: too little text, scored 100%.`);
    return { originalityScore: 100, matchedSources: [] };
  }

  // Store extracted text for future corpus building
  await Submission.findByIdAndUpdate(submissionId, { extractedText });

  // Step 3: Build corpus of existing documents
  const corpus = await buildCorpus(projectId, submissionId);

  // Step 4: Run originality check
  const result = await checkOriginality(extractedText, corpus);

  // Step 5: Update submission with results
  await Submission.findByIdAndUpdate(submissionId, {
    originalityScore: result.originalityScore,
    'plagiarismResult.status': PLAGIARISM_STATUSES.COMPLETED,
    'plagiarismResult.originalityScore': result.originalityScore,
    'plagiarismResult.matchedSources': result.matchedSources,
    'plagiarismResult.processedAt': new Date(),
  });

  // Step 6: Notify student
  const submission = await Submission.findById(submissionId).populate('submittedBy', 'email');
  if (submission) {
    await Notification.create({
      userId: submission.submittedBy._id || submission.submittedBy,
      type: 'plagiarism_complete',
      title: 'Originality Check Complete',
      message: `Your Chapter ${chapter} originality score is ${result.originalityScore}%.`,
      metadata: {
        submissionId,
        projectId,
        chapter,
        originalityScore: result.originalityScore,
      },
    });
  }

  console.log(
    `[Plagiarism Worker] Submission ${submissionId}: originality ${result.originalityScore}% (${result.matchedSources.length} matches found).`,
  );

  return result;
}

/**
 * Handle job failure after all retries are exhausted.
 *
 * @param {Object} job
 * @param {Error} err
 */
async function handleFailedJob(job, err) {
  const { submissionId } = job.data;

  console.error(
    `[Plagiarism Worker] Job ${job.id} FAILED for submission ${submissionId}: ${err.message}`,
  );

  try {
    await Submission.findByIdAndUpdate(submissionId, {
      'plagiarismResult.status': PLAGIARISM_STATUSES.FAILED,
      'plagiarismResult.error': err.message,
    });
  } catch (updateErr) {
    console.error(`[Plagiarism Worker] Failed to update submission status: ${updateErr.message}`);
  }
}

/* ─────────────── Worker Lifecycle ─────────────── */

/**
 * Start the plagiarism check worker.
 * Should be called once during app startup, after Redis is initialized.
 */
export function startPlagiarismWorker() {
  if (!isRedisAvailable()) {
    console.warn('[Plagiarism Worker] Redis not available — worker not started.');
    return;
  }

  if (plagiarismWorker) {
    console.warn('[Plagiarism Worker] Already running.');
    return;
  }

  plagiarismWorker = new Worker(QUEUE_NAMES.PLAGIARISM, processJob, {
    connection: getRedisConnectionOpts(),
    concurrency: 2, // Process up to 2 jobs simultaneously
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per 60 seconds (rate limiting)
    },
  });

  plagiarismWorker.on('completed', (job, result) => {
    console.log(
      `[Plagiarism Worker] Job ${job.id} completed — score: ${result?.originalityScore}%`,
    );
  });

  plagiarismWorker.on('failed', (job, err) => {
    handleFailedJob(job, err);
  });

  plagiarismWorker.on('error', (err) => {
    console.error(`[Plagiarism Worker] Worker error: ${err.message}`);
  });

  console.log('[Plagiarism Worker] Started and listening for jobs.');
}

/**
 * Gracefully stop the plagiarism worker.
 */
export async function stopPlagiarismWorker() {
  if (plagiarismWorker) {
    await plagiarismWorker.close();
    plagiarismWorker = null;
    console.log('[Plagiarism Worker] Stopped.');
  }
}

/* ─────────────── Synchronous Fallback ─────────────── */

/**
 * Run plagiarism check synchronously (for when Redis/BullMQ is unavailable).
 * Used in dev/test environments as fallback.
 *
 * @param {Object} params
 * @param {string} params.submissionId
 * @param {string} params.storageKey
 * @param {string} params.fileType
 * @param {string} params.projectId
 * @param {number} params.chapter
 * @returns {Promise<{ originalityScore: number, matchedSources: Array }>}
 */
export async function runPlagiarismCheckSync(params) {
  try {
    return await processJob({ id: `sync-${params.submissionId}`, data: params });
  } catch (err) {
    console.error(`[Plagiarism Sync] Failed for ${params.submissionId}: ${err.message}`);
    // Mark as failed
    await Submission.findByIdAndUpdate(params.submissionId, {
      'plagiarismResult.status': PLAGIARISM_STATUSES.FAILED,
      'plagiarismResult.error': err.message,
    });
    return null;
  }
}

export default {
  startPlagiarismWorker,
  stopPlagiarismWorker,
  runPlagiarismCheckSync,
};
