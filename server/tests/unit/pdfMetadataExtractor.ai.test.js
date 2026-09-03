import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const parsePdfMock = vi.fn();
const ollamaGenerateMock = vi.fn();

vi.mock('pdf-parse', () => ({
  default: parsePdfMock,
}));

vi.mock('ollama', () => {
  class Ollama {
    constructor(_options) {
      this.options = _options;
    }

    async generate(payload) {
      return ollamaGenerateMock(payload);
    }
  }

  return {
    Ollama,
    default: { Ollama },
  };
});

describe('pdfMetadataExtractor AI fallback routing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    parsePdfMock.mockReset();
    ollamaGenerateMock.mockReset();

    process.env.PDF_METADATA_ENABLE_GLM_OCR = 'true';
    process.env.PDF_METADATA_GLM_STRATEGY = 'always';
    process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS = 'false';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('routes to GLM OCR and returns enriched metadata when heuristic quality is insufficient', async () => {
    parsePdfMock.mockResolvedValue({
      text: 'Weak source text with sparse structure.',
      numpages: 1,
      info: {},
    });

    ollamaGenerateMock.mockResolvedValue({
      response: JSON.stringify({
        title: 'AI Extracted Title',
        abstract: 'AI Extracted Abstract',
        authors: ['Mock Author'],
      }),
    });

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 weak'));

    expect(ollamaGenerateMock).toHaveBeenCalledTimes(1);
    expect(result.extractionProvider).toBe('glm-ocr');
    expect(result.title).toBe('AI Extracted Title');
    expect(result.abstract).toContain('AI Extracted Abstract');
    expect(result.authors).toEqual(['Mock Author']);
  });

  it('falls back to heuristic result when GLM OCR throws', async () => {
    parsePdfMock.mockResolvedValue({
      text: ['Short title', 'John Doe', 'ABSTRACT', 'Brief abstract.', 'Keywords: testing'].join(
        '\n',
      ),
      numpages: 1,
      info: {},
    });

    ollamaGenerateMock.mockRejectedValue(new Error('Ollama timeout'));

    const { extractPdfMetadata } = await import('../../utils/pdfMetadataExtractor.js');
    const result = await extractPdfMetadata(Buffer.from('%PDF-1.4 weak-fallback'));

    expect(ollamaGenerateMock).toHaveBeenCalledTimes(1);
    expect(result.extractionProvider).toBe('heuristic');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('abstract');
  });
});
