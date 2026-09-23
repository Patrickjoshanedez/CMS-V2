/**
 * server/jobs/docxConversion.job.js
 *
 * BullMQ Asynchronous DOCX to PDF Conversion Worker.
 *
 * Offloads LibreOffice / Gotenberg headless document conversion
 * from the Express HTTP event loop to background workers.
 */
import { Worker } from 'bullmq';
import { getRedisConnectionOpts, isRedisAvailable } from '../config/redis.js';
import { QUEUE_NAMES, docxConversionJobDefaults } from './queue.js';
import storageService from '../services/storage.index.js';
import documentConversionService from '../services/documentConversion.service.js';
import Submission from '../modules/submissions/submission.model.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

let docxWorker = null;

/**
 * Job processor for converting a DOCX submission to PDF.
 *
 * @param {import('bullmq').Job} job
 * @returns {Promise<{ success: boolean, convertedPdfKey: string }>}
 */
export async function processDocxConversionJob(job) {
  const { submissionId, storageKey, fileName } = job.data;
  logger.info(
    { jobId: job.id, submissionId, fileName },
    '[DocxWorker] Processing DOCX to PDF conversion',
  );

  try {
    await Submission.findByIdAndUpdate(submissionId, {
      $set: { conversionStatus: 'PENDING' },
    });

    const docxBuffer = await storageService.downloadFile(storageKey);
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new Error(`Failed to download source DOCX with storage key: ${storageKey}`);
    }

    const pdfBuffer = await documentConversionService.convertDocxToPdf(docxBuffer, fileName);
    const convertedPdfKey = `${storageKey.replace(/\.[^.]+$/, '')}-converted.pdf`;

    await storageService.uploadFile(pdfBuffer, convertedPdfKey, 'application/pdf', {
      type: 'converted-pdf',
      sourceKey: storageKey,
    });

    await Submission.findByIdAndUpdate(submissionId, {
      $set: {
        convertedPdfKey,
        conversionStatus: 'COMPLETED',
      },
    });

    logger.info(
      { submissionId, convertedPdfKey },
      '[DocxWorker] DOCX successfully converted and persisted to storage',
    );
    return { success: true, convertedPdfKey };
  } catch (err) {
    logger.error(
      { jobId: job.id, submissionId, err: err.message },
      '[DocxWorker] Conversion job failed',
    );
    await Submission.findByIdAndUpdate(submissionId, {
      $set: { conversionStatus: 'FAILED' },
    });
    throw err;
  }
}

/**
 * Initialize and start the BullMQ DOCX Conversion worker.
 *
 * @returns {Worker|null}
 */
export function startDocxConversionWorker() {
  if (!isRedisAvailable()) {
    logger.warn('[DocxWorker] Redis unavailable; worker not started.');
    return null;
  }

  docxWorker = new Worker(QUEUE_NAMES.DOCX_CONVERSION, processDocxConversionJob, {
    connection: getRedisConnectionOpts(),
    concurrency: parseInt(process.env.WORKER_CONVERSION_CONCURRENCY || '2', 10),
  });

  docxWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[DocxWorker] Conversion job completed');
  });

  docxWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[DocxWorker] Conversion job failed');
  });

  return docxWorker;
}

/**
 * Gracefully close the BullMQ DOCX Conversion worker.
 */
export async function stopDocxConversionWorker() {
  if (docxWorker) {
    await docxWorker.close();
    docxWorker = null;
  }
}

export default {
  processDocxConversionJob,
  startDocxConversionWorker,
  stopDocxConversionWorker,
};
