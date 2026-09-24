import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ocrExtractionService from '../../services/ocrExtraction.service.js';

describe('OcrExtractionService', () => {
  const samplePdfBuffer = Buffer.from('%PDF-1.4 sample content');

  beforeEach(() => {
    vi.restoreAllMocks();
    ocrExtractionService._lastFailureTime = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ocrExtractionService._lastFailureTime = 0;
  });

  it('parses document successfully when microservice returns 200 OK', async () => {
    const mockApiResponse = {
      full_text: '# Capstone Title\n\nAbstract content\n\n| Col1 | Col2 |\n|---|---|\n| A | B |',
      tables: [
        {
          page: 1,
          markdown: '| Col1 | Col2 |',
          rows: [
            ['Col1', 'Col2'],
            ['A', 'B'],
          ],
        },
      ],
      formulas: [{ page: 1, latex: 'E = mc^2' }],
      metadata: {
        title: 'Capstone Title',
        abstract: 'Abstract content',
        authors: ['Patrick Josh Añedez'],
        year: 2026,
        page_count: 1,
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    });

    const result = await ocrExtractionService.parseDocument(samplePdfBuffer, 'application/pdf');

    expect(result.ocrStatus).toBe('complete');
    expect(result.fullText).toContain('# Capstone Title');
    expect(result.tables.length).toBe(1);
    expect(result.formulas.length).toBe(1);
    expect(result.metadata.title).toBe('Capstone Title');
    expect(result.metadata.year).toBe(2026);
  });

  it('engages graceful local fallback when microservice returns HTTP 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await ocrExtractionService.parseDocument(samplePdfBuffer, 'application/pdf');

    expect(result.ocrStatus).toBe('degraded');
    expect(result.error).toContain('HTTP 500');
    expect(typeof result.fullText).toBe('string');
  });

  it('engages graceful local fallback when microservice times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('AbortError: Request timed out'));

    const result = await ocrExtractionService.parseDocument(samplePdfBuffer, 'application/pdf');

    expect(result.ocrStatus).toBe('degraded');
    expect(result.error).toContain('timed out');
    expect(typeof result.fullText).toBe('string');
  });

  it('checks health accurately', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true });
    const isHealthy = await ocrExtractionService.checkHealth();
    expect(isHealthy).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));
    const isUnhealthy = await ocrExtractionService.checkHealth();
    expect(isUnhealthy).toBe(false);
  });
});
