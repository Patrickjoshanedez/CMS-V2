import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gracefulShutdown, _resetShutdownState } from '../../utils/shutdown.js';

describe('Phase 5: Zero-Downtime Resilience & Graceful Shutdown', () => {
  beforeEach(() => {
    _resetShutdownState();
    vi.clearAllMocks();
  });

  it('sequentially drains HTTP, disconnects sockets, stops workers, closes queues, redis, and mongodb', async () => {
    const callOrder = [];

    const mockServer = {
      close: vi.fn((cb) => {
        callOrder.push('http_server');
        cb();
      }),
    };

    const mockIO = {
      disconnectSockets: vi.fn((closeUnderlying) => {
        callOrder.push(`socket_io_${closeUnderlying}`);
      }),
    };

    const closeWorkers = vi.fn(async () => {
      callOrder.push('workers');
    });

    const closeQueues = vi.fn(async () => {
      callOrder.push('queues');
    });

    const closeRedis = vi.fn(async () => {
      callOrder.push('redis');
    });

    const mockMongoose = {
      readyState: 1,
      close: vi.fn(async () => {
        callOrder.push('mongodb');
      }),
    };

    const extraCleanup = vi.fn(async () => {
      callOrder.push('extra_cleanup');
    });

    await gracefulShutdown('SIGTERM', {
      server: mockServer,
      io: mockIO,
      closeWorkers,
      closeQueues,
      closeRedis,
      mongooseConnection: mockMongoose,
      extraCleanup,
      exitProcess: false,
    });

    expect(callOrder).toEqual([
      'http_server',
      'socket_io_true',
      'workers',
      'queues',
      'redis',
      'mongodb',
      'extra_cleanup',
    ]);

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect(mockIO.disconnectSockets).toHaveBeenCalledWith(true);
    expect(closeWorkers).toHaveBeenCalledTimes(1);
    expect(closeQueues).toHaveBeenCalledTimes(1);
    expect(closeRedis).toHaveBeenCalledTimes(1);
    expect(mockMongoose.close).toHaveBeenCalledWith(false);
    expect(extraCleanup).toHaveBeenCalledTimes(1);
  });

  it('guards against duplicate concurrent shutdown invocations', async () => {
    const mockServer = {
      close: vi.fn((cb) => {
        setTimeout(cb, 10);
      }),
    };

    const closeRedis = vi.fn(async () => {});

    const first = gracefulShutdown('SIGTERM', {
      server: mockServer,
      closeRedis,
      exitProcess: false,
    });

    const second = gracefulShutdown('SIGINT', {
      server: mockServer,
      closeRedis,
      exitProcess: false,
    });

    await Promise.all([first, second]);

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect(closeRedis).toHaveBeenCalledTimes(1);
  });
});
