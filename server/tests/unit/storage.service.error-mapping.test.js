import { afterEach, describe, expect, it, vi } from 'vitest';
import storageService from '../../services/storage.service.js';

describe('StorageService network error mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps wrapped ECONNREFUSED errors to STORAGE_CONNECTION_ERROR', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const connectionError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:4566'), {
      code: 'ECONNREFUSED',
    });
    const aggregateError = new AggregateError([connectionError], 'All connection attempts failed');

    const mapped = storageService._handleS3Error(aggregateError, 'uploadFile');

    expect(mapped.statusCode).toBe(503);
    expect(mapped.code).toBe('STORAGE_CONNECTION_ERROR');
    expect(mapped.isOperational).toBe(true);
  });

  it('maps fetch-failed style errors to STORAGE_CONNECTION_ERROR', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const fetchFailed = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNRESET'), { code: 'ECONNRESET' }),
    });

    const mapped = storageService._handleS3Error(fetchFailed, 'uploadFile');

    expect(mapped.statusCode).toBe(503);
    expect(mapped.code).toBe('STORAGE_CONNECTION_ERROR');
    expect(mapped.isOperational).toBe(true);
  });
});
