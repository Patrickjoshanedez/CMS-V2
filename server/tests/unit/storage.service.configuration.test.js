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
  const publicSend = vi.fn().mockResolvedValue({});
  const publicClient = { send: publicSend };
  const createStorageS3Client = vi.fn(() => publicClient);
  const getSignedUrl = vi
    .fn()
    .mockResolvedValue('http://localhost:9000/cms-buksu-uploads/file.pdf?signature=test');

  vi.doMock('../../config/env.js', () => ({ default: mockedEnv }));
  vi.doMock('../../config/storage.js', () => ({
    default: {
      send,
    },
    createStorageS3Client,
  }));
  vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));

  const { default: storageService } = await import('../../services/storage.service.js');
  return { storageService, send, publicClient, createStorageS3Client, getSignedUrl };
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

  it('signs browser-facing MinIO URLs with the browser-facing host', async () => {
    const { storageService, send, publicClient, createStorageS3Client, getSignedUrl } =
      await loadStorageServiceWithEnv({
        S3_ENDPOINT: 'http://minio:9000',
        S3_FORCE_PATH_STYLE: true,
      });

    const signedUrl = await storageService.getSignedUrl('archives/projects/project123/file.pdf');

    expect(createStorageS3Client).toHaveBeenCalledWith('http://localhost:9000');
    expect(send).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(
      publicClient,
      expect.objectContaining({
        input: expect.objectContaining({
          Key: 'archives/projects/project123/file.pdf',
        }),
      }),
      { expiresIn: 300 },
    );
    expect(signedUrl).toBe('http://localhost:9000/cms-buksu-uploads/file.pdf?signature=test');
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
