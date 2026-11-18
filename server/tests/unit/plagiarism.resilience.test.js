import { afterEach, describe, it, expect, vi } from 'vitest';
import { hstCircuitBreaker } from '../../jobs/plagiarism.job.js';

describe('Phase 4: Two-Stage Hybrid Plagiarism & Resilient Microservice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('configures opossum circuit breaker with 120s timeout and 50% error threshold', () => {
    expect(hstCircuitBreaker).toBeDefined();
    expect(hstCircuitBreaker.name).toBe('PlagiarismFastAPIBreaker');
    expect(hstCircuitBreaker.options.timeout).toBe(120000);
    expect(hstCircuitBreaker.options.errorThresholdPercentage).toBe(50);
    expect(hstCircuitBreaker.options.resetTimeout).toBe(30000);
  });

  it('circuit breaker catches microservice failure and can be monitored', async () => {
    let tripped = false;
    const testBreaker = new hstCircuitBreaker.constructor(
      async () => {
        throw new Error('FastAPI Down');
      },
      {
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 200,
      },
    );

    testBreaker.on('open', () => {
      tripped = true;
    });

    await expect(testBreaker.fire()).rejects.toThrow('FastAPI Down');
    await expect(testBreaker.fire()).rejects.toThrow();
    expect(testBreaker.opened || tripped).toBe(true);
  });

  it('rejects incomplete hybrid responses and accepts a subsequent complete report', async () => {
    const report = {
      document_id: 'submission-1',
      matches: [],
      composite_score: 0.1,
      dense_score: 0.2,
      sparse_score: 0.2,
      winnowing_score: 0,
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...report, dense_score: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => report });
    vi.stubGlobal('fetch', fetch);

    const request = {
      pythonEngineUrl: 'http://engine.test',
      submissionId: report.document_id,
      text: 'Extracted manuscript text',
      projectId: 'project-1',
    };
    await expect(hstCircuitBreaker.action(request)).rejects.toThrow('invalid hybrid report');
    await expect(hstCircuitBreaker.action(request)).resolves.toEqual(report);
  });

  it('reopens and recovers across three successive engine outages', async () => {
    vi.useFakeTimers();
    const breaker = new hstCircuitBreaker.constructor(hstCircuitBreaker.action, {
      timeout: 100,
      resetTimeout: 30,
      errorThresholdPercentage: 50,
      rollingCountTimeout: 20,
      rollingCountBuckets: 2,
    });
    const request = {
      pythonEngineUrl: 'http://engine.test',
      submissionId: 'submission-1',
      text: 'Extracted manuscript text',
      projectId: 'project-1',
    };
    const response = {
      document_id: request.submissionId,
      matches: [],
      composite_score: 0,
      dense_score: 0,
      sparse_score: 0,
      winnowing_score: 0,
    };
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    try {
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await vi.advanceTimersByTimeAsync(30);
        fetch.mockResolvedValueOnce({ ok: false, status: 503 });
        await expect(breaker.fire(request)).rejects.toThrow('HTTP 503');
        expect(breaker.opened).toBe(true);
        await expect(breaker.fire(request)).rejects.toMatchObject({ code: 'EOPENBREAKER' });

        await vi.advanceTimersByTimeAsync(30);
        fetch.mockResolvedValueOnce({ ok: true, json: async () => response });
        await expect(breaker.fire(request)).resolves.toEqual(response);
        expect(breaker.closed).toBe(true);
      }
      expect(fetch).toHaveBeenCalledTimes(6);
    } finally {
      breaker.shutdown();
      vi.useRealTimers();
    }
  });
});
