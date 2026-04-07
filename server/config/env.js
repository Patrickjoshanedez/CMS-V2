import fs from 'node:fs';
import dotenv from 'dotenv';
import { STORAGE_BUCKETS } from '@cms/shared';

dotenv.config();

const currentNodeEnv = process.env.NODE_ENV || 'development';
const isDevelopmentEnv = currentNodeEnv === 'development';
const isProductionEnv = currentNodeEnv === 'production';

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const parseNullableBoolean = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return null;
};

const parsePositiveInteger = (value, defaultValue) => {
  const parsed = parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
};

const parseCookieSameSite = (value, defaultValue = 'strict') => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') {
    return normalized;
  }

  return defaultValue;
};

const DEFAULT_S3_BUCKET = STORAGE_BUCKETS.PRIMARY_UPLOADS;

const resolveS3Bucket = () => {
  const configuredBucket =
    typeof process.env.S3_BUCKET === 'string' ? process.env.S3_BUCKET.trim() : '';
  return configuredBucket || DEFAULT_S3_BUCKET;
};

const PRODUCTION_REQUIRED_SECRET_VARS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'REDIS_PASSWORD',
];
const PRODUCTION_OPTIONAL_SECRET_VARS = ['NGROK_AUTHTOKEN'];
const DEFAULT_LIKE_SECRET_VALUES = new Set([
  'changeme',
  'default',
  'dummy',
  'example',
  'exampletoken',
  'ngroktoken',
  'placeholder',
  'replace',
  'replacewithrealvalue',
  'test',
  'token',
  'yourngroktoken',
  'secret',
  'password',
  'none',
  'null',
  'undefined',
]);

const normalizeSecretToken = (value = '') =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const isDefaultLikeSecret = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return true;
  }

  const normalized = normalizeSecretToken(rawValue);
  if (!normalized) {
    return true;
  }

  if (DEFAULT_LIKE_SECRET_VALUES.has(normalized)) {
    return true;
  }

  if (normalized.length < 8) {
    return true;
  }

  if (/^([a-z0-9])\1{7,}$/.test(normalized)) {
    return true;
  }

  if (/^test\d*$/.test(normalized)) {
    return true;
  }

  if (normalized.startsWith('your') && /(secret|token|password|key)$/.test(normalized)) {
    return true;
  }

  return false;
};

const S3_PLACEHOLDER_VALUES = new Set([
  'changeme',
  'default',
  'dummy',
  'example',
  'localstack',
  'placeholder',
  'replace',
  'test',
]);

const normalizeCredentialToken = (value = '') =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const isPlaceholderS3Credential = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return false;
  }

  const normalized = normalizeCredentialToken(rawValue);
  if (!normalized) {
    return false;
  }

  if (S3_PLACEHOLDER_VALUES.has(normalized)) {
    return true;
  }

  if (/^(test|example|replace)[a-z0-9]*$/.test(normalized)) {
    return true;
  }

  if (normalized.includes('localstack')) {
    return true;
  }

  return false;
};

const validateProductionS3Credentials = () => {
  const rawAccessKey = process.env.S3_ACCESS_KEY_ID;
  const rawSecretKey = process.env.S3_SECRET_ACCESS_KEY;

  const hasAccessKey = typeof rawAccessKey === 'string' && rawAccessKey.trim().length > 0;
  const hasSecretKey = typeof rawSecretKey === 'string' && rawSecretKey.trim().length > 0;

  if (hasAccessKey !== hasSecretKey) {
    throw new Error(
      'In production, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must both be set or both be empty.',
    );
  }

  if (!hasAccessKey) {
    return;
  }

  if (isPlaceholderS3Credential(rawAccessKey)) {
    throw new Error('In production, S3_ACCESS_KEY_ID cannot use placeholder/test values.');
  }

  if (isPlaceholderS3Credential(rawSecretKey)) {
    throw new Error('In production, S3_SECRET_ACCESS_KEY cannot use placeholder/test values.');
  }
};

const validateProductionS3Bucket = () => {
  const resolvedBucket = resolveS3Bucket();
  const allowOverride = parseBoolean(process.env.ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE, false);

  if (resolvedBucket !== DEFAULT_S3_BUCKET && !allowOverride) {
    throw new Error(
      `In production, S3_BUCKET must be "${DEFAULT_S3_BUCKET}" unless ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE=true is explicitly set.`,
    );
  }
};

const validateProductionSecret = (varName, { required = true } = {}) => {
  const rawValue = process.env[varName];

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    if (required) {
      throw new Error(`Missing required production secret environment variable: ${varName}`);
    }
    return;
  }

  if (isDefaultLikeSecret(rawValue)) {
    throw new Error(`Insecure default-like production secret is not allowed for: ${varName}`);
  }
};

const normalizeHostname = (hostname = '') =>
  hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');

const isIpv4LoopbackHost = (hostname = '') => {
  const octets = hostname.split('.');
  if (octets.length !== 4) {
    return false;
  }

  const parsedOctets = octets.map((octet) => Number.parseInt(octet, 10));
  if (
    parsedOctets.some(
      (value, index) =>
        !/^\d+$/.test(octets[index]) || Number.isNaN(value) || value < 0 || value > 255,
    )
  ) {
    return false;
  }

  return parsedOctets[0] === 127;
};

const isIpv6MappedLoopbackHost = (hostname = '') => {
  const markerIndex = hostname.lastIndexOf(':ffff:');
  if (markerIndex === -1) {
    return false;
  }

  const prefix = hostname.slice(0, markerIndex);
  const compactPrefix = prefix.replace(/:/g, '');
  if (compactPrefix.length > 0 && /[^0]/.test(compactPrefix)) {
    return false;
  }

  const mappedPart = hostname.slice(markerIndex + ':ffff:'.length);
  if (isIpv4LoopbackHost(mappedPart)) {
    return true;
  }

  const mappedHexWords = mappedPart.split(':');
  if (mappedHexWords.length !== 2) {
    return false;
  }

  if (!mappedHexWords.every((word) => /^[0-9a-f]{1,4}$/.test(word))) {
    return false;
  }

  const upperWord = Number.parseInt(mappedHexWords[0], 16);
  return ((upperWord >> 8) & 0xff) === 127;
};

const isIpv6LoopbackHost = (hostname = '') => {
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
    return true;
  }

  return isIpv6MappedLoopbackHost(hostname);
};

const isLoopbackHost = (hostname = '') => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return false;
  }

  return (
    normalized === 'localhost' || isIpv4LoopbackHost(normalized) || isIpv6LoopbackHost(normalized)
  );
};

const isRunningInDocker = () => {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
};

const shouldUseDockerS3EndpointRewrite = () => {
  if (parseBoolean(process.env.S3_DOCKER_MODE, false)) {
    return true;
  }

  return isRunningInDocker();
};

const resolveEndpointPathname = (rawEndpoint, parsedEndpoint) => {
  const protocolIndex = rawEndpoint.indexOf('://');
  const authorityStart = protocolIndex === -1 ? 0 : protocolIndex + 3;
  const slashIndex = rawEndpoint.indexOf('/', authorityStart);

  if (slashIndex === -1 && parsedEndpoint.pathname === '/') {
    return '';
  }

  return parsedEndpoint.pathname;
};

const formatResolvedEndpoint = (rawEndpoint, parsedEndpoint) => {
  const authSegment =
    parsedEndpoint.username.length > 0
      ? `${parsedEndpoint.username}${
          parsedEndpoint.password.length > 0 ? `:${parsedEndpoint.password}` : ''
        }@`
      : '';
  const pathname = resolveEndpointPathname(rawEndpoint, parsedEndpoint);
  const resolvedEndpoint = `${parsedEndpoint.protocol}//${authSegment}${parsedEndpoint.host}${pathname}${parsedEndpoint.search}${parsedEndpoint.hash}`;

  if (rawEndpoint.includes('://')) {
    return resolvedEndpoint;
  }

  return resolvedEndpoint.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '');
};

const resolveS3Endpoint = () => {
  const configuredEndpoint =
    typeof process.env.S3_ENDPOINT === 'string' ? process.env.S3_ENDPOINT.trim() : '';
  const baseEndpoint = configuredEndpoint || (isDevelopmentEnv ? 'http://localhost:4566' : '');

  if (!baseEndpoint || !isDevelopmentEnv || !shouldUseDockerS3EndpointRewrite()) {
    return baseEndpoint;
  }

  const endpointToParse = baseEndpoint.includes('://') ? baseEndpoint : `http://${baseEndpoint}`;

  try {
    const parsedEndpoint = new URL(endpointToParse);
    if (!isLoopbackHost(parsedEndpoint.hostname)) {
      return baseEndpoint;
    }

    const dockerLocalstackHost =
      (process.env.S3_DOCKER_LOCALSTACK_HOST || 'localstack').trim() || 'localstack';
    parsedEndpoint.hostname = dockerLocalstackHost;

    return formatResolvedEndpoint(baseEndpoint, parsedEndpoint);
  } catch {
    return baseEndpoint;
  }
};

const isForbiddenProductionS3Endpoint = (endpointValue) => {
  if (typeof endpointValue !== 'string' || endpointValue.trim().length === 0) {
    return false;
  }

  const rawEndpoint = endpointValue.trim();
  const endpointToParse = rawEndpoint.includes('://') ? rawEndpoint : `http://${rawEndpoint}`;

  try {
    const parsed = new URL(endpointToParse);
    const hostname = parsed.hostname.toLowerCase();

    return isLoopbackHost(hostname) || hostname.includes('localstack');
  } catch {
    return rawEndpoint.toLowerCase().includes('localstack');
  }
};

const isLocalhostOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    return isLoopbackHost(hostname);
  } catch {
    return false;
  }
};

const validateProductionCorsOrigins = (origins) => {
  if (origins.length === 0) {
    throw new Error('In production, at least one explicit CORS origin must be configured.');
  }

  for (const origin of origins) {
    if (origin === '*' || origin.includes('*')) {
      throw new Error(`Wildcard CORS origin is not allowed in production: ${origin}`);
    }

    try {
      new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin in production: ${origin}`);
    }

    if (isLocalhostOrigin(origin)) {
      throw new Error(`Localhost CORS origin is not allowed in production: ${origin}`);
    }
  }
};

/**
 * Build list of allowed CORS origins.
 * Includes CLIENT_URL, comma-separated CORS_ALLOWED_ORIGINS, and optional ngrok support.
 *
 * Examples:
 * - ['http://localhost:5173'] if only CLIENT_URL is set
 * - ['http://localhost:5173', 'http://localhost:8080', 'https://ngrok-tunnel.ngrok-free.dev']
 *   if CORS_ALLOWED_ORIGINS and ALLOW_NGROK_ORIGINS are set
 */
const buildAllowedOrigins = () => {
  const origins = new Set();

  // Always include CLIENT_URL in development; require explicit value in production.
  const clientUrl = (
    process.env.CLIENT_URL || (isDevelopmentEnv ? 'http://localhost:5173' : '')
  ).trim();
  if (clientUrl) {
    origins.add(clientUrl);
  }

  // Parse comma-separated CORS_ALLOWED_ORIGINS if present
  if (process.env.CORS_ALLOWED_ORIGINS) {
    const additional = process.env.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    additional.forEach((origin) => origins.add(origin));
  }

  const allowedOrigins = Array.from(origins);

  if (isProductionEnv) {
    validateProductionCorsOrigins(allowedOrigins);
  }

  return allowedOrigins;
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

if (isProductionEnv) {
  for (const varName of PRODUCTION_REQUIRED_SECRET_VARS) {
    validateProductionSecret(varName);
  }

  for (const varName of PRODUCTION_OPTIONAL_SECRET_VARS) {
    validateProductionSecret(varName, { required: false });
  }

  validateProductionS3Credentials();
  validateProductionS3Bucket();

  if (isForbiddenProductionS3Endpoint(process.env.S3_ENDPOINT)) {
    throw new Error(
      'In production, S3_ENDPOINT cannot target localhost, loopback addresses, or LocalStack hosts.',
    );
  }
}

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DEV_FALLBACK_URI:
    process.env.MONGODB_DEV_FALLBACK_URI || 'mongodb://127.0.0.1:27017/cms_v2',

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
  CLIENT_URL: process.env.CLIENT_URL || (isDevelopmentEnv ? 'http://localhost:5173' : ''),
  CORS_ALLOWED_ORIGINS: buildAllowedOrigins(),
  ALLOW_NGROK_ORIGINS: parseBoolean(process.env.ALLOW_NGROK_ORIGINS, false),

  // Cookies / reverse proxy
  TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, false),
  COOKIE_SECURE: parseNullableBoolean(process.env.COOKIE_SECURE),
  COOKIE_SAME_SITE: parseCookieSameSite(process.env.COOKIE_SAME_SITE, 'strict'),

  // AWS S3 (Cloud Storage — LocalStack for dev, real AWS for prod)
  S3_BUCKET: resolveS3Bucket(),
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || (isDevelopmentEnv ? 'test' : ''),
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || (isDevelopmentEnv ? 'test' : ''),
  S3_ENDPOINT: resolveS3Endpoint(),
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === 'true' || isDevelopmentEnv,
  ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE: parseBoolean(
    process.env.ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE,
    false,
  ),

  // Redis (BullMQ)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Plagiarism (native engine)
  PLAGIARISM_WARNING_THRESHOLD: parseInt(process.env.PLAGIARISM_WARNING_THRESHOLD, 10) || 30,
  PLAGIARISM_REJECT_THRESHOLD: parseInt(process.env.PLAGIARISM_REJECT_THRESHOLD, 10) || 50,

  // reCAPTCHA v2
  RECAPTCHA_ENABLED: parseBoolean(process.env.RECAPTCHA_ENABLED, true),
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || '',

  // Google OAuth2 credentials
  // Auth login uses GOOGLE_AUTH_* and Drive OAuth uses GOOGLE_CLIENT_*.
  GOOGLE_AUTH_CLIENT_ID: process.env.GOOGLE_AUTH_CLIENT_ID || '',
  GOOGLE_AUTH_CLIENT_SECRET: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
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

  // Google Drive auth mode: auto | service_account | oauth
  // auto prefers service-account auth when both are configured
  GOOGLE_DRIVE_AUTH_MODE: (process.env.GOOGLE_DRIVE_AUTH_MODE || 'auto').trim().toLowerCase(),

  // Root Drive folder for review-doc organization (not primary binary storage)
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',

  // Drive folder for mirrored/review docs (AWS S3 remains the system of record for uploads)
  GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID: process.env.GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID || '',

  // Single Google Drive template folder for the full paper template
  GOOGLE_DRIVE_TEMPLATE_FOLDER_ID: process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID || '',

  // Master Google Doc template ID for cloning (Cap1-3 chapters, proposals, final papers)
  GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID: process.env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID || '',

  // Upload limits
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 25,
  MAX_PROTOTYPE_SIZE_MB: parseInt(process.env.MAX_PROTOTYPE_SIZE_MB, 10) || 50,

  // Agent runtime dynamic configuration
  AGENT_RUNTIME_ACTIVE_PROFILE: process.env.AGENT_RUNTIME_ACTIVE_PROFILE || 'default',
  AGENT_RUNTIME_CACHE_TTL_MS: parsePositiveInteger(process.env.AGENT_RUNTIME_CACHE_TTL_MS, 30000),
  AGENT_RUNTIME_STRICT_MODE: parseBoolean(process.env.AGENT_RUNTIME_STRICT_MODE, true),
  AGENT_RUNTIME_USE_DYNAMIC_PLAGIARISM_THRESHOLD: parseBoolean(
    process.env.AGENT_RUNTIME_USE_DYNAMIC_PLAGIARISM_THRESHOLD,
    false,
  ),

  // Helpers
  isDevelopment: isDevelopmentEnv,
  isProduction: isProductionEnv,
});

export default env;
