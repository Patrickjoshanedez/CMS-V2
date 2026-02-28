import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Global test setup for server integration tests.
 *
 * Spins up an in-memory MongoDB instance before all tests,
 * clears all collections between tests, and tears down after.
 *
 * Environment variables are set in-process so env.js config
 * picks them up without a .env file.
 */

let mongoServer;

// Set required env vars before any module imports them
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-12345678';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-12345678';
process.env.MONGODB_URI = 'mongodb://placeholder:27017/test'; // overridden in beforeAll
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '2525';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  // Connect mongoose to in-memory DB
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
