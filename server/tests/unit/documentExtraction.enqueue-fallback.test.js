import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractFromBuffer: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  enqueueDocumentExtractionJob: vi.fn(),
  getDocumentExtractionQueue: vi.fn(),
  getRedisClient: vi.fn(),
  isRedisAvailable: vi.fn(),
}));

vi.mock('../../modules/documents/document.service.js', () => ({ default: {} }));
vi.mock('../../services/metadataExtraction.service.js', () => ({
  default: { extractFromBuffer: mocks.extractFromBuffer },
}));
vi.mock('../../services/storage.index.js', () => ({
  default: { uploadFile: mocks.uploadFile, deleteFile: mocks.deleteFile },
}));
vi.mock('../../jobs/queue.js', () => ({
  enqueueDocumentExtractionJob: mocks.enqueueDocumentExtractionJob,
  getDocumentExtractionQueue: mocks.getDocumentExtractionQueue,
}));
vi.mock('../../config/redis.js', () => ({
  getRedisClient: mocks.getRedisClient,
  isRedisAvailable: mocks.isRedisAvailable,
}));
vi.mock('../../modules/documents/document.model.js', () => ({ MetadataExtractionFeedback: {} }));

import { extractPdfMetadata } from '../../modules/documents/document.controller.js';

describe('PDF extraction enqueue fallback', () => {
  const result = { title: 'Detected title', authors: [] };

  const makeRequest = (suffix) => ({
    file: {
      buffer: Buffer.from(`%PDF-1.4 ${suffix}`),
      originalname: `${suffix}.pdf`,
      mimetype: 'application/pdf',
    },
    query: { async: 'true' },
    headers: {},
    body: {},
    user: { _id: 'user-123' },
  });

  const makeResponse = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
  };

  const invoke = async (suffix) => {
    const req = makeRequest(suffix);
    const res = makeResponse();
    const next = vi.fn();
    await extractPdfMetadata(req, res, next);
    expect(next).not.toHaveBeenCalled();
    return { req, res };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRedisAvailable.mockReturnValue(true);
    mocks.uploadFile.mockResolvedValue('temp-key');
    mocks.deleteFile.mockResolvedValue(true);
    mocks.extractFromBuffer.mockResolvedValue(result);
  });

  it('falls back synchronously and deletes the temporary upload when enqueue returns null', async () => {
    mocks.enqueueDocumentExtractionJob.mockResolvedValue(null);

    const { res } = await invoke('null-job');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(mocks.deleteFile).toHaveBeenCalledTimes(1);
    expect(mocks.extractFromBuffer).toHaveBeenCalledTimes(1);
  });

  it('falls back synchronously and deletes the temporary upload when enqueue throws', async () => {
    mocks.enqueueDocumentExtractionJob.mockRejectedValue(new Error('queue unavailable'));

    const { res } = await invoke('thrown-job');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(mocks.deleteFile).toHaveBeenCalledTimes(1);
    expect(mocks.extractFromBuffer).toHaveBeenCalledTimes(1);
  });

  it('returns the actual queue job ID and leaves successful uploads for the worker', async () => {
    mocks.enqueueDocumentExtractionJob.mockResolvedValue('actual-queue-job-42');

    const { res } = await invoke('queued-job');

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued', jobId: 'actual-queue-job-42' }),
    );
    expect(mocks.deleteFile).not.toHaveBeenCalled();
    expect(mocks.extractFromBuffer).not.toHaveBeenCalled();
  });

  it('logs temporary cleanup failure and still performs synchronous extraction', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.enqueueDocumentExtractionJob.mockResolvedValue(null);
    mocks.deleteFile.mockRejectedValue(new Error('storage cleanup failed'));

    try {
      const { res } = await invoke('cleanup-failure');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mocks.extractFromBuffer).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('temporary upload cleanup failed'));
    } finally {
      warn.mockRestore();
    }
  });
});
