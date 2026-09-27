import bcrypt from 'bcrypt';

/**
 * Worker thread task for offloading CPU-intensive Bcrypt hashing and comparisons.
 * Executed inside Piscina worker threads to ensure the Node.js event loop remains unblocked.
 *
 * @param {Object} payload
 * @param {'compare'|'hash'} [payload.action]
 * @param {string} payload.plainPassword
 * @param {string} [payload.hashedPassword]
 * @param {number} [payload.saltRounds]
 * @returns {Promise<boolean|string>}
 */
export default async function cryptoTask(payload) {
  const defaultRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10;
  const { action, plainPassword, hashedPassword, saltRounds = defaultRounds } = payload;

  if (action === 'hash' || (!hashedPassword && saltRounds)) {
    const rounds = Number(saltRounds) || defaultRounds;
    const salt = await bcrypt.genSalt(rounds);
    return bcrypt.hash(plainPassword, salt);
  }

  // Default is compare verification
  if (hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  throw new Error(
    'Invalid cryptoTask payload: plainPassword and hashedPassword (or action="hash") required.',
  );
}
