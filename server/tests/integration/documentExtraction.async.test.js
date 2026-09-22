import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { createAuthenticatedUserWithRole } from '../helpers.js';

vi.mock('../../jobs/queue.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    enqueueDocumentExtractionJob: vi.fn().mockResolvedValue('mock-job-12345'),
    getDocumentExtractionQueue: vi.fn().mockReturnValue({
      getJob: vi.fn().mockImplementation((jobId) => {
        if (jobId === 'mock-job-12345') {
          return {
            id: jobId,
            getState: vi.fn().mockResolvedValue('completed'),
            progress: 100,
            returnvalue: {
              metadata: {
                title: 'Asynchronous Document Ingestion via BullMQ',
                abstract: 'This paper evaluates real-time asynchronous background extraction.',
                authors: 'Test Proponent',
                year: '2026',
                doi: '',
                venue: '',
                keywords: 'asynchronous, bullmq',
              },
              confidence: {
                title: 95,
                abstract: 90,
                authors: 85,
                year: 90,
                doi: 0,
                venue: 0,
                keywords: 80,
              },
              ocrStatus: 'complete',
            },
          };
        }
        if (jobId === 'mock-active-job') {
          return {
            id: jobId,
            getState: vi.fn().mockResolvedValue('active'),
            progress: 40,
          };
        }
        return null;
      }),
    }),
  };
});

vi.mock('../../config/redis.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isRedisAvailable: vi.fn().mockReturnValue(true),
    getRedisClient: vi.fn().mockReturnValue({
      get: vi.fn().mockImplementation((key) => {
        if (key === 'extraction:job:cached-job-789') {
          return JSON.stringify({
            status: 'completed',
            progress: 100,
            data: {
              metadata: {
                title: 'Cached Extraction Title',
                abstract: 'Cached abstract description.',
                authors: 'Cached Author',
                year: '2026',
                doi: '',
                venue: '',
                keywords: 'cache, redis',
              },
              confidence: { title: 98, abstract: 95 },
            },
            jobId: 'cached-job-789',
          });
        }
        return null;
      }),
    }),
  };
});

vi.mock('../../services/storage.index.js', () => ({
  default: {
    uploadFile: vi.fn().mockResolvedValue({ key: 'mock-key' }),
    downloadFile: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock content')),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

const createPdfBuffer = () => Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

describe('Document Extraction Async & Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues a BullMQ extraction job and returns HTTP 202 when async=true', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor-async-extract@test.com',
    });

    const res = await agent
      .post('/api/documents/extract-pdf-metadata?async=true')
      .attach('file', createPdfBuffer(), 'sample-paper.pdf');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('queued');
    expect(res.body).toHaveProperty('jobId');
    expect(res.body.message).toContain('enqueued successfully');
  });

  it('polls completed extraction job status from BullMQ queue', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor-poll-extract@test.com',
    });

    const res = await agent.get('/api/documents/extraction-status/mock-job-12345');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.progress).toBe(100);
    expect(res.body.data.metadata.title).toBe('Asynchronous Document Ingestion via BullMQ');
  });

  it('polls active processing status with progress from BullMQ queue', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor-poll-active@test.com',
    });

    const res = await agent.get('/api/documents/extraction-status/mock-active-job');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
    expect(res.body.progress).toBe(40);
  });

  it('retrieves cached extraction from Redis', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor-poll-redis@test.com',
    });

    const res = await agent.get('/api/documents/extraction-status/cached-job-789');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.data.metadata.title).toBe('Cached Extraction Title');
  });

  it('returns HTTP 404 when extraction job is unknown', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor-poll-404@test.com',
    });

    const res = await agent.get('/api/documents/extraction-status/unknown-job-id');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EXTRACTION_JOB_NOT_FOUND');
  });
});
