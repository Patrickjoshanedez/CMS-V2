import { describe, it, expect, vi } from 'vitest';
import { hstCircuitBreaker } from '../../jobs/plagiarism.job.js';

describe('Phase 4: Two-Stage Hybrid Plagiarism & Resilient Microservice', () => {
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
});
