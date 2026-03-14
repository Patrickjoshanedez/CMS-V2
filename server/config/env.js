import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

/**
 * Centralized environment configuration.
 * All env vars are accessed here — never use process.env directly in modules.
 * Throws on startup if critical vars are missing.
 */
const requiredVars = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // OTP
  OTP_EXPIRES_MINUTES: parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10,

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@cms-buksu.edu.ph',

  // Client
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // AWS S3 (Cloud Storage — LocalStack for dev, real AWS for prod)
  S3_BUCKET: process.env.S3_BUCKET || 'cms-buksu-uploads',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || 'test',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || 'test',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '', // e.g. http://localhost:4566 for LocalStack
  S3_FORCE_PATH_STYLE:
    process.env.S3_FORCE_PATH_STYLE === 'true' ||
    (process.env.NODE_ENV || 'development') === 'development',

  // Redis (BullMQ)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Plagiarism / Copyleaks (empty = fallback mock mode)
  COPYLEAKS_EMAIL: process.env.COPYLEAKS_EMAIL || '',
  COPYLEAKS_API_KEY: process.env.COPYLEAKS_API_KEY || '',

  // reCAPTCHA v2
  RECAPTCHA_ENABLED: parseBoolean(process.env.RECAPTCHA_ENABLED, true),
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || '',

  // Google OAuth2 credentials (from Google Cloud Console + OAuth Playground)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  // Accepts both REDIRECT_URI and GOOGLE_REDIRECT_URI for flexibility
  GOOGLE_REDIRECT_URI: process.env.REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '',
  // Accepts both REFRESH_TOKEN and GOOGLE_REFRESH_TOKEN for flexibility
  GOOGLE_REFRESH_TOKEN: process.env.REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || '',

  // Legacy service account vars — kept as empty fallback so old configs don't crash
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: (
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  ).replace(/\\n/g, '\n'),

  // Root Drive folder for all CMS-managed files
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',

  // Drive folder for finalized capstone document storage (alongside S3)
  // Instructor bulk-archives and Cap4 final submissions are stored here
  GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID: process.env.GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID || '',

  // Single Google Drive template folder for the full paper template
  GOOGLE_DRIVE_TEMPLATE_FOLDER_ID: process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID || '',

  // Upload limits
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 25,
  MAX_PROTOTYPE_SIZE_MB: parseInt(process.env.MAX_PROTOTYPE_SIZE_MB, 10) || 50,

  // Helpers
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
});

export default env;
