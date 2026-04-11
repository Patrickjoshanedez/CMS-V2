import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const mockMongoose = () => {
  const connect = vi.fn();
  const on = vi.fn();

  vi.doMock('mongoose', () => ({
    default: {
      connect,
      connection: {
        on,
      },
    },
  }));

  return { connect, on };
};

const loadConnectDB = async () => {
  vi.resetModules();
  vi.doMock('dotenv', () => ({
    default: {
      config: vi.fn(),
    },
  }));
  process.env = {
    ...originalEnv,
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://mongodb:27017/cms_v2',
    JWT_ACCESS_SECRET: 'DevAccessSecret123!',
    JWT_REFRESH_SECRET: 'DevRefreshSecret123!',
  };

  const { connect } = mockMongoose();
  const { default: connectDB } = await import('../../config/db.js');

  return { connectDB, connect };
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('dotenv');
  vi.doUnmock('mongoose');
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('connectDB retry handling', () => {
  it('retries transient MongoDB DNS failures before giving up', async () => {
    const { connectDB, connect } = await loadConnectDB();
    const transientError = Object.assign(new Error('getaddrinfo EAI_AGAIN mongodb'), {
      code: 'EAI_AGAIN',
    });

    connect
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({
        connection: {
          host: 'mongodb',
          name: 'cms_v2',
        },
      });

    await connectDB();

    expect(connect).toHaveBeenCalledTimes(3);
  });
});