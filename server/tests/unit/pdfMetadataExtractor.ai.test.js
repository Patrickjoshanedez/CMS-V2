import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const parseDocumentMock = vi.fn();
const parsePdfMock = vi.fn();

vi.mock('../../services/ocrExtraction.service.js', () => ({
  ocrExtractionService: {
    parseDocument: parseDocumentMock,
  },
  default: {
    parseDocument: parseDocumentMock,
  },
}));

vi.mock('pdf-parse', () => ({
  default: parsePdfMock,
  PDFParse: class {
    constructor() {}
    async getText() {
      return parsePdfMock();
    }
    async destroy() {}
  },
}));

describe('pdfMetadataExtractor PaddleOCR-VL routing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    parseDocumentMock.mockReset();
    parsePdfMock.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('routes to PaddleOCR-VL and returns enriched metadata when OCR service succeeds', async () => {
    parseDocumentMock.mockResolvedValue({
      fullText: 'PaddleOCR extracted full manuscript text with rich layout.',
      tables: [],
      formulas: [],
      metadata: {
        title: 'Modern Vision-Language Academic Document Ingestion',
        abstract:
          'This paper presents a complete PaddleOCR-VL parsing pipeline for institutional academic manuscripts.',
        authors: ['Maria Santos', 'Juan Dela Cruz'],
        year: 2026,
        page_count: 5,
      },
      ocrStatus: 'complete',
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 paddle-mock'));

    expect(parseDocumentMock).toHaveBeenCalledTimes(1);
    expect(result.extractionProvider).toBe('paddleocr-vl');
    expect(result.title).toContain('Modern Vision-Language Academic Document Ingestion');
    expect(result.abstract).toContain('PaddleOCR-VL parsing pipeline');
    expect(result.authors).toEqual(['Maria Santos', 'Juan Dela Cruz']);
    expect(result.publicationYear).toBe(2026);
  });

  it('falls back to local heuristic parser when OCR service throws', async () => {
    parseDocumentMock.mockRejectedValue(new Error('Connection refused'));
    parsePdfMock.mockResolvedValue({
      text: [
        'Heuristic Fallback Title Example for Academic Ingestion Pipeline',
        'Ana Reyes, Carlos Tan',
        'ABSTRACT',
        'This is a comprehensive study presenting an automated heuristic metadata extraction fallback pipeline for academic manuscripts.',
        'Keywords: fallback, testing, heuristic',
        '1. Introduction',
      ].join('\n'),
      numpages: 1,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 fallback-mock'));

    expect(parseDocumentMock).toHaveBeenCalledTimes(1);
    expect(result.extractionProvider).toBe('heuristic');
    expect(result.title).toContain('Heuristic Fallback Title Example');
    expect(result.abstract).toContain('heuristic metadata extraction fallback pipeline');
  });
});
