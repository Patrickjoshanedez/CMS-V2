/**
 * server/services/ocrExtraction.service.js
 *
 * Centralized Document Intake & OCR Extraction Gateway.
 * Routes PDF manuscripts to the dedicated PaddleOCR-VL (0.9B) microservice
 * (`http://cms-ocr-engine:8000/api/v1/parse-document`) to extract:
 *   - Normalized Markdown full text
 *   - Structured tables (Markdown & rows)
 *   - Mathematical expressions (LaTeX)
 *   - Visual layout metadata (Title, Abstract, Authors, Year)
 *
 * Fault tolerance:
 *   If the microservice times out or is unreachable, the gateway catches the
 *   network exception and triggers in-process text extraction, returning
 *   the result with `ocrStatus: 'degraded'` to ensure zero-downtime intake.
 */
import env from '../config/env.js';

class OcrExtractionService {
  constructor() {
    this.engineUrl = (env.OCR_ENGINE_URL || 'http://cms-ocr-engine:8000').replace(/\/+$/, '');
    this.timeoutMs = env.OCR_ENGINE_TIMEOUT_MS || 15000;
  }

  /**
   * Parse an academic manuscript buffer via PaddleOCR-VL with graceful fallback.
   *
   * @param {Buffer} fileBuffer - Raw binary buffer of the uploaded file.
   * @param {string} [mimeType='application/pdf'] - MIME type.
   * @param {string} [filename='document.pdf'] - File name.
   * @returns {Promise<{
   *   fullText: string,
   *   tables: Array<{ page: number, markdown: string, rows: Array<Array<string>> }>,
   *   formulas: Array<{ page: number, latex: string }>,
   *   metadata: { title: string|null, abstract: string|null, authors: Array<string>, year: number|null, page_count: number },
   *   ocrStatus: 'complete' | 'degraded',
   *   error?: string
   * }>}
   */
  async parseDocument(fileBuffer, mimeType = 'application/pdf', filename = 'document.pdf') {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or missing.');
    }

    // If OCR microservice failed recently, engage local fallback immediately without waiting
    if (this._lastFailureTime && Date.now() - this._lastFailureTime < 60000) {
      const fallbackResult = await this._executeLocalFallback(fileBuffer, mimeType);
      return {
        ...fallbackResult,
        ocrStatus: 'degraded',
        error: 'OCR engine offline (cooldown active)',
      };
    }

    // Direct network dispatch to cms-ocr-engine with fast probe timeout
    const effectiveTimeout = Math.min(2500, this.timeoutMs);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, filename || 'document.pdf');

      const response = await fetch(`${this.engineUrl}/api/v1/parse-document`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OCR engine HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        fullText: typeof data.full_text === 'string' ? data.full_text : '',
        tables: Array.isArray(data.tables) ? data.tables : [],
        formulas: Array.isArray(data.formulas) ? data.formulas : [],
        metadata: data.metadata || {
          title: null,
          abstract: null,
          authors: [],
          year: null,
          page_count: 0,
        },
        ocrStatus: 'complete',
      };
    } catch (err) {
      const isTimeout =
        err.name === 'AbortError' || String(err.message).toLowerCase().includes('timeout');
      const reason = isTimeout ? `Timeout after ${effectiveTimeout}ms` : err.message;

      this._lastFailureTime = Date.now();
      console.warn(
        `[OcrExtractionService] Microservice call failed (${reason}). Engaging graceful local fallback.`,
      );

      // Perform local fallback extraction
      const fallbackResult = await this._executeLocalFallback(fileBuffer, mimeType);
      return {
        ...fallbackResult,
        ocrStatus: 'degraded',
        error: reason,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Healthcheck helper for readiness gates.
   */
  async checkHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.engineUrl}/health`, {
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Internal in-process text extraction fallback.
   * @private
   */
  async _executeLocalFallback(fileBuffer, _mimeType) {
    try {
      // Lazy import to isolate dependency
      const { PDFParse } = await import('pdf-parse');
      if (typeof PDFParse === 'function') {
        const parser = new PDFParse({ data: fileBuffer });
        try {
          const parsed = await parser.getText();
          return {
            fullText: parsed?.text ? String(parsed.text).trim() : '',
            tables: [],
            formulas: [],
            metadata: {
              title: null,
              abstract: null,
              authors: [],
              year: null,
              page_count: parsed?.numpages || 0,
            },
          };
        } finally {
          if (typeof parser.destroy === 'function') {
            await parser.destroy();
          }
        }
      }
    } catch (e) {
      console.warn(`[OcrExtractionService] PDFParse fallback note: ${e.message}`);
    }

    // Binary text scraper as ultimate fallback
    const rawString = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 500000));
    // eslint-disable-next-line no-control-regex
    const sanitized = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
    return {
      fullText: sanitized,
      tables: [],
      formulas: [],
      metadata: {
        title: null,
        abstract: null,
        authors: [],
        year: null,
        page_count: 0,
      },
    };
  }
}

export const ocrExtractionService = new OcrExtractionService();
export default ocrExtractionService;
