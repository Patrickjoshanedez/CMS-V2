import rateLimit from 'express-rate-limit';

const bypassLimit = (req, res, next) => next();

/** General API rate limiter: 100 requests per 15 minutes per IP (1000 in dev) */
export const generalLimiter = bypassLimit;

/** Auth route limiter: 10 requests per 15 minutes per IP (200 in dev) */
export const authLimiter = bypassLimit;

/** OTP request limiter: 3 requests per 10 minutes per IP (50 in dev) */
export const otpLimiter = bypassLimit;
