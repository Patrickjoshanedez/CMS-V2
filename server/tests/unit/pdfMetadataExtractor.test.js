import { describe, it, expect, vi, beforeEach } from 'vitest';

const parsePdfMock = vi.fn();

vi.mock('pdf-parse', () => ({
  default: parsePdfMock,
}));

describe('pdfMetadataExtractor', () => {
  beforeEach(() => {
    parsePdfMock.mockReset();
  });

  it('extracts title, abstract, publicationYear, authors, and keywords from text', async () => {
    parsePdfMock.mockResolvedValue({
      text: [
        'Architecture and Implementation Patterns for Automated Academic PDF Metadata Extraction',
        'Jane Doe, John Smith and Maria Cruz',
        'ABSTRACT',
        'This study proposes a robust metadata extraction pipeline for academic documents.',
        'It combines parsing, validation, and resilient fallback mechanisms.',
        'Keywords: metadata extraction, academic pdf, document parsing, validation',
        'Introduction',
      ].join('\n'),
      numpages: 3,
      info: {
        CreationDate: 'D:20250410120000Z',
      },
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 mock'));

    expect(result.title).toContain('Architecture and Implementation Patterns');
    expect(result.abstract).toContain('robust metadata extraction pipeline');
    expect(result.publicationYear).toBe(2025);
    expect(result.authors).toEqual(['Jane Doe', 'John Smith', 'Maria Cruz']);
    expect(result.keywords).toEqual([
      'metadata extraction',
      'academic pdf',
      'document parsing',
      'validation',
    ]);
    expect(result.extractionProvider).toBe('heuristic');
    expect(result.confidence.title).toBeGreaterThan(0);
    expect(result.confidence.abstract).toBeGreaterThan(0);
    expect(result.confidence.publicationYear).toBeGreaterThan(0);
    expect(result.confidence.authors).toBeGreaterThan(0);
    expect(result.confidence.keywords).toBeGreaterThan(0);
  });

  it('returns safe defaults when text is empty', async () => {
    parsePdfMock.mockResolvedValue({
      text: '',
      numpages: 1,
      info: {},
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 empty'));

    expect(result.title).toBe('');
    expect(result.abstract).toBe('');
    expect(result.publicationYear).toBeNull();
    expect(result.authors).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.extractionProvider).toBe('heuristic');
  });
});
