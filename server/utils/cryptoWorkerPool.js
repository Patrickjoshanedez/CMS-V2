import { Piscina } from 'piscina';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const availableCores =
  typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus()?.length || 4;

export const cryptoPool = new Piscina({
  filename: path.resolve(__dirname, 'cryptoTask.js'),
  minThreads: 2,
  maxThreads: Math.max(2, Math.floor(availableCores)),
  maxQueue: 250, // Rejects excess tasks with HTTP 503 during traffic spikes
});

/**
 * Offloaded password verification via worker thread pool.
 *
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  try {
    return await cryptoPool.run({ action: 'compare', plainPassword, hashedPassword });
  } catch (err) {
    if (err.name === 'PiscinaQueueFullError' || err.message?.includes('Queue is full')) {
      const error = new Error('Authentication gateway saturated. Please retry.');
      error.statusCode = 503;
      error.retryAfter = 5;
      throw error;
    }

    // Resilient fallback in case worker environment cannot spawn threads
    if (err.code === 'ERR_WORKER_UNSUPPORTED' || err.message?.includes('Worker threads')) {
      return bcrypt.compare(plainPassword, hashedPassword);
    }

    throw err;
  }
}

/**
 * Offloaded password hashing via worker thread pool.
 *
 * @param {string} plainPassword
 * @param {number} [saltRounds=10]
 * @returns {Promise<string>}
 */
export async function hashPassword(
  plainPassword,
  saltRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10,
) {
  try {
    return await cryptoPool.run({ action: 'hash', plainPassword, saltRounds });
  } catch (err) {
    if (err.name === 'PiscinaQueueFullError' || err.message?.includes('Queue is full')) {
      const error = new Error('Authentication gateway saturated. Please retry.');
      error.statusCode = 503;
      error.retryAfter = 5;
      throw error;
    }

    // Resilient fallback in case worker environment cannot spawn threads
    if (err.code === 'ERR_WORKER_UNSUPPORTED' || err.message?.includes('Worker threads')) {
      const salt = await bcrypt.genSalt(saltRounds);
      return bcrypt.hash(plainPassword, salt);
    }

    throw err;
  }
}

export default {
  cryptoPool,
  verifyPassword,
  hashPassword,
};
