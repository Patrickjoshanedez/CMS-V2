/**
 * server/services/metadataExtraction.service.js
 *
 * Dedicated Metadata Extraction Domain Service.
 *
 * Encapsulates PDF extraction and layout analysis by orchestrating:
 *   1. PaddleOCR-VL (0.9B) parsing microservice via `ocrExtractionService`
 *   2. Heuristic extraction, font layout scoring, and DOI enrichment via `pdfMetadataExtractor`
 *   3. File stream retrieval from S3 / local filesystem via `storageService`
 *
 * Resolves architectural namespace collisions by isolating extraction logic
 * from manuscript CRUD operations (which are strictly managed by `documentService`).
 */
import { extractPdfMetadata } from '../utils/pdfMetadataExtractor.js';
import storageService from './storage.index.js';

function normalizeConfidencePercent(val) {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  if (num <= 1) return Math.round(num * 100);
  return Math.min(100, Math.round(num));
}

function inferTitleFromFilename(filename = '') {
  if (!filename || typeof filename !== 'string') return '';
  const base = filename.replace(/\.pdf$/i, '').trim();
  if (!base) return '';
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 10) return '';
  return cleaned;
}

class MetadataExtractionService {
  /**
   * Extract metadata from an in-memory PDF buffer.
   *
   * @param {Buffer} buffer - PDF binary buffer
   * @param {string} [originalName='document.pdf'] - Source file name
   * @returns {Promise<{
   *   metadata: { title: string, abstract: string, authors: string, year: string, doi: string, venue: string, keywords: string },
   *   confidence: Record<string, number>,
   *   ocrStatus: 'complete' | 'degraded',
   *   extractionProvider: string
   * }>}
   */
  async extractFromBuffer(buffer, originalName = 'document.pdf') {
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF buffer is empty or missing.');
    }

    const extractionResult = await extractPdfMetadata(buffer);
    const inferredTitle = inferTitleFromFilename(originalName);
    const effectiveTitle = extractionResult?.title || inferredTitle;

    const authors = Array.isArray(extractionResult?.authors)
      ? extractionResult.authors.join(', ')
      : extractionResult?.authors || '';

    const keywords = Array.isArray(extractionResult?.keywords)
      ? extractionResult.keywords.join(', ')
      : extractionResult?.keywords || '';

    const rawConfidence = extractionResult?.confidence || {};

    return {
      metadata: {
        title: effectiveTitle || '',
        abstract: extractionResult?.abstract || '',
        authors,
        year: extractionResult?.publicationYear ? String(extractionResult.publicationYear) : '',
        doi: extractionResult?.doi || '',
        venue: extractionResult?.publicationVenue || '',
        keywords,
      },
      confidence: {
        title: effectiveTitle
          ? extractionResult?.title
            ? normalizeConfidencePercent(rawConfidence.title)
            : 35
          : 0,
        abstract: normalizeConfidencePercent(rawConfidence.abstract),
        authors: normalizeConfidencePercent(rawConfidence.authors),
        year: normalizeConfidencePercent(rawConfidence.publicationYear),
        doi: normalizeConfidencePercent(rawConfidence.doi),
        venue: normalizeConfidencePercent(rawConfidence.publicationVenue),
        keywords: normalizeConfidencePercent(rawConfidence.keywords),
      },
      ocrStatus: extractionResult?.extractionProvider === 'paddleocr-vl' ? 'complete' : 'degraded',
      extractionProvider: extractionResult?.extractionProvider || 'heuristic',
    };
  }

  /**
   * Extract metadata by streaming a stored PDF file from storageService.
   *
   * @param {string} storageKey - MinIO / S3 / local storage key
   * @param {string} [originalName='document.pdf'] - Source file name
   * @returns {Promise<any>}
   */
  async extractFromStorageKey(storageKey, originalName = 'document.pdf') {
    if (!storageKey) {
      throw new Error('Storage key is required for extraction.');
    }

    const buffer = await storageService.downloadFile(storageKey);
    if (!buffer) {
      throw new Error(`Unable to download file from storage with key: ${storageKey}`);
    }

    return this.extractFromBuffer(buffer, originalName);
  }
}

export const metadataExtractionService = new MetadataExtractionService();
export default metadataExtractionService;
