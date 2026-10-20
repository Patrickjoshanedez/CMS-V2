/**
 * dbTransaction.js — Optional transaction wrapper for MongoDB/Mongoose operations.
 *
 * Provides safe ACID transaction execution when connected to a replica set or sharded cluster,
 * with deterministic fallback to direct execution when running on a standalone instance
 * (e.g., local dev without rs0 or in-memory unit tests).
 */
import mongoose from 'mongoose';

let cachedSupportsTransactions = null;

/**
 * Check if the active Mongoose / MongoDB deployment supports multi-document transactions.
 * @returns {boolean}
 */
export function supportsTransactions() {
  if (cachedSupportsTransactions !== null) return cachedSupportsTransactions;
  try {
    const client = mongoose.connection?.client;
    if (!client) return false;
    const description = client.topology?.description;
    if (!description) return false;
    const type = description.type;
    const supported =
      type === 'ReplicaSetWithPrimary' || type === 'Sharded' || type === 'LoadBalanced';
    if (mongoose.connection.readyState === 1) {
      cachedSupportsTransactions = supported;
    }
    return supported;
  } catch {
    return false;
  }
}

/**
 * Reset transaction support cache (useful in tests when switching connection types).
 */
export function resetTransactionSupportCache() {
  cachedSupportsTransactions = null;
}

/**
 * Execute a unit of work within an optional Mongoose transaction session.
 * If transactions are supported, creates a session, starts a transaction, passes
 * the session to `fn(session)`, and commits on completion (or aborts on error).
 * If transactions are not supported, executes `fn(null)` directly without a session.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession|null) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withOptionalTransaction(fn) {
  if (!supportsTransactions()) {
    return await fn(null);
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch {
    // If starting a session fails, fall back to direct execution
    cachedSupportsTransactions = false;
    return await fn(null);
  }

  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch {
      // Non-fatal abort failure
    }
    throw err;
  } finally {
    try {
      await session.endSession();
    } catch {
      // Non-fatal end session failure
    }
  }
}

export default {
  supportsTransactions,
  resetTransactionSupportCache,
  withOptionalTransaction,
};
