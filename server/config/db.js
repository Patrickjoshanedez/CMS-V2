import mongoose from 'mongoose';
import fs from 'node:fs';
import env from './env.js';

const SRV_DNS_FAILURE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

const buildConnectionCandidates = (mongoUri) => {
  const candidates = [mongoUri];

  let parsedUri;
  try {
    parsedUri = new URL(mongoUri);
  } catch {
    return candidates;
  }

  const isLoopbackHost = ['127.0.0.1', 'localhost'].includes(parsedUri.hostname);
  const runningInContainer = fs.existsSync('/.dockerenv');

  if (!isLoopbackHost || !runningInContainer) {
    return candidates;
  }

  const hostDockerInternalUri = new URL(mongoUri);
  hostDockerInternalUri.hostname = 'host.docker.internal';

  const composeServiceUri = new URL(mongoUri);
  composeServiceUri.hostname = 'mongodb';

  candidates.push(hostDockerInternalUri.toString(), composeServiceUri.toString());

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

const tryConnectCandidates = async (candidates) => {
  let lastError = null;

  for (const uri of candidates) {
    try {
      const conn = await mongoose.connect(uri, {
        autoIndex: env.isDevelopment,
      });

      console.warn(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return null;
    } catch (error) {
      lastError = error;
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

  if (
    lastError &&
    env.isDevelopment &&
    isSrvUri(env.MONGODB_URI) &&
    isSrvDnsLookupFailure(lastError)
  ) {
    const fallbackCandidates = buildConnectionCandidates(env.MONGODB_DEV_FALLBACK_URI).filter(
      (uri) => !primaryCandidates.includes(uri),
    );

    if (fallbackCandidates.length > 0) {
      console.warn(
        '[db] Atlas SRV DNS lookup failed in development. Trying local MongoDB fallback URI.',
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
