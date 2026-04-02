import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';
const shouldBypassLimiter = () => process.env.NODE_ENV === 'test';

const createLimiter = (windowMs, productionMax, developmentMax) =>
  rateLimit({
    windowMs,
    max: isProduction ? productionMax : developmentMax,
    skip: shouldBypassLimiter,
    standardHeaders: true,
    legacyHeaders: false,
  });

/** General API rate limiter: 100 requests per 15 minutes per IP (1000 in dev) */
export const generalLimiter = createLimiter(15 * 60 * 1000, 100, 1000);

/** Auth route limiter: 10 requests per 15 minutes per IP (200 in dev) */
export const authLimiter = createLimiter(15 * 60 * 1000, 10, 200);

/** OTP request limiter: 3 requests per 10 minutes per IP (50 in dev) */
export const otpLimiter = createLimiter(10 * 60 * 1000, 3, 50);
