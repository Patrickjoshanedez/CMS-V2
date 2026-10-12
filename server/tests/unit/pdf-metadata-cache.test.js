import { describe, it, expect, vi, beforeEach } from 'vitest';
import cacheService from '../../services/cache.service.js';
import {
  buildExtractionCacheKey,
  getCachedExtraction,
  setCachedExtraction,
} from '../../utils/pdfMetadataExtractor.js';

describe('PDF Metadata Distributed Cache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate properly formatted cache keys', () => {
    const key = buildExtractionCacheKey('testhash123');
    expect(key).toContain('v2:testhash123:paddleocr-vl');
  });

  it('should store and retrieve cached metadata using cacheService', async () => {
    const sampleMetadata = { title: 'Extracted Title', abstract: 'Extracted Abstract' };
    const key = 'test-cache-key-1';

    await setCachedExtraction(key, sampleMetadata);
    const cached = await getCachedExtraction(key);

    expect(cached).toEqual(sampleMetadata);
  });

  it('should query cacheService with prefixed key', async () => {
    const sampleMetadata = { title: 'Prefixed Test' };
    const key = 'hash999';

    const getSpy = vi.spyOn(cacheService, 'get').mockResolvedValue(sampleMetadata);
    const result = await getCachedExtraction(key);

    expect(getSpy).toHaveBeenCalledWith(`pdf:extract:${key}`);
    expect(result).toEqual(sampleMetadata);
  });

  it('should save to cacheService with prefixed key and ttl', async () => {
    const sampleMetadata = { title: 'Save Test' };
    const key = 'hash888';

    const setSpy = vi.spyOn(cacheService, 'set').mockResolvedValue();
    await setCachedExtraction(key, sampleMetadata);

    expect(setSpy).toHaveBeenCalledWith(`pdf:extract:${key}`, sampleMetadata, expect.any(Number));
  });

  it('should fall back to in-memory extraction cache if cacheService throws', async () => {
    const sampleMetadata = { title: 'Fallback Test' };
    const key = 'fallback-key';

    vi.spyOn(cacheService, 'set').mockRejectedValue(new Error('Redis connection lost'));
    vi.spyOn(cacheService, 'get').mockRejectedValue(new Error('Redis connection lost'));

    await setCachedExtraction(key, sampleMetadata);
    const result = await getCachedExtraction(key);

    expect(result).toEqual(sampleMetadata);
  });
});
