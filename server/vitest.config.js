import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for server integration tests.
 * Uses mongodb-memory-server for isolated DB tests.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 60000, // MongoMemoryServer startup can be slow on first run
    // Run tests sequentially — shared in-memory DB
    fileParallelism: false,
  },
});
