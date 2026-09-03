import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';
const isTestEnv = () => process.env.NODE_ENV === 'test';
const isTestLimiterEnforced = () => process.env.ENFORCE_RATE_LIMIT_IN_TEST === 'true';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const shouldBypassLimiter = () => isTestEnv() && !isTestLimiterEnforced();

const resolveMax = (productionMax, developmentMax, testMax = developmentMax) => {
  if (isTestEnv()) {
    if (!isTestLimiterEnforced()) {
      return developmentMax;
    }

    return parsePositiveInt(process.env.RATE_LIMIT_TEST_MAX, testMax);
  }

  return isProduction ? productionMax : developmentMax;
};

const createLimiter = (windowMs, productionMax, developmentMax, testMax = developmentMax) =>
  rateLimit({
    windowMs,
    max: () => resolveMax(productionMax, developmentMax, testMax),
    skip: shouldBypassLimiter,
    standardHeaders: true,
    legacyHeaders: false,
  });

/** General API rate limiter: 300 requests per 15 minutes per IP (2000 in dev) */
export const generalLimiter = createLimiter(15 * 60 * 1000, 300, 2000);

/** Auth route limiter: 10 requests per 15 minutes per IP (200 in dev) */
export const authLimiter = createLimiter(15 * 60 * 1000, 10, 200, 10);

/** Login route limiter: 100 requests per 1 minute per IP */
export const loginLimiter = createLimiter(60 * 1000, 100, 100, 100);

/** OTP request limiter: 3 requests per 10 minutes per IP (50 in dev) */
export const otpLimiter = createLimiter(10 * 60 * 1000, 3, 50);

/** Upload limiter: 20 uploads per 15 minutes per IP (200 in dev) */
export const uploadLimiter = createLimiter(15 * 60 * 1000, 20, 200);

/**
 * Read limiter for high-frequency view endpoints (e.g. submission detail + signed URL).
 * 600 req/15 min in production, uncapped in dev.
 */
export const readLimiter = createLimiter(15 * 60 * 1000, 600, 5000);
