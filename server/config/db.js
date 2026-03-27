import mongoose from 'mongoose';
import fs from 'node:fs';
import env from './env.js';

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

/**
 * Connect to MongoDB with retry logic.
 * Logs connection events for observability.
 */
const connectDB = async () => {
  const candidates = buildConnectionCandidates(env.MONGODB_URI);

  let lastError = null;

  for (const uri of candidates) {
    try {
      const conn = await mongoose.connect(uri, {
        autoIndex: env.isDevelopment,
      });

      console.warn(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
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
