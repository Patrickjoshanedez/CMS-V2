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
import { extractMetadataFromText, extractPdfMetadata } from '../utils/pdfMetadataExtractor.js';
import { extractText } from '../utils/extractText.js';
import storageService from './storage.index.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function normalizeConfidencePercent(val) {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  if (num <= 1) return Math.round(num * 100);
  return Math.min(100, Math.round(num));
}

function inferTitleFromFilename(filename = '') {
  if (!filename || typeof filename !== 'string') return '';
  const base = filename.replace(/\.(pdf|docx)$/i, '').trim();
  if (!base) return '';
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 10) return '';
  return cleaned;
}

function isDocxBufferOrName(buffer, originalName = '') {
  const isPdfHeader = buffer.length >= 5 && buffer.toString('utf-8', 0, 5) === '%PDF-';
  if (isPdfHeader) return false;
  const isZipHeader =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;
  return String(originalName).toLowerCase().endsWith('.docx') || isZipHeader;
}

class MetadataExtractionService {
  /**
   * Extract metadata from an in-memory PDF or DOCX buffer.
   *
   * @param {Buffer} buffer - PDF or DOCX binary buffer
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
      throw new Error('Document buffer is empty or missing.');
    }

    let extractionResult;
    const isDocx = isDocxBufferOrName(buffer, originalName);
    if (isDocx) {
      const plainText = await extractText(buffer, DOCX_MIME);
      extractionResult = await extractMetadataFromText(
        plainText,
        {},
        { extractionProvider: 'mammoth' },
      );
    } else {
      extractionResult = await extractPdfMetadata(buffer);
    }
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
      ocrStatus:
        isDocx || extractionResult?.extractionProvider === 'paddleocr-vl' ? 'complete' : 'degraded',
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
