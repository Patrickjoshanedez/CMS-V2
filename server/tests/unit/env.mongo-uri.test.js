import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const BASE_DEVELOPMENT_ENV = Object.freeze({
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://example:27017/cms_v2',
  MONGODB_DEV_FALLBACK_URI: 'mongodb://127.0.0.1:27017/cms_v2',
  JWT_ACCESS_SECRET: 'DevAccessSecret123!',
  JWT_REFRESH_SECRET: 'DevRefreshSecret123!',
});

const buildDevelopmentEnv = (overrides = {}) => ({
  ...BASE_DEVELOPMENT_ENV,
  ...overrides,
});

const mockDotenv = () => {
  vi.doMock('dotenv', () => ({
    default: {
      config: vi.fn(),
    },
  }));
};

const loadEnvWith = async (overrides = {}) => {
  vi.resetModules();
  mockDotenv();
  process.env = buildDevelopmentEnv(overrides);
  return (await import('../../config/env.js')).default;
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('dotenv');
  process.env = { ...originalEnv };
});

describe('env MongoDB URI resolution', () => {
  it('falls back to the development MongoDB URI when the configured host is a placeholder', async () => {
    const env = await loadEnvWith({
      MONGODB_URI: 'mongodb://example:27017/cms_v2',
      MONGODB_DEV_FALLBACK_URI: 'mongodb://127.0.0.1:27017/cms_v2',
    });

    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/cms_v2');
  });

  it('keeps an explicit development MongoDB URI when it is valid', async () => {
    const env = await loadEnvWith({
      MONGODB_URI: 'mongodb://localhost:27017/cms_v2',
    });

    expect(env.MONGODB_URI).toBe('mongodb://localhost:27017/cms_v2');
  });
});
