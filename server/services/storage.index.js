/**
 * Storage service selector — Routes to correct implementation based on STORAGE_MODE env
 *
 * Usage: All modules should import from here instead of storage.service.js directly
 *
 *   OLD:  import storage from '../services/storage.service.js'
 *   NEW:  import storage from '../services/storage.index.js'
 *
 * Benefits:
 *   - Filesystem storage for development/capstone on laptop
 *   - S3 storage for production (AWS or S3-compatible like MinIO)
 *   - No code changes needed in modules using storage
 *
 * Configuration:
 *   STORAGE_MODE=filesystem  → Use local filesystem (./uploads)
 *   STORAGE_MODE=s3          → Use AWS S3 (default)
 */

import env from '../config/env.js';

const storageMode = (env.STORAGE_MODE || 's3').toLowerCase().trim();

let storageService;

if (storageMode === 'filesystem') {
  console.log(
    '[Storage] Filesystem mode enabled. Files will be stored in: ',
    env.STORAGE_LOCAL_PATH || './uploads',
  );
  const mod = await import('./filesystem-storage.service.js');
  storageService = mod.default;
} else {
  console.log('[Storage] S3 mode enabled');
  const mod = await import('./storage.service.js');
  storageService = mod.default;
}

export default storageService;
