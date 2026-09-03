import mongoose from 'mongoose';
import fs from 'node:fs';
import env from './env.js';

const SRV_DNS_FAILURE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);
const CONNECTION_RETRY_DELAY_MS = 1500;
const MAX_CONNECTION_ATTEMPTS = 12;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildConnectionCandidates = (mongoUri) => {
  const candidates = [mongoUri];

  let parsedUri;
  try {
    parsedUri = new URL(mongoUri);
  } catch {
    return candidates;
  }

  const hostname = parsedUri.hostname;
  const isLoopbackHost = ['127.0.0.1', 'localhost'].includes(hostname);
  const isComposeMongoHost = hostname === 'mongodb';
  const runningInContainer = fs.existsSync('/.dockerenv');

  if (!runningInContainer || (!isLoopbackHost && !isComposeMongoHost)) {
    return candidates;
  }

  if (isLoopbackHost) {
    const hostDockerInternalUri = new URL(mongoUri);
    hostDockerInternalUri.hostname = 'host.docker.internal';

    const composeServiceUri = new URL(mongoUri);
    composeServiceUri.hostname = 'mongodb';

    candidates.push(hostDockerInternalUri.toString(), composeServiceUri.toString());
  }

  if (isComposeMongoHost) {
    const hostDockerInternalUri = new URL(mongoUri);
    hostDockerInternalUri.hostname = 'host.docker.internal';

    const localhostUri = new URL(mongoUri);
    localhostUri.hostname = '127.0.0.1';

    candidates.push(hostDockerInternalUri.toString(), localhostUri.toString());
  }

  return [...new Set(candidates)];
};

const isSrvUri = (uri) => typeof uri === 'string' && uri.startsWith('mongodb+srv://');

const isSrvDnsLookupFailure = (error) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const errorCodes = [error?.code, error?.cause?.code]
    .filter((code) => typeof code === 'string')
    .map((code) => code.toUpperCase());

  const hasSrvLookupSignal = message.includes('querysrv') || message.includes('_mongodb._tcp');
  const hasSrvFailureCode =
    errorCodes.some((code) => SRV_DNS_FAILURE_CODES.has(code)) ||
    /econnrefused|enotfound|eai_again/i.test(message);

  return hasSrvLookupSignal && hasSrvFailureCode;
};

const isTransientMongoConnectionError = (error) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const errorCodes = [error?.code, error?.cause?.code]
    .filter((code) => typeof code === 'string')
    .map((code) => code.toUpperCase());

  if (errorCodes.some((code) => SRV_DNS_FAILURE_CODES.has(code))) {
    return true;
  }

  return /econnrefused|enotfound|eai_again|etimedout|ehostunreach|network error/i.test(message);
};

const tryConnectCandidates = async (candidates) => {
  let lastError = null;

  for (const uri of candidates) {
    for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
      try {
        const conn = await mongoose.connect(uri, {
          autoIndex: env.isDevelopment,
        });

        console.warn(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
        return null;
      } catch (error) {
        lastError = error;

        if (attempt < MAX_CONNECTION_ATTEMPTS && isTransientMongoConnectionError(error)) {
          const parsedUri = new URL(uri);
          console.warn(
            `[db] MongoDB connection attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS} failed for ${parsedUri.hostname}; retrying...`,
          );
          await sleep(CONNECTION_RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }
    }
  }

  return lastError;
};

/**
 * Connect to MongoDB with retry logic.
 * Logs connection events for observability.
 */
const connectDB = async () => {
  const primaryCandidates = buildConnectionCandidates(env.MONGODB_URI);
  let lastError = await tryConnectCandidates(primaryCandidates);

  if (lastError && env.isDevelopment) {
    const fallbackCandidates = buildConnectionCandidates(env.MONGODB_DEV_FALLBACK_URI).filter(
      (uri) => !primaryCandidates.includes(uri),
    );

    if (fallbackCandidates.length > 0) {
      console.warn(
        '[db] Primary MongoDB connection failed in development. Trying fallback MongoDB URI.',
      );
      lastError = await tryConnectCandidates(fallbackCandidates);
    }
  }

  if (lastError) {
    console.error(`MongoDB connection error: ${lastError.message}`);
    process.exit(1);
  }

  // Connection event listeners
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.warn('MongoDB reconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB runtime error: ${err.message}`);
  });
};

export default connectDB;
