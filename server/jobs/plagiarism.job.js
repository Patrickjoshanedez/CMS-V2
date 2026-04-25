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
import {
  calculatePlagiarism,
  compareAgainstCorpus,
  generateFingerprints,
} from '../services/plagiarism.service.js';
import {
  findFingerprintCandidates,
  getFingerprintLookup,
  upsertSubmissionFingerprints,
} from '../services/fingerprintIndex.service.js';
import storageService from '../services/storage.index.js';
import Submission from '../modules/submissions/submission.model.js';
import Project from '../modules/projects/project.model.js';
import Notification from '../modules/notifications/notification.model.js';
import PlagiarismResult from '../modules/plagiarism/plagiarism.model.js';
import { emitToUser } from '../services/socket.service.js';
import { PLAGIARISM_STATUSES } from '@cms/shared';

/** @type {Worker|null} */
let plagiarismWorker = null;
const MAX_CORPUS_CANDIDATES = 120;
const MAX_LAZY_CORPUS_EXTRACTIONS = 15;
const MIN_CORPUS_TEXT_LENGTH = 50;
const MAX_FINGERPRINT_CANDIDATES = Number(process.env.PLAGIARISM_FINGERPRINT_CANDIDATE_LIMIT || 80);
const MIN_SHARED_FINGERPRINTS = Number(process.env.PLAGIARISM_MIN_SHARED_FINGERPRINTS || 2);
const _MAX_FALLBACK_REINDEX_COUNT = Number(process.env.PLAGIARISM_FALLBACK_REINDEX_COUNT || 25);

function toLegacyMatchedSources(textMatches = []) {
  if (!Array.isArray(textMatches)) return [];

  return textMatches.map((match) => ({
    submissionId: match?.sourceId || null,
    projectTitle: match?.sourceTitle || 'Unknown source',
    chapter: null,
    matchPercentage: Number(match?.similarityPercentage || 0),
    spans: Array.isArray(match?.matchedBlocks)
      ? match.matchedBlocks
          .map((block) => ({
            start: Number(block?.studentStart),
            end: Number(block?.studentEnd),
          }))
          .filter(
            (block) =>
              Number.isFinite(block.start) && Number.isFinite(block.end) && block.end > block.start,
          )
      : [],
    sourceSnippet:
      Array.isArray(match?.matchedBlocks) && match.matchedBlocks.length > 0
        ? match.matchedBlocks[0]?.matchedText || ''
        : '',
  }));
}

function fallbackMatchedSourcesToTextMatches(matchedSources = [], submissionText = '') {
  const rows = Array.isArray(matchedSources) ? matchedSources : [];

  return rows.map((source, index) => ({
    sourceId: source?.submissionId || null,
    sourceTitle: source?.projectTitle || 'Unknown source',
    similarityPercentage: Number(source?.matchPercentage || 0),
    colorCode: `fallback-${index + 1}`,
    matchedBlocks: Array.isArray(source?.spans)
      ? source.spans
          .map((span) => ({
            studentStart: Number(span?.start),
            studentEnd: Number(span?.end),
            sourceStart: null,
            sourceEnd: null,
            matchedText:
              Number.isFinite(Number(span?.start)) && Number.isFinite(Number(span?.end))
                ? String(submissionText || '').slice(Number(span.start), Number(span.end))
                : '',
          }))
          .filter(
            (block) =>
              Number.isFinite(block.studentStart) &&
              Number.isFinite(block.studentEnd) &&
              block.studentEnd > block.studentStart,
          )
      : [],
  }));
}

const TRUSTED_FALLBACK_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'www.googleapis.com',
]);

function isTrustedFallbackUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return false;
    }
    return TRUSTED_FALLBACK_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function buildGoogleDocExportUrl(url) {
  if (!isTrustedFallbackUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== 'docs.google.com') {
      return null;
    }

    const match = parsed.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return null;
    }

    return `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
  } catch {
    return null;
  }
}

async function downloadBufferFromUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Remote fetch failed with ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readSubmissionFileWithFallback({ submissionId, storageKey, fileType }) {
  let primaryReadError = null;

  if (storageKey) {
    try {
      const fileBuffer = await storageService.downloadFile(storageKey);
      return { fileBuffer, effectiveFileType: fileType };
    } catch (error) {
      primaryReadError = error;
      console.warn(
        `[Plagiarism Worker] Storage read failed for submission ${submissionId}, trying trusted fallback URL: ${error.message}`,
      );
    }
  }

  const submission = await Submission.findById(submissionId)
    .select('driveWebContentLink driveWebViewLink syncedGoogleDocUrl')
    .lean();

  const fallbackCandidates = [
    submission?.driveWebContentLink,
    submission?.driveWebViewLink,
    submission?.syncedGoogleDocUrl,
  ].filter((value) => isTrustedFallbackUrl(value));

  for (const candidate of fallbackCandidates) {
    try {
      const exportUrl = buildGoogleDocExportUrl(candidate);
      const targetUrl = exportUrl || candidate;
      const { buffer } = await downloadBufferFromUrl(targetUrl);

      return {
        fileBuffer: buffer,
        effectiveFileType: exportUrl ? 'text/plain' : fileType,
      };
    } catch (error) {
      console.warn(
        `[Plagiarism Worker] Fallback URL read failed for submission ${submissionId}: ${error.message}`,
      );
    }
  }

  if (primaryReadError?.message) {
    throw new Error(primaryReadError.message);
  }

  throw new Error('Submission file is unavailable for plagiarism processing');
}

/**
 * Build the comparison corpus from existing submissions.
 * Includes approved/locked submissions from ALL projects (archive-wide check),
 * excluding submissions belonging to the same project.
 *
 * @param {string} excludeProjectId - Exclude submissions from this project
 * @param {string} excludeSubmissionId - Exclude this specific submission
 * @returns {Promise<Array<{ id: string, title: string, chapter: number, text: string }>>}
 */
async function _buildCorpus(excludeProjectId, excludeSubmissionId) {
  // Include approved/locked documents from other projects. Archived uploads may not
  // have extractedText yet, so we lazily backfill from storage when possible.
  const candidates = await Submission.find({
    projectId: { $ne: excludeProjectId },
    _id: { $ne: excludeSubmissionId },
    $or: [
      { extractedText: { $exists: true, $nin: [null, ''] } },
      {
        type: { $in: ['final_academic', 'final_journal'] },
        storageKey: { $exists: true, $nin: [null, ''] },
      },
    ],
  })
    .select('_id projectId chapter extractedText storageKey fileType type')
    .limit(MAX_CORPUS_CANDIDATES)
    .lean();

  const corpusCandidates = [];
  let lazyExtractions = 0;

  for (const candidate of candidates) {
    if (
      candidate?.extractedText &&
      candidate.extractedText.trim().length >= MIN_CORPUS_TEXT_LENGTH
    ) {
      corpusCandidates.push(candidate);
      continue;
    }

    if (!candidate?.storageKey || lazyExtractions >= MAX_LAZY_CORPUS_EXTRACTIONS) {
      continue;
    }

    try {
      let extractedText = null;
      if (typeof storageService.downloadTextSidecar === 'function') {
        extractedText = await storageService.downloadTextSidecar(candidate.storageKey);
      }
      if (!extractedText) {
        const fileBuffer = await storageService.downloadFile(candidate.storageKey);
        extractedText = await extractText(fileBuffer, candidate.fileType || 'application/pdf');
      }
      if (!extractedText || extractedText.trim().length < MIN_CORPUS_TEXT_LENGTH) {
        continue;
      }

      const normalizedText = extractedText.trim();
      corpusCandidates.push({
        ...candidate,
        extractedText: normalizedText,
      });

      lazyExtractions += 1;

      // Persist backfill so future checks can use the fast path.
      await Submission.updateOne(
        { _id: candidate._id },
        { $set: { extractedText: normalizedText } },
      );
    } catch (error) {
      console.warn(
        `[Plagiarism Worker] Failed lazy corpus extraction for submission ${candidate._id}: ${error.message}`,
      );
    }
  }

  // Enrich with project titles
  const projectIds = [...new Set(corpusCandidates.map((c) => c.projectId.toString()))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id title')
    .lean();
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.title]));

  return corpusCandidates.map((c) => ({
    id: c._id.toString(),
    projectId: c.projectId.toString(),
    title: projectMap.get(c.projectId.toString()) || 'Unknown Project',
    chapter: c.chapter,
    text: c.extractedText,
  }));
}

/**
 * Build a corpus from the fingerprint inverted index first, falling back to
 * extracted text retrieval only for shortlisted candidates.
 *
 * @param {{ submissionId: string, projectId: string, submittedText: string }} params
 * @returns {Promise<{ corpus: Array, submittedFingerprints: Array }>}
 */
async function _buildCorpusFromFingerprintIndex({ submissionId, projectId, submittedText }) {
  const { submittedFingerprints, uniqueHashes, candidates } = await findFingerprintCandidates({
    submissionId,
    projectId,
    text: submittedText,
    limit: MAX_FINGERPRINT_CANDIDATES,
  });

  const filteredCandidates = (Array.isArray(candidates) ? candidates : []).filter(
    (item) => Number(item?.sharedFingerprintCount || 0) >= MIN_SHARED_FINGERPRINTS,
  );

  if (filteredCandidates.length === 0) {
    return { corpus: [], submittedFingerprints };
  }

  const candidateIds = filteredCandidates
    .map((item) => item?.submissionId)
    .filter((value) => typeof value === 'string' && value.length > 0);

  if (candidateIds.length === 0) {
    return { corpus: [], submittedFingerprints };
  }

  const sharedCountMap = new Map(
    filteredCandidates.map((item) => [item.submissionId, Number(item.sharedFingerprintCount || 0)]),
  );

  const submissions = await Submission.find({ _id: { $in: candidateIds } })
    .select('_id projectId chapter extractedText storageKey fileType type')
    .lean();

  const normalizedCandidates = [];
  let lazyExtractions = 0;

  for (const candidate of submissions) {
    let normalizedText =
      typeof candidate?.extractedText === 'string' ? candidate.extractedText.trim() : '';

    if (
      (!normalizedText || normalizedText.length < MIN_CORPUS_TEXT_LENGTH) &&
      candidate?.storageKey &&
      lazyExtractions < MAX_LAZY_CORPUS_EXTRACTIONS
    ) {
      try {
        let extracted = null;
        if (typeof storageService.downloadTextSidecar === 'function') {
          extracted = await storageService.downloadTextSidecar(candidate.storageKey);
        }
        if (!extracted) {
          const fileBuffer = await storageService.downloadFile(candidate.storageKey);
          extracted = await extractText(fileBuffer, candidate.fileType || 'application/pdf');
        }
        normalizedText = typeof extracted === 'string' ? extracted.trim() : '';

        if (normalizedText.length >= MIN_CORPUS_TEXT_LENGTH) {
          await Submission.updateOne(
            { _id: candidate._id },
            { $set: { extractedText: normalizedText } },
          );
          lazyExtractions += 1;
        }
      } catch (error) {
        console.warn(
          `[Plagiarism Worker] Indexed candidate extraction failed for ${candidate._id}: ${error.message}`,
        );
      }
    }

    if (!normalizedText || normalizedText.length < MIN_CORPUS_TEXT_LENGTH) {
      continue;
    }

    normalizedCandidates.push({
      ...candidate,
      extractedText: normalizedText,
    });
  }

  if (normalizedCandidates.length === 0) {
    return { corpus: [], submittedFingerprints };
  }

  const projectIds = [...new Set(normalizedCandidates.map((item) => item.projectId.toString()))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id title')
    .lean();
  const projectMap = new Map(projects.map((project) => [project._id.toString(), project.title]));

  const fingerprintLookup = await getFingerprintLookup(
    normalizedCandidates.map((item) => item._id.toString()),
    uniqueHashes,
  );

  const corpus = normalizedCandidates
    .map((candidate) => {
      const candidateId = candidate._id.toString();
      const fingerprintEntry = fingerprintLookup.get(candidateId);

      return {
        id: candidateId,
        projectId: candidate.projectId.toString(),
        title: projectMap.get(candidate.projectId.toString()) || 'Unknown Project',
        chapter: candidate.chapter,
        text: candidate.extractedText,
        fingerprintHashes: fingerprintEntry ? [...fingerprintEntry.hashes] : [],
        sharedFingerprintCount: sharedCountMap.get(candidateId) || 0,
      };
    })
    .sort((a, b) => (b.sharedFingerprintCount || 0) - (a.sharedFingerprintCount || 0));

  return {
    corpus,
    submittedFingerprints,
  };
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
  const { submissionId, storageKey, fileType, projectId, chapter, type } = job.data;
  const startedAt = Date.now();

  console.log(`[Plagiarism Worker] Processing job ${job.id} for submission ${submissionId}`);

  // Update status to processing
  await Submission.findByIdAndUpdate(submissionId, {
    'plagiarismResult.status': PLAGIARISM_STATUSES.PROCESSING,
    'plagiarismResult.jobId': job.id,
  });

  await PlagiarismResult.findOneAndUpdate(
    { submissionId },
    {
      $set: {
        taskId: String(job.id),
        status: PLAGIARISM_STATUSES.PROCESSING,
        error: null,
        errorMessage: null,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  // Step 1: Try reading sidecar text first
  let extractedText = null;
  if (storageKey && typeof storageService.downloadTextSidecar === 'function') {
    extractedText = await storageService.downloadTextSidecar(storageKey);
  }

  // Step 2: Fallback to downloading file and extracting
  if (!extractedText) {
    const { fileBuffer, effectiveFileType } = await readSubmissionFileWithFallback({
      submissionId,
      storageKey,
      fileType,
    });
    extractedText = await extractText(fileBuffer, effectiveFileType);
  }

  const normalizedExtractedText = typeof extractedText === 'string' ? extractedText.trim() : '';

  if (!normalizedExtractedText || normalizedExtractedText.length < 50) {
    // Too little text to meaningfully compare — mark as completed with 100% originality
    await Submission.findByIdAndUpdate(submissionId, {
      extractedText: normalizedExtractedText || '',
      originalityScore: 100,
      'plagiarismResult.status': PLAGIARISM_STATUSES.COMPLETED,
      'plagiarismResult.originalityScore': 100,
      'plagiarismResult.matchedSources': [],
      'plagiarismResult.processedAt': new Date(),
    });

    await PlagiarismResult.findOneAndUpdate(
      { submissionId },
      {
        $set: {
          taskId: String(job.id),
          status: PLAGIARISM_STATUSES.COMPLETED,
          similarityPercentage: 0,
          textMatches: [],
          checkedAt: new Date(),
          completedAt: new Date(),
          warningFlag: false,
          rawData: {
            document_id: submissionId,
            originality_score: 100,
            plagiarism_score: 0,
            total_characters: normalizedExtractedText.length,
            matched_characters: 0,
            matches: [],
            candidates_evaluated: 0,
            processing_time_ms: Date.now() - startedAt,
          },
          error: null,
          errorMessage: null,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    try {
      await upsertSubmissionFingerprints({
        submissionId,
        projectId,
        chapter,
        type,
        text: normalizedExtractedText,
      });
    } catch (error) {
      console.warn(
        `[Plagiarism Worker] Fingerprint index update skipped for short submission ${submissionId}: ${error.message}`,
      );
    }

    console.log(`[Plagiarism Worker] Submission ${submissionId}: too little text, scored 100%.`);
    return { originalityScore: 100, matchedSources: [] };
  }

  // Store extracted text for future corpus building
  await Submission.findByIdAndUpdate(submissionId, { extractedText: normalizedExtractedText });

  // Step 3: Deterministic database-backed plagiarism check
  let result = await calculatePlagiarism(normalizedExtractedText, submissionId);
  let effectiveTextMatches = Array.isArray(result?.textMatches) ? result.textMatches : [];
  let similarityPercentage = Number.isFinite(result?.overallScore)
    ? Math.max(0, Math.min(100, Number(result.overallScore)))
    : 0;
  let originalityScore = Math.max(0, Math.min(100, 100 - similarityPercentage));
  let legacyMatchedSources = toLegacyMatchedSources(effectiveTextMatches);

  const shouldUseCorpusFallback =
    (effectiveTextMatches.length === 0 || similarityPercentage === 0) &&
    !job.data?.disableLegacyCorpusFallback;

  if (shouldUseCorpusFallback) {
    const fallbackCorpus = await _buildCorpus(projectId, submissionId);
    const fallbackResult = compareAgainstCorpus(normalizedExtractedText, fallbackCorpus);

    if (
      Number.isFinite(fallbackResult?.similarityPercentage) &&
      fallbackResult.similarityPercentage > similarityPercentage &&
      Array.isArray(fallbackResult?.matchedSources) &&
      fallbackResult.matchedSources.length > 0
    ) {
      similarityPercentage = Math.max(
        0,
        Math.min(100, Number(fallbackResult.similarityPercentage)),
      );
      originalityScore = Number.isFinite(fallbackResult?.originalityScore)
        ? Math.max(0, Math.min(100, Number(fallbackResult.originalityScore)))
        : Math.max(0, Math.min(100, 100 - similarityPercentage));

      legacyMatchedSources = fallbackResult.matchedSources;
      effectiveTextMatches = fallbackMatchedSourcesToTextMatches(
        fallbackResult.matchedSources,
        normalizedExtractedText,
      );

      result = {
        ...result,
        overallScore: similarityPercentage,
        textMatches: effectiveTextMatches,
        totalDocumentWords:
          result?.totalDocumentWords || normalizedExtractedText.split(/\s+/).filter(Boolean).length,
        matchedWords: result?.matchedWords || 0,
      };
    }
  }

  const normalizedMatches = effectiveTextMatches.map((match, index) => {
    const matchedBlocks = Array.isArray(match?.matchedBlocks) ? match.matchedBlocks : [];
    const first = matchedBlocks[0] || null;

    return {
      match_id: `match-${index}-${match?.sourceId || 'source'}`,
      source_id: match?.sourceId || null,
      source_title: match?.sourceTitle || 'Unknown source',
      color_code: match?.colorCode || '#ef4444',
      start_index: Number.isFinite(first?.studentStart) ? Number(first.studentStart) : null,
      end_index: Number.isFinite(first?.studentEnd) ? Number(first.studentEnd) : null,
      similarity_score: Number.isFinite(match?.similarityPercentage)
        ? Math.max(0, Math.min(1, Number(match.similarityPercentage) / 100))
        : null,
      matched_blocks: matchedBlocks,
    };
  });

  const fullReport = {
    submissionId,
    overallScore: similarityPercentage,
    originalityScore,
    totalDocumentWords: Number(result?.totalDocumentWords || 0),
    matchedWords: Number(result?.matchedWords || 0),
    textMatches: effectiveTextMatches,
    matches: normalizedMatches,
    processing_time_ms: Date.now() - startedAt,
  };

  // Step 4: Persist result payload
  await Submission.findByIdAndUpdate(submissionId, {
    originalityScore,
    'plagiarismResult.status': PLAGIARISM_STATUSES.COMPLETED,
    'plagiarismResult.originalityScore': originalityScore,
    'plagiarismResult.overallScore': similarityPercentage,
    'plagiarismResult.textMatches': effectiveTextMatches,
    'plagiarismResult.matchedSources': legacyMatchedSources,
    'plagiarismResult.fullReport': fullReport,
    'plagiarismResult.processedAt': new Date(),
  });

  await PlagiarismResult.findOneAndUpdate(
    { submissionId },
    {
      $set: {
        taskId: String(job.id),
        status: PLAGIARISM_STATUSES.COMPLETED,
        overallScore: similarityPercentage,
        similarityPercentage,
        textMatches: effectiveTextMatches,
        checkedAt: new Date(),
        completedAt: new Date(),
        warningFlag: similarityPercentage >= 50,
        rawData: fullReport,
        error: null,
        errorMessage: null,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  // Step 5: Index final/approved submissions into inverted-index corpus.
  const shouldIndexSubmission =
    Boolean(job.data?.isFinalSubmission) ||
    Boolean(job.data?.indexInCorpus) ||
    ['final_academic', 'final_journal'].includes(String(type || '').toLowerCase());

  if (shouldIndexSubmission) {
    try {
      const fingerprints = generateFingerprints(normalizedExtractedText);
      await upsertSubmissionFingerprints({
        submissionId,
        projectId,
        chapter,
        type,
        text: normalizedExtractedText,
        fingerprints,
      });
    } catch (error) {
      console.warn(
        `[Plagiarism Worker] Failed to index submission ${submissionId} into fingerprint corpus: ${error.message}`,
      );
    }
  }

  // Step 6: Notify student
  const submission = await Submission.findById(submissionId).populate('submittedBy', 'email');
  if (submission) {
    const plagNotif = await Notification.create({
      userId: submission.submittedBy._id || submission.submittedBy,
      type: 'plagiarism_complete',
      title: 'Originality Check Complete',
      message: `Your Chapter ${chapter} originality score is ${Number.isFinite(originalityScore) ? originalityScore.toFixed(1) : '—'}%.`,
      metadata: {
        submissionId,
        projectId,
        chapter,
        originalityScore,
      },
    });
    emitToUser(submission.submittedBy._id || submission.submittedBy, 'notification:new', plagNotif);
  }

  console.log(
    `[Plagiarism Worker] Submission ${submissionId}: originality ${originalityScore}% (${effectiveTextMatches.length} sources matched).`,
  );

  return {
    ...result,
    originalityScore,
    similarityPercentage,
    matchedSources: legacyMatchedSources,
  };
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

    await PlagiarismResult.findOneAndUpdate(
      { submissionId },
      {
        $set: {
          taskId: String(job.id),
          status: PLAGIARISM_STATUSES.FAILED,
          error: err.message,
          errorMessage: err.message,
          checkedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
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
