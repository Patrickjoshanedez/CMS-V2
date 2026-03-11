import rateLimit from 'express-rate-limit';

/**
 * Rate limiter configurations.
 * Aggressive limits on auth routes to mitigate brute-force and spam-OTP attacks.
 * More lenient limits on general API routes.
 *
 * In development and test environments, limits are raised to avoid false 429 failures
 * while still exercising the middleware stack.
 */

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/** General API rate limiter: 100 requests per 15 minutes per IP (1000 in dev) */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      status: 429,
    },
  },
});

/** Auth route limiter: 10 requests per 15 minutes per IP (200 in dev) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      status: 429,
    },
  },
});

/** OTP request limiter: 3 requests per 10 minutes per IP (50 in dev) */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDevelopment ? 50 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please wait before requesting a new code.',
      status: 429,
    },
  },
});
