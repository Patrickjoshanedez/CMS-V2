import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Generate a JWT access token.
 *
 * @param {Object} payload - Data to embed in the token (userId, role)
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

/**
 * Generate a cryptographically random refresh token string.
 * This token is stored hashed in the database and sent to the client in an HTTP-only cookie.
 *
 * @returns {string} Random hex string (64 chars)
 */
export const generateRefreshTokenString = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a refresh token for secure database storage.
 * We never store raw refresh tokens — only their SHA-256 hash.
 *
 * @param {string} token - Raw refresh token string
 * @returns {string} SHA-256 hex digest
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify and decode a JWT access token.
 *
 * @param {string} token - JWT string
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Calculate the expiry date for a refresh token.
 *
 * @returns {Date} Expiry date (7 days from now by default)
 */
export const getRefreshTokenExpiry = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Default to 7 days if format is unexpected
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  };

  return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
};
