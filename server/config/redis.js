/* eslint-disable no-console */
/**
 * Redis connection configuration for BullMQ job queues.
 *
 * Uses ioredis under the hood. In test environments or when Redis is
 * unavailable, callers should check `isRedisAvailable` before enqueuing.
 */
import Redis from 'ioredis';
import env from './env.js';

/**
 * Build the ioredis connection options.
 * BullMQ expects either a Redis instance or connection opts object.
 */
const redisConnectionOpts = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  // Retry strategy: exponential back-off up to 3 seconds
  retryStrategy(times) {
    if (times > 10) return null; // Stop retrying after 10 attempts
    return Math.min(times * 200, 3000);
  },
};

/** Shared Redis connection for BullMQ queues and workers. */
let redisClient = null;
let redisAvailable = false;

/**
 * Initialize the Redis client. Called once at startup.
 * If Redis is unreachable (e.g. test env), sets redisAvailable = false.
 * @returns {Promise<void>}
 */
export async function initRedis() {
  // Skip Redis in test environment
  if (env.NODE_ENV === 'test') {
    redisAvailable = false;
    return;
  }

  try {
    redisClient = new Redis(redisConnectionOpts);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 5000);

      redisClient.on('ready', () => {
        clearTimeout(timeout);
        redisAvailable = true;
        console.log(`[Redis] Connected to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
        resolve();
      });

      redisClient.on('error', (err) => {
        clearTimeout(timeout);
        // Don't crash — just log and set unavailable
        console.warn(`[Redis] Connection error: ${err.message}`);
        redisAvailable = false;
        resolve(); // resolve (not reject) so the app still starts
      });
    });
  } catch {
    console.warn('[Redis] Failed to initialize — job queues will use fallback mode.');
    redisAvailable = false;
  }
}

/** Check whether Redis is connected and functional. */
export function isRedisAvailable() {
  return redisAvailable;
}

/** Get the shared Redis connection options for BullMQ Queue/Worker constructors. */
export function getRedisConnectionOpts() {
  return redisConnectionOpts;
}

/** Get the raw ioredis client (may be null if unavailable). */
export function getRedisClient() {
  return redisClient;
}

/**
 * Gracefully close the Redis connection (used during shutdown).
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisAvailable = false;
  }
}

export default {
  initRedis,
  isRedisAvailable,
  getRedisConnectionOpts,
  getRedisClient,
  closeRedis,
};
