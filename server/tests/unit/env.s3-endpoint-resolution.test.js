import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const BASE_DEVELOPMENT_ENV = Object.freeze({
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/cms_v2',
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

const mockDockerRuntime = (isRunningInDocker) => {
  const existsSync = vi.fn((path) => path === '/.dockerenv' && isRunningInDocker);

  vi.doMock('node:fs', () => ({
    default: {
      existsSync,
    },
    existsSync,
  }));
};

const loadEnvWith = async ({ envOverrides = {}, runningInDocker = false } = {}) => {
  vi.resetModules();
  mockDotenv();
  mockDockerRuntime(runningInDocker);
  process.env = buildDevelopmentEnv(envOverrides);
  return (await import('../../config/env.js')).default;
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('dotenv');
  vi.doUnmock('node:fs');
  process.env = { ...originalEnv };
});

describe('env S3 endpoint resolution', () => {
  it('falls back to localhost endpoint on host development runtime when S3_ENDPOINT is unset', async () => {
    const env = await loadEnvWith({
      runningInDocker: false,
    });

    expect(env.S3_ENDPOINT).toBe('http://localhost:4566');
  });

  it('falls back to localstack endpoint in docker development runtime when S3_ENDPOINT is unset', async () => {
    const env = await loadEnvWith({
      runningInDocker: true,
    });

    expect(env.S3_ENDPOINT).toBe('http://localstack:4566');
  });

  it('keeps localhost endpoint on host development runtime', async () => {
    const env = await loadEnvWith({
      runningInDocker: false,
      envOverrides: { S3_ENDPOINT: 'http://localhost:4566' },
    });

    expect(env.S3_ENDPOINT).toBe('http://localhost:4566');
  });

  it('rewrites localhost endpoint to localstack in docker development runtime', async () => {
    const env = await loadEnvWith({
      runningInDocker: true,
      envOverrides: { S3_ENDPOINT: 'http://localhost:4566' },
    });

    expect(env.S3_ENDPOINT).toBe('http://localstack:4566');
  });

  it('uses S3_DOCKER_LOCALSTACK_HOST override for docker endpoint rewrite', async () => {
    const env = await loadEnvWith({
      runningInDocker: true,
      envOverrides: {
        S3_ENDPOINT: 'http://localhost:4566',
        S3_DOCKER_LOCALSTACK_HOST: 'localstack-internal',
      },
    });

    expect(env.S3_ENDPOINT).toBe('http://localstack-internal:4566');
  });

  it('forces rewrite when S3_DOCKER_MODE=true even without /.dockerenv', async () => {
    const env = await loadEnvWith({
      runningInDocker: false,
      envOverrides: {
        S3_ENDPOINT: 'http://localhost:4566',
        S3_DOCKER_MODE: 'true',
      },
    });

    expect(env.S3_ENDPOINT).toBe('http://localstack:4566');
  });

  it('keeps explicit non-loopback endpoint unchanged in docker development runtime', async () => {
    const explicitEndpoint = 'http://minio:9000';
    const env = await loadEnvWith({
      runningInDocker: true,
      envOverrides: { S3_ENDPOINT: explicitEndpoint },
    });

    expect(env.S3_ENDPOINT).toBe(explicitEndpoint);
  });
});
