import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { processDocumentExtractionJob } from '../../jobs/documentExtraction.job.js';
import metadataExtractionService from '../../services/metadataExtraction.service.js';
import storageService from '../../services/storage.index.js';
import * as socketService from '../../services/socket.service.js';
import * as redisConfig from '../../config/redis.js';

vi.mock('../../services/metadataExtraction.service.js', () => ({
  default: {
    extractFromBuffer: vi.fn(),
  },
}));

vi.mock('../../services/storage.index.js', () => ({
  default: {
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('../../services/socket.service.js', () => ({
  emitToUser: vi.fn(),
}));

describe('Document Extraction Worker Retry & Recovery Resilience', () => {
  let mockRedis;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedis = {
      setex: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis);
  });

  it('preserves storage file on non-final failure attempt (attempt 1 of 2)', async () => {
    storageService.downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 test content'));
    storageService.deleteFile.mockResolvedValue(true);
    metadataExtractionService.extractFromBuffer.mockRejectedValue(
      new Error('Transient OCR timeout'),
    );

    const mockJob = {
      id: 'job-retry-1',
      data: {
        storageKey: 'temp-extractions/test-file.pdf',
        originalName: 'test-file.pdf',
        userId: 'user-123',
      },
      opts: { attempts: 2 },
      attemptsMade: 1, // First attempt failed, one more left
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    await expect(processDocumentExtractionJob(mockJob)).rejects.toThrow('Transient OCR timeout');

    // Storage file MUST NOT be deleted so retry attempt 2 can read it
    expect(storageService.deleteFile).not.toHaveBeenCalled();

    // Intermediate failure should NOT cache permanent failed state in Redis
    expect(mockRedis.setex).not.toHaveBeenCalledWith(
      'extraction:job:job-retry-1',
      3600,
      expect.stringContaining('"status":"failed"'),
    );

    // Error notification not sent to user until final attempt fails
    expect(socketService.emitToUser).not.toHaveBeenCalledWith(
      'user-123',
      'ocr:error',
      expect.anything(),
    );
  });

  it('deletes temp file and caches failure on final attempt (attempt 2 of 2)', async () => {
    storageService.downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 test content'));
    storageService.deleteFile.mockResolvedValue(true);
    metadataExtractionService.extractFromBuffer.mockRejectedValue(
      new Error('Permanent OCR failure'),
    );

    const mockJob = {
      id: 'job-retry-2',
      data: {
        storageKey: 'temp-extractions/test-file.pdf',
        originalName: 'test-file.pdf',
        userId: 'user-123',
      },
      opts: { attempts: 2 },
      attemptsMade: 2, // Final attempt reached
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    await expect(processDocumentExtractionJob(mockJob)).rejects.toThrow('Permanent OCR failure');

    // On final attempt, temp file is cleaned up
    expect(storageService.deleteFile).toHaveBeenCalledWith('temp-extractions/test-file.pdf');

    // Permanent failure cached in Redis
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'extraction:job:job-retry-2',
      3600,
      expect.stringContaining('"status":"failed"'),
    );

    // Final error emitted to user
    expect(socketService.emitToUser).toHaveBeenCalledWith(
      'user-123',
      'ocr:error',
      expect.objectContaining({ error: 'Permanent OCR failure' }),
    );
  });

  it('never deletes permanent manuscript files even on final failure attempt', async () => {
    storageService.downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 test content'));
    storageService.deleteFile.mockResolvedValue(true);
    metadataExtractionService.extractFromBuffer.mockRejectedValue(
      new Error('Permanent extraction crash'),
    );

    const mockJob = {
      id: 'job-permanent-1',
      data: {
        storageKey: 'manuscripts/project-456/final-manuscript.pdf', // Permanent storage key
        originalName: 'final-manuscript.pdf',
        userId: 'user-456',
      },
      opts: { attempts: 1 },
      attemptsMade: 1,
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    await expect(processDocumentExtractionJob(mockJob)).rejects.toThrow(
      'Permanent extraction crash',
    );

    // Permanent file must NEVER be deleted
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('completes job successfully, caches result, and cleans up temp extraction file', async () => {
    storageService.downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 test content'));
    storageService.deleteFile.mockResolvedValue(true);
    metadataExtractionService.extractFromBuffer.mockResolvedValue({
      title: 'Automated BukSU Capstone Portal',
      abstract: 'An automated platform...',
      authors: ['Student Lead'],
      keywords: ['capstone', 'react'],
      confidence: { title: 0.95 },
    });

    const mockJob = {
      id: 'job-success-1',
      data: {
        storageKey: 'temp-extractions/success.pdf',
        originalName: 'success.pdf',
        userId: 'user-789',
      },
      opts: { attempts: 2 },
      attemptsMade: 1,
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    const result = await processDocumentExtractionJob(mockJob);

    expect(result).toBeDefined();
    expect(result.title).toBe('Automated BukSU Capstone Portal');
    expect(storageService.deleteFile).toHaveBeenCalledWith('temp-extractions/success.pdf');
    expect(socketService.emitToUser).toHaveBeenCalledWith(
      'user-789',
      'ocr:complete',
      expect.objectContaining({ jobId: 'job-success-1' }),
    );
  });
});
