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
import fs from 'fs/promises';
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
// Use a RegExp catch-all to avoid path-to-regexp wildcard parsing differences.
router.get(/.*/, async (req, res, _next) => {
  try {
    // Sanitize path — prevent path traversal attacks and sidecar leakage
    let requestedPath = req.path;

    // Remove leading slash if present
    if (requestedPath.startsWith('/')) {
      requestedPath = requestedPath.slice(1);
    }

    if (
      requestedPath.includes('..') ||
      requestedPath.includes('\0') ||
      requestedPath.endsWith('.meta.json') ||
      requestedPath.endsWith('.txt.gz')
    ) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const resolvedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(resolvedBase, requestedPath);
    const relCheck = path.relative(resolvedBase, resolvedPath);

    // Ensure resolved path stays strictly within baseDir
    if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Enforce cross-tenant project boundary for students accessing project files
    const projectMatch = requestedPath.match(/(?:^|\/)projects\/([a-f\d]{24})(?:\/|$)/i);
    if (projectMatch && req.user?.role === 'student') {
      const targetProjectId = projectMatch[1];
      const Project = (await import('../modules/projects/project.model.js')).default;
      const Team = (await import('../modules/teams/team.model.js')).default;
      const project = await Project.findById(targetProjectId)
        .select('teamId memberRoleAssignments isArchived projectStatus')
        .lean();

      if (project && !project.isArchived && project.projectStatus !== 'archived') {
        const userIdStr = String(req.user._id || req.user.id || '');
        const team = project.teamId
          ? await Team.findById(project.teamId).select('members leaderId').lean()
          : null;
        const isMember =
          project.memberRoleAssignments?.some((m) => String(m.userId) === userIdStr) ||
          team?.members?.some((m) => String(m?._id || m) === userIdStr) ||
          String(team?.leaderId?._id || team?.leaderId || '') === userIdStr;

        if (!isMember) {
          return res.status(403).json({ error: 'Access denied to another team project files' });
        }
      }
    }

    // Try to read sidecar meta file for content type
    let rawContentType = 'application/octet-stream';
    try {
      const metaPath = `${resolvedPath}.meta.json`;
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      if (meta.contentType) {
        rawContentType = meta.contentType;
      }
    } catch (e) {
      // Ignore errors if meta file doesn't exist
    }

    const SAFE_INLINE_MIMES = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'text/plain',
    ]);
    const contentType = SAFE_INLINE_MIMES.has(rawContentType)
      ? rawContentType
      : 'application/octet-stream';
    const fileName = path.basename(resolvedPath).replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.query.download === 'true' || !SAFE_INLINE_MIMES.has(rawContentType)) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    }

    // Serve the file with explicit HTTP 206 Range request support
    const sendOpts = {
      acceptRanges: true,
      cacheControl: true,
      maxAge: '1d',
    };

    res.sendFile(resolvedPath, sendOpts, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found' });
        }
        if (err.code === 'EACCES') {
          return res.status(403).json({ error: 'Access denied' });
        }
        // If client aborted request (e.g. paused download), do not log as server error
        if (err.code === 'ECONNABORTED' || err.message?.includes('aborted')) {
          return;
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
