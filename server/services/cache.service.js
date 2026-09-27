/**
 * Cache Service — Redis-backed caching with resilient in-memory TTL fallback.
 *
 * Implements:
 * - Distributed Redis caching when Redis is healthy
 * - Local in-memory Map fallback with automatic TTL expiration when Redis is unavailable (e.g. test env)
 * - Invalidation helpers for project metadata and relational trees
 */

import { getRedisClient, isRedisAvailable } from '../config/redis.js';

class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 120) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const memoryFallback = new MemoryCacheFallback();

export const cacheService = {
  /**
   * Retrieve a cached object by key.
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        if (client) {
          const raw = await client.get(key);
          if (raw) return JSON.parse(raw);
        }
      }
    } catch (err) {
      console.warn(
        `[CacheService] Redis get failed for ${key}, falling back to memory:`,
        err.message,
      );
    }
    return memoryFallback.get(key);
  },

  /**
   * Set a cached value with TTL in seconds (default: 120s).
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds=120]
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds = 120) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        if (client) {
          await client.setex(key, ttlSeconds, JSON.stringify(value));
          return;
        }
      }
    } catch (err) {
      console.warn(
        `[CacheService] Redis set failed for ${key}, falling back to memory:`,
        err.message,
      );
    }
    memoryFallback.set(key, value, ttlSeconds);
  },

  /**
   * Delete a cached key.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        if (client) {
          await client.del(key);
        }
      }
    } catch (err) {
      console.warn(`[CacheService] Redis del failed for ${key}:`, err.message);
    }
    memoryFallback.del(key);
  },

  /**
   * Invalidate all keys matching a wildcard pattern (e.g. "project:meta:*").
   * @param {string} pattern
   * @returns {Promise<void>}
   */
  async delPattern(pattern) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        if (client) {
          const keys = await client.keys(pattern);
          if (keys && keys.length > 0) {
            await client.del(...keys);
          }
        }
      }
    } catch (err) {
      console.warn(`[CacheService] Redis delPattern failed for ${pattern}:`, err.message);
    }
    memoryFallback.delPattern(pattern);
  },

  /**
   * Retrieve cached value or execute factory function and cache result.
   * @param {string} key
   * @param {Function} factoryFn
   * @param {number} [ttlSeconds=120]
   * @returns {Promise<any>}
   */
  async getOrSet(key, factoryFn, ttlSeconds = 120) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const fresh = await factoryFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  },

  /**
   * Invalidate cached project metadata.
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async invalidateProject(projectId) {
    if (!projectId) return;
    const strId = projectId.toString();
    await Promise.all([
      this.del(`project:meta:${strId}`),
      this.delPattern(`project:meta:${strId}:*`),
    ]);
  },
};

export default cacheService;
