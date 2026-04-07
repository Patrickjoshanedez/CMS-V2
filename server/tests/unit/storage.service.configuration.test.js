import { afterEach, describe, expect, it, vi } from 'vitest';

const buildEnv = (overrides = {}) =>
  Object.freeze({
    NODE_ENV: 'test',
    isProduction: false,
    S3_BUCKET: 'cms-buksu-uploads',
    S3_ACCESS_KEY_ID: 'test-access-key',
    S3_SECRET_ACCESS_KEY: 'test-secret-key',
    ...overrides,
  });

const loadStorageServiceWithEnv = async (envOverrides = {}) => {
  vi.resetModules();

  const mockedEnv = buildEnv(envOverrides);
  const send = vi.fn().mockResolvedValue({ Buckets: [] });

  vi.doMock('../../config/env.js', () => ({ default: mockedEnv }));
  vi.doMock('../../config/storage.js', () => ({
    default: {
      send,
    },
  }));

  const { default: storageService } = await import('../../services/storage.service.js');
  return { storageService, send };
};

describe('StorageService credential configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('wires uploadFile PutObject bucket from env at the command boundary', async () => {
    const configuredBucket = 'cms-buksu-uploads-canary';
    const { storageService, send } = await loadStorageServiceWithEnv({
      S3_BUCKET: configuredBucket,
    });

    const fileBuffer = Buffer.from('sample-pdf-bytes');
    const key = 'archives/projects/project123/chapters/1/v1/chapter1.pdf';

    const result = await storageService.uploadFile(fileBuffer, key, 'application/pdf', {
      projectId: 'project123',
    });

    expect(result).toEqual({ key, bucket: configuredBucket });
    expect(send).toHaveBeenCalledTimes(1);

    const [command] = send.mock.calls[0];
    expect(command.input.Bucket).toBe(configuredBucket);
    expect(command.input.Key).toBe(key);
    expect(command.input.Body).toBe(fileBuffer);
    expect(command.input.ContentType).toBe('application/pdf');
    expect(command.input.Metadata).toEqual({ projectId: 'project123' });
  });

  it('allows production provider-chain mode when static keys are blank', async () => {
    const { storageService, send } = await loadStorageServiceWithEnv({
      NODE_ENV: 'production',
      isProduction: true,
      S3_BUCKET: 'cms-buksu-uploads',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
    });

    expect(storageService.isConfigured).toBe(true);
    expect(() => storageService._validateConfiguration()).not.toThrow();

    const health = await storageService.healthCheck();
    expect(health).toMatchObject({
      healthy: true,
      credentialMode: 'provider-chain',
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejects one-sided static credential configuration', async () => {
    const { storageService } = await loadStorageServiceWithEnv({
      NODE_ENV: 'production',
      isProduction: true,
      S3_BUCKET: 'cms-buksu-uploads',
      S3_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      S3_SECRET_ACCESS_KEY: '',
    });

    expect(storageService.isConfigured).toBe(false);

    let thrownError;
    try {
      storageService._validateConfiguration();
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toMatchObject({
      statusCode: 503,
      code: 'STORAGE_CREDENTIALS_NOT_CONFIGURED',
      isOperational: true,
    });
    expect(thrownError.message).toMatch(/must both be set or both be blank/i);
  });
});
