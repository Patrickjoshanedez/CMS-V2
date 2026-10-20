import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  supportsTransactions,
  resetTransactionSupportCache,
  withOptionalTransaction,
} from '../../utils/dbTransaction.js';

describe('dbTransaction utility', () => {
  beforeEach(() => {
    resetTransactionSupportCache();
    vi.restoreAllMocks();
  });

  it('correctly detects standalone environment when topology is missing or not a replica set', () => {
    expect(supportsTransactions()).toBe(false);
  });

  it('falls back cleanly to direct execution when transactions are not supported', async () => {
    const callback = vi.fn(async (session) => {
      expect(session).toBeNull();
      return 'direct_result';
    });

    const result = await withOptionalTransaction(callback);
    expect(result).toBe('direct_result');
    expect(callback).toHaveBeenCalledWith(null);
  });

  it('starts session and commits transaction when replica set is simulated', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      inTransaction: vi.fn(() => true),
    };

    // Simulate replica set topology and connection state
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);
    const originalConnection = mongoose.connection;
    Object.defineProperty(mongoose, 'connection', {
      value: {
        readyState: 1,
        client: {
          topology: {
            description: { type: 'ReplicaSetWithPrimary' },
          },
        },
      },
      configurable: true,
    });

    resetTransactionSupportCache();
    expect(supportsTransactions()).toBe(true);

    const callback = vi.fn(async (session) => {
      expect(session).toBe(mockSession);
      return 'transaction_result';
    });

    const result = await withOptionalTransaction(callback);
    expect(result).toBe('transaction_result');
    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();

    // Restore connection
    Object.defineProperty(mongoose, 'connection', {
      value: originalConnection,
      configurable: true,
    });
    resetTransactionSupportCache();
  });

  it('aborts transaction and re-throws if inner callback throws error', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      inTransaction: vi.fn(() => true),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);
    const originalConnection = mongoose.connection;
    Object.defineProperty(mongoose, 'connection', {
      value: {
        readyState: 1,
        client: {
          topology: {
            description: { type: 'ReplicaSetWithPrimary' },
          },
        },
      },
      configurable: true,
    });

    resetTransactionSupportCache();

    const expectedError = new Error('Database write conflict');
    const callback = vi.fn(async () => {
      throw expectedError;
    });

    await expect(withOptionalTransaction(callback)).rejects.toThrow('Database write conflict');
    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();

    Object.defineProperty(mongoose, 'connection', {
      value: originalConnection,
      configurable: true,
    });
    resetTransactionSupportCache();
  });
});
