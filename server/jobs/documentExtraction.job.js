/**
 * server/jobs/documentExtraction.job.js
 *
 * BullMQ Asynchronous Document Metadata Extraction Worker.
 *
 * Processes heavy PDF layout recognition, PaddleOCR-VL microservice parsing,
 * and heuristic enrichment asynchronously off the Express event loop.
 * Emits real-time progress updates (0-100%) via Socket.IO and caches results
 * in Redis for polling fallback.
 */
import { Worker } from 'bullmq';
import { getRedisClient, getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';
import { QUEUE_NAMES } from './queue.js';
import metadataExtractionService from '../services/metadataExtraction.service.js';
import storageService from '../services/storage.index.js';
import { emitToUser } from '../services/socket.service.js';

let documentExtractionWorker = null;

/**
 * Worker processor for document extraction jobs.
 *
 * @param {import('bullmq').Job} job
 * @returns {Promise<any>}
 */
export async function processDocumentExtractionJob(job) {
  const { storageKey, originalName, userId } = job.data;
  console.log(`[DocumentExtraction Worker] Processing job ${job.id} for file: ${originalName}`);

  const emitProgress = async (percent, stage) => {
    try {
      await job.updateProgress(percent);
    } catch {
      // Non-fatal if job progress update fails
    }

    if (userId) {
      emitToUser(userId, 'ocr:progress', {
        jobId: job.id,
        progress: percent,
        stage,
      });
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setex(
          `extraction:job:${job.id}`,
          3600,
          JSON.stringify({
            status: 'processing',
            progress: percent,
            stage,
            jobId: job.id,
          }),
        );
      } catch {
        // Non-fatal Redis cache error
      }
    }
  };

  try {
    // Stage 1: File retrieval (10%)
    await emitProgress(10, 'downloading');
    const fileBuffer = await storageService.downloadFile(storageKey);
    if (!fileBuffer) {
      throw new Error(`Temporary file buffer could not be downloaded with key: ${storageKey}`);
    }

    // Stage 2: OCR & Layout Analysis (40%)
    await emitProgress(40, 'parsing');
    const extractionPayload = await metadataExtractionService.extractFromBuffer(
      fileBuffer,
      originalName,
    );

    // Stage 3: Heuristics & Enrichment (80%)
    await emitProgress(80, 'enriching');

    // Stage 4: Cache final payload in Redis (1-hour TTL)
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setex(
          `extraction:job:${job.id}`,
          3600,
          JSON.stringify({
            status: 'completed',
            progress: 100,
            data: extractionPayload,
            jobId: job.id,
          }),
        );
      } catch (err) {
        console.warn(`[DocumentExtraction Worker] Redis cache warning: ${err.message}`);
      }
    }

    // Stage 5: Clean up temporary file from storage
    try {
      if (typeof storageService.deleteFile === 'function') {
        await storageService.deleteFile(storageKey);
      }
    } catch (delErr) {
      console.warn(`[DocumentExtraction Worker] Temp file cleanup warning: ${delErr.message}`);
    }

    // Final Stage: 100% completion notification
    await emitProgress(100, 'completed');
    if (userId) {
      emitToUser(userId, 'ocr:complete', {
        jobId: job.id,
        payload: extractionPayload,
      });
    }

    console.log(`[DocumentExtraction Worker] Job ${job.id} completed successfully.`);
    return extractionPayload;
  } catch (error) {
    console.error(`[DocumentExtraction Worker] Job ${job.id} failed:`, error.message);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setex(
          `extraction:job:${job.id}`,
          3600,
          JSON.stringify({
            status: 'failed',
            progress: 0,
            error: error.message,
            jobId: job.id,
          }),
        );
      } catch {
        // Ignore redis setex error on failure
      }
    }

    // Clean up temp file on failure as well
    try {
      if (typeof storageService.deleteFile === 'function') {
        await storageService.deleteFile(storageKey);
      }
    } catch {
      // Non-fatal
    }

    if (userId) {
      emitToUser(userId, 'ocr:error', {
        jobId: job.id,
        error: error.message,
      });
    }

    throw error;
  }
}

/**
 * Start the BullMQ Document Extraction Worker.
 *
 * @returns {Worker|null}
 */
export function startDocumentExtractionWorker() {
  if (!isRedisAvailable()) {
    console.warn('[DocumentExtraction Worker] Redis is unavailable. Worker not started.');
    return null;
  }

  if (documentExtractionWorker) {
    return documentExtractionWorker;
  }

  documentExtractionWorker = new Worker(
    QUEUE_NAMES.DOCUMENT_EXTRACTION,
    processDocumentExtractionJob,
    {
      connection: getRedisConnectionOpts(),
      concurrency: parseInt(process.env.WORKER_EXTRACTION_CONCURRENCY || '2', 10),
    },
  );

  documentExtractionWorker.on('completed', (job) => {
    console.log(`[DocumentExtraction Worker] Job ${job.id} finished processing.`);
  });

  documentExtractionWorker.on('failed', (job, err) => {
    console.error(`[DocumentExtraction Worker] Job ${job?.id} failed with error:`, err.message);
  });

  console.log('[DocumentExtraction Worker] Worker initialized and listening for jobs.');
  return documentExtractionWorker;
}

/**
 * Stop the BullMQ Document Extraction Worker.
 */
export async function stopDocumentExtractionWorker() {
  if (documentExtractionWorker) {
    await documentExtractionWorker.close();
    documentExtractionWorker = null;
    console.log('[DocumentExtraction Worker] Worker stopped.');
  }
}

export default {
  processDocumentExtractionJob,
  startDocumentExtractionWorker,
  stopDocumentExtractionWorker,
};
