import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const BASE_PRODUCTION_ENV = Object.freeze({
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://example:27017/cms_v2',
  JWT_ACCESS_SECRET: 'ProdAccessSecret123!',
  JWT_REFRESH_SECRET: 'ProdRefreshSecret123!',
  REDIS_PASSWORD: 'ProdRedisPassword123!',
  CLIENT_URL: 'https://cms-buksu.edu.ph',
  CORS_ALLOWED_ORIGINS: 'https://cms-buksu.edu.ph',
  S3_BUCKET: '',
  S3_ENDPOINT: '',
  S3_ACCESS_KEY_ID: '',
  S3_SECRET_ACCESS_KEY: '',
  ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE: 'false',
});

const buildProductionEnv = (overrides = {}) => ({
  ...BASE_PRODUCTION_ENV,
  ...overrides,
});

const loadEnvWith = async (overrides = {}) => {
  vi.resetModules();
  vi.doMock('dotenv', () => ({
    default: {
      config: vi.fn(),
    },
  }));
  process.env = buildProductionEnv(overrides);
  return (await import('../../config/env.js')).default;
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('dotenv');
  process.env = { ...originalEnv };
});

describe('env production S3 bucket guard', () => {
  it('defaults production bucket to cms-buksu-uploads when S3_BUCKET is blank', async () => {
    const env = await loadEnvWith({
      S3_BUCKET: '',
      ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE: 'false',
    });
    expect(env.S3_BUCKET).toBe('cms-buksu-uploads');
  });

  it('rejects non-default production bucket unless override flag is enabled', async () => {
    await expect(
      loadEnvWith({
        S3_BUCKET: 'other-production-bucket',
        ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE: 'false',
      }),
    ).rejects.toThrow(/S3_BUCKET must be "cms-buksu-uploads"/);
  });

  it('allows explicit non-default production bucket when override flag is true', async () => {
    const env = await loadEnvWith({
      S3_BUCKET: 'other-production-bucket',
      ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE: 'true',
    });

    expect(env.S3_BUCKET).toBe('other-production-bucket');
    expect(env.ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE).toBe(true);
  });
});
