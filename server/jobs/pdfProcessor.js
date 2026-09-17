/**
 * Asynchronous PDF Processing Job Handler (BullMQ).
 *
 * Offloads heavy PDF binary parsing, OCR, and regex-based metadata extraction
 * from the Express HTTP event loop to background worker processes.
 */
import storageService from '../services/storage.index.js';
import { extractPdfMetadata } from '../utils/pdfMetadataExtractor.js';
import { extractText } from '../utils/extractText.js';
import Submission from '../modules/submissions/submission.model.js';

export async function processPdfJob(job) {
  const { submissionId, storageKey, fileType } = job.data;
  console.warn(`[PDF Worker] Processing PDF metadata extraction for submission: ${submissionId}`);

  try {
    let fileBuffer = null;
    if (typeof storageService.downloadFile === 'function') {
      fileBuffer = await storageService.downloadFile(storageKey);
    }

    if (!fileBuffer) {
      throw new Error(`Unable to download file with key: ${storageKey}`);
    }

    const extracted = await extractPdfMetadata(fileBuffer);
    const text = await extractText(fileBuffer, fileType || 'application/pdf');

    await Submission.findByIdAndUpdate(submissionId, {
      $set: {
        'extractedMetadata.status': 'COMPLETED',
        'extractedMetadata.title': extracted?.title?.trim() || null,
        'extractedMetadata.abstract': extracted?.abstract?.trim() || null,
        'extractedMetadata.keywords': extracted?.keywords || [],
        'extractedMetadata.extractedAt': new Date(),
        extractedText: text || '',
      },
    });

    console.warn(`[PDF Worker] Metadata extraction completed for submission: ${submissionId}`);
    return { success: true, submissionId };
  } catch (err) {
    console.error(
      `[PDF Worker] PDF extraction failed for submission ${submissionId}:`,
      err.message,
    );
    await Submission.findByIdAndUpdate(submissionId, {
      $set: {
        'extractedMetadata.status': 'FAILED',
        'extractedMetadata.error': err.message,
      },
    });
    throw err;
  }
}

export default processPdfJob;
