/**
 * Storage file serving middleware — Serve uploaded files from local filesystem
 *
 * Mounts at /storage/* to serve files uploaded via filesystem storage service
 * Example: /storage/archives/projects/xxx/chapters/1/v1/file.pdf
 *
 * Security:
 *   - Path traversal protection (.. not allowed)
 *   - Rate limiting recommended on app.js
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Base directory for served files
const baseDir = env.STORAGE_LOCAL_PATH || path.join(__dirname, '..', '..', 'uploads');

/**
 * Serve file from filesystem storage
 * GET /storage/archives/projects/{projectId}/chapters/1/v1/file.pdf
 */
router.get('/*filepath', (req, res, _next) => {
  try {
    // Sanitize path — prevent path traversal attacks
    const requestedPath = req.params.filepath;

    if (requestedPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const filePath = path.join(baseDir, requestedPath);

    // Ensure resolved path stays within baseDir
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(baseDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Serve the file
    res.sendFile(resolvedPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found' });
        }
        if (err.code === 'EACCES') {
          return res.status(403).json({ error: 'Access denied' });
        }
        console.error('[StorageFileServer] Error serving file:', err);
        return res.status(500).json({ error: 'Failed to serve file' });
      }
    });
  } catch (error) {
    console.error('[StorageFileServer] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
