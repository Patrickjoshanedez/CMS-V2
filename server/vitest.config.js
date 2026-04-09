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
    testTimeout: 60000,
    hookTimeout: 120000, // Extended for slow beforeEach with multiple user/team setups in integration tests
    // Run tests sequentially — shared in-memory DB
    fileParallelism: false,
  },
});
