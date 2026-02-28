import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt (Node 14.10+) for uniform distribution.
 *
 * @returns {string} 6-digit zero-padded string (e.g. "042917")
 */
export const generateOtp = () => {
  const otp = crypto.randomInt(0, 1000000);
  return otp.toString().padStart(6, '0');
};
