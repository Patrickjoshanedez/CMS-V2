/* eslint-disable no-console */
/**
 * Centralized Graceful Shutdown Utility for CMS-V2.
 *
 * Handles SIGTERM and SIGINT sequentially:
 *   1. Stop accepting new incoming HTTP connections (server.close()).
 *   2. Allow up to 10-second drain window for in-flight requests.
 *   3. Disconnect Socket.IO clients (io.disconnectSockets(true)).
 *   4. Pause BullMQ workers and close all active queues.
 *   5. Close Redis publisher and subscriber connections.
 *   6. Close Mongoose ODM connection pool cleanly before exit.
 *
 * @module utils/shutdown
 */
import mongoose from 'mongoose';
import { disconnectSockets } from '../services/socket.service.js';

let isShuttingDown = false;

/**
 * Perform sequential graceful shutdown of all platform resources.
 *
 * @param {string} signal - Signal received (e.g. 'SIGTERM', 'SIGINT')
 * @param {Object} options
 * @param {import('http').Server} [options.server] - HTTP Server instance
 * @param {Object} [options.io] - Socket.IO Server instance
 * @param {Function} [options.closeWorkers] - Async function to stop BullMQ workers
 * @param {Function} [options.closeQueues] - Async function to close BullMQ queues
 * @param {Function} [options.closeRedis] - Async function to close Redis connections
 * @param {mongoose.Connection} [options.mongooseConnection] - Mongoose connection instance
 * @param {Function} [options.extraCleanup] - Optional additional cleanup hook
 * @param {number} [options.timeoutMs=10000] - Force exit safety timeout in ms
 * @param {boolean} [options.exitProcess=true] - Whether to call process.exit (false for tests)
 * @returns {Promise<void>}
 */
export async function gracefulShutdown(signal, options = {}) {
  if (isShuttingDown) {
    console.warn(`[shutdown] Shutdown already in progress. Ignoring duplicate signal ${signal}.`);
    return;
  }
  isShuttingDown = true;
  console.log(`[shutdown] ${signal} received — initiating sequential graceful shutdown...`);

  const {
    server,
    io,
    closeWorkers,
    closeQueues,
    closeRedis,
    mongooseConnection,
    extraCleanup,
    timeoutMs = 10000,
    exitProcess = true,
  } = options;

  let forceExitTimer = null;
  if (exitProcess) {
    forceExitTimer = setTimeout(() => {
      console.error(
        `[shutdown] Graceful shutdown timeout exceeded (${timeoutMs}ms) — forcing exit.`,
      );
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();
  }

  try {
    // 1 & 2. Stop accepting new HTTP connections and drain in-flight requests
    if (server && typeof server.close === 'function') {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            console.error('[shutdown] Error closing HTTP server:', err.message);
          } else {
            console.log('[shutdown] HTTP server closed — in-flight requests drained.');
          }
          resolve();
        });
      });
    }

    // 3. Disconnect Socket.IO clients cleanly
    if (io && typeof io.disconnectSockets === 'function') {
      try {
        io.disconnectSockets(true);
        console.log('[shutdown] Socket.IO clients disconnected.');
      } catch (ioErr) {
        console.warn('[shutdown] Warning disconnecting Socket.IO clients:', ioErr.message);
      }
    } else {
      try {
        disconnectSockets();
      } catch {
        // Fallback
      }
    }

    // 4. Pause and close BullMQ workers and queues
    if (typeof closeWorkers === 'function') {
      try {
        await closeWorkers();
        console.log('[shutdown] Background BullMQ workers stopped.');
      } catch (workerErr) {
        console.error('[shutdown] Error stopping workers:', workerErr.message);
      }
    }

    if (typeof closeQueues === 'function') {
      try {
        await closeQueues();
        console.log('[shutdown] Job queues closed.');
      } catch (queueErr) {
        console.error('[shutdown] Error closing job queues:', queueErr.message);
      }
    }

    // 5. Close Redis publisher and subscriber connections
    if (typeof closeRedis === 'function') {
      try {
        await closeRedis();
        console.log('[shutdown] Redis connections closed.');
      } catch (redisErr) {
        console.error('[shutdown] Error closing Redis:', redisErr.message);
      }
    }

    // 6. Close Mongoose ODM connection pool cleanly
    const conn = mongooseConnection || mongoose.connection;
    if (conn && conn.readyState !== 0 && typeof conn.close === 'function') {
      try {
        await conn.close(false);
        console.log('[shutdown] MongoDB connection pool closed cleanly.');
      } catch (mongoErr) {
        console.error('[shutdown] Error closing MongoDB connection:', mongoErr.message);
      }
    }

    // 7. Extra cleanup (e.g. clearInterval, timers)
    if (typeof extraCleanup === 'function') {
      try {
        await extraCleanup();
      } catch (extraErr) {
        console.warn('[shutdown] Error during extra cleanup:', extraErr.message);
      }
    }

    if (forceExitTimer) {
      clearTimeout(forceExitTimer);
    }
    console.log('[shutdown] Graceful shutdown completed cleanly.');

    if (exitProcess) {
      process.exit(0);
    }
  } catch (err) {
    console.error('[shutdown] Unhandled error during graceful shutdown:', err);
    if (exitProcess) {
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Configure and register OS signal handlers for graceful shutdown.
 *
 * @param {Object} options
 * @returns {(signal: string) => Promise<void>}
 */
export function setupGracefulShutdown(options = {}) {
  const handler = (signal) => gracefulShutdown(signal, options);

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));

  return handler;
}

/**
 * Reset shutdown state (for testing).
 */
export function _resetShutdownState() {
  isShuttingDown = false;
}

export default {
  gracefulShutdown,
  setupGracefulShutdown,
};
