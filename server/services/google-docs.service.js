/**
 * GoogleDocsService — abstracts all Google Docs & Drive API interactions.
 *
 * Supports two authentication strategies (tried in priority order):
 *
 *   1. Service Account JWT  — preferred for server-to-server workloads
 *        GOOGLE_SERVICE_ACCOUNT_EMAIL
 *        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 *   2. OAuth2 + Refresh Token — fallback for personal Drive access
 *        GOOGLE_CLIENT_ID
 *        GOOGLE_CLIENT_SECRET
 *        REFRESH_TOKEN  (or GOOGLE_REFRESH_TOKEN)
 *
 * In both cases, drive&docs scopes are required.
 * GOOGLE_DRIVE_FOLDER_ID — Root Drive folder for CMS-managed files
 */
import { google } from 'googleapis';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

class GoogleDocsService {
  constructor() {
    this.docs = null;
    this.drive = null;
    this._initialized = false;
  }

  /**
   * Lazy-initialize Google API clients.
   *
   * Priority:
   *   1. Service Account JWT  — if GOOGLE_SERVICE_ACCOUNT_EMAIL + PRIVATE_KEY are set
   *   2. OAuth2 refresh token — if GOOGLE_CLIENT_ID + SECRET + REFRESH_TOKEN are set
   *
   * Throws GOOGLE_DOCS_NOT_CONFIGURED (503) when neither is available.
   */
  async _ensureInitialized() {
    if (this._initialized) return;

    const hasOAuth2 = !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN
    );

    const hasServiceAccount = !!(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );

    if (!hasOAuth2 && !hasServiceAccount) {
      throw new AppError(
        'Google Docs integration is not configured. ' +
          'Provide either (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + REFRESH_TOKEN) ' +
          'or (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) in your .env file.',
        503,
        'GOOGLE_DOCS_NOT_CONFIGURED',
      );
    }

    let auth;

    if (hasOAuth2) {
      // ── Strategy 1: OAuth2 + Refresh Token (preferred) ───────────────────
      // OAuth2 uses an actual Google user's credentials, giving full Drive
      // capability: create, upload, read, trash.  Service accounts on personal
      // (non-Workspace) GCP projects have no Drive storage quota and therefore
      // cannot CREATE files — only list/search/stream files shared with them.
      auth = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI,
      );
      auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
      this._authStrategy = 'oauth2';
      // Force an early token exchange to surface invalid_grant errors immediately.
      await auth.getAccessToken();
    } else {
      // ── Strategy 2: Service Account JWT (read-only fallback) ─────────────
      // Suitable for listing, searching, and streaming files that have been
      // explicitly shared with the service account.  Cannot create new files
      // without Domain-Wide Delegation (Google Workspace only).
      auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
        ],
      });
      this._authStrategy = 'service-account';
      // Pre-fetch the access token so all subsequent requests include auth headers.
      await auth.authorize();
    }

    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
    this._initialized = true;
  }

  /**
   * Check if Google Docs integration is available (at least one auth strategy configured).
   * @returns {boolean}
   */
  isConfigured() {
    const hasOAuth2 = !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN
    );
    const hasServiceAccount = !!(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    return hasOAuth2 || hasServiceAccount;
  }

  /**
   * Return which auth strategy is active: 'oauth2' | 'service-account' | 'none'
   * @returns {string}
   */
  getAuthStrategy() {
    if (!this._initialized) {
      const hasOAuth2 = !!(
        env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET &&
        env.GOOGLE_REFRESH_TOKEN
      );
      if (hasOAuth2) return 'oauth2';
      const hasServiceAccount = !!(
        env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      );
      if (hasServiceAccount) return 'service-account';
      return 'none';
    }
    return this._authStrategy;
  }

  /**
   * Create a folder in Google Drive.
   * @param {string} folderName - Name of the folder to create.
   * @param {string} [parentFolderId] - ID of the parent folder (defaults to GOOGLE_DRIVE_FOLDER_ID environment variable).
   * @returns {Promise<string>} The ID of the newly created folder.
   */
  async createFolder(folderName, parentFolderId = env.GOOGLE_DRIVE_FOLDER_ID) {
    await this._ensureInitialized();

    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      throw this._wrapError(error, 'Failed to create Google Drive folder');
    }
  }

  /**
   * Create a blank Google Doc in the configured Drive folder.
   * @param {string} title - Document title.
   * @param {string} [folderId] - ID of the folder where the document should be created.
   * @returns {Promise<{ docId: string, docUrl: string }>}
   */
  async createBlankDocument(title, folderId) {
    await this._ensureInitialized();

    const parentId = folderId || env.GOOGLE_DRIVE_FOLDER_ID;

    try {
      // Use drive.files.create() with the Google Docs MIME type rather than
      // docs.documents.create(). The Docs API create endpoint returns 403 for
      // service accounts on personal Drive; the Drive API does not have this
      // restriction and produces an identical Google Doc accessible via both APIs.
      const response = await this.drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.document',
          ...(parentId && { parents: [parentId] }),
        },
        fields: 'id',
      });

      const docId = response.data.id;

      // Set public sharing so CMS can embed it
      await this.setAnyoneCanEditPermission(docId);

      return {
        docId,
        docUrl: `https://docs.google.com/document/d/${docId}/edit`,
      };
    } catch (error) {
      throw this._wrapError(error, 'Failed to create blank document');
    }
  }

  /**
   * Copy an existing Google Doc (template) to create a new document.
   * @param {string} templateDocId - The Google Doc ID of the template to copy.
   * @param {string} title - Title for the new document copy.
   * @param {string} [folderId] - ID of the folder where the document should be created.
   * @returns {Promise<{ docId: string, docUrl: string }>}
   */
  async createFromTemplate(templateDocId, title, folderId) {
    await this._ensureInitialized();

    const parentId = folderId || env.GOOGLE_DRIVE_FOLDER_ID;

    try {
      const response = await this.drive.files.copy({
        fileId: templateDocId,
        requestBody: {
          name: title,
          ...(parentId && { parents: [parentId] }),
        },
      });

      const docId = response.data.id;

      // Set public sharing so CMS can embed it
      await this.setAnyoneCanEditPermission(docId);

      return {
        docId,
        docUrl: `https://docs.google.com/document/d/${docId}/edit`,
      };
    } catch (error) {
      if (error.code === 404) {
        throw new AppError(
          'Template document not found in Google Drive. Verify the template Google Doc ID.',
          404,
          'TEMPLATE_NOT_FOUND',
        );
      }
      throw this._wrapError(error, 'Failed to create document from template');
    }
  }

  /**
   * Set "anyone with the link can edit" permission on a document.
   * The CMS controls view vs. edit by choosing which URL to embed:
   * - /edit for students + adviser
   * - /preview for panelists (read-only regardless of permission)
   *
   * @param {string} docId - Google Doc/Drive file ID.
   */
  async setAnyoneCanEditPermission(docId) {
    await this._ensureInitialized();

    try {
      await this.drive.permissions.create({
        fileId: docId,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      });
    } catch (error) {
      throw this._wrapError(error, 'Failed to set document permissions');
    }
  }

  /**
   * Get metadata about a Google Doc (title, last modified, etc.).
   * @param {string} docId - Google Doc ID.
   * @returns {Promise<{ id: string, name: string, modifiedTime: string, webViewLink: string }>}
   */
  async getDocumentMetadata(docId) {
    await this._ensureInitialized();

    try {
      const response = await this.drive.files.get({
        fileId: docId,
        fields: 'id,name,modifiedTime,webViewLink,createdTime',
      });

      return response.data;
    } catch (error) {
      if (error.code === 404) {
        throw new AppError('Document not found in Google Drive.', 404, 'DOCUMENT_NOT_FOUND');
      }
      throw this._wrapError(error, 'Failed to get document metadata');
    }
  }

  /**
   * Permanently delete a Google Doc (moves to trash).
   * @param {string} docId - Google Doc ID.
   */
  async trashDocument(docId) {
    await this._ensureInitialized();

    try {
      await this.drive.files.update({
        fileId: docId,
        requestBody: { trashed: true },
      });
    } catch (error) {
      if (error.code === 404) return; // Already gone — no-op
      throw this._wrapError(error, 'Failed to trash document');
    }
  }

  /**
   * Verify that a Google Doc ID is accessible by the service account.
   * Used when instructors register a template by its Doc ID.
   * @param {string} docId - Google Doc ID to verify.
   * @returns {Promise<{ id: string, name: string }>}
   */
  async verifyDocumentAccess(docId) {
    await this._ensureInitialized();

    try {
      const response = await this.drive.files.get({
        fileId: docId,
        fields: 'id,name,mimeType',
      });

      if (response.data.mimeType !== 'application/vnd.google-apps.document') {
        throw new AppError(
          'The provided file ID is not a Google Doc. Please provide a Google Docs document ID.',
          400,
          'NOT_A_GOOGLE_DOC',
        );
      }

      return { id: response.data.id, name: response.data.name };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 404 || error.code === 403) {
        throw new AppError(
          'Cannot access the specified Google Doc. Make sure the document is shared with the service account email.',
          404,
          'TEMPLATE_NOT_ACCESSIBLE',
        );
      }
      throw this._wrapError(error, 'Failed to verify document access');
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   * GOOGLE DRIVE — FILE RETRIEVAL & MANAGEMENT
   * ═══════════════════════════════════════════════════════════════ */

  /**
   * List all files inside a Drive folder.
   * Used for browsing capstone submission archives and template libraries.
   *
   * @param {string} folderId - Drive folder ID to list.
   * @param {object} [options]
   * @param {number} [options.pageSize=50] - Max files to return (1–1000).
   * @param {string} [options.pageToken] - Pagination token for next page.
   * @param {string} [options.mimeType] - Filter by MIME type (e.g. 'application/pdf').
   * @param {string} [options.orderBy='name'] - Sort field: 'name', 'modifiedTime', 'createdTime'.
   * @returns {Promise<{ files: Array, nextPageToken: string|null }>}
   */
  async listFilesInFolder(folderId, options = {}) {
    await this._ensureInitialized();

    const { pageSize = 50, pageToken, mimeType, orderBy = 'name' } = options;

    // Build the query: files inside the folder, not trashed
    let q = `'${folderId}' in parents and trashed = false`;
    if (mimeType) q += ` and mimeType = '${mimeType}'`;

    try {
      const response = await this.drive.files.list({
        q,
        pageSize,
        pageToken: pageToken || undefined,
        orderBy,
        fields:
          'nextPageToken, files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,description)',
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken || null,
      };
    } catch (error) {
      throw this._wrapError(error, `Failed to list files in folder ${folderId}`);
    }
  }

  /**
   * Search for files in Drive by name or full-text query.
   * Optionally scoped to a specific folder.
   *
   * @param {string} searchQuery - Text to search (matched against file name).
   * @param {object} [options]
   * @param {string} [options.folderId] - Restrict search to this folder.
   * @param {string} [options.mimeType] - Filter results by MIME type.
   * @param {number} [options.pageSize=20] - Max results to return.
   * @returns {Promise<{ files: Array }>}
   */
  async searchFiles(searchQuery, options = {}) {
    await this._ensureInitialized();

    const { folderId, mimeType, pageSize = 20 } = options;

    // Escape single quotes in the search query to prevent query injection
    const safeQuery = searchQuery.replace(/'/g, "\\'");

    let q = `name contains '${safeQuery}' and trashed = false`;
    if (folderId) q += ` and '${folderId}' in parents`;
    if (mimeType) q += ` and mimeType = '${mimeType}'`;

    try {
      const response = await this.drive.files.list({
        q,
        pageSize,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)',
      });

      return { files: response.data.files || [] };
    } catch (error) {
      throw this._wrapError(error, 'Failed to search Drive files');
    }
  }

  /**
   * Stream / download the binary content of a Drive file.
   * Returns a readable stream — pipe it directly into the HTTP response.
   *
   * Usage in a controller:
   *   const stream = await googleDocsService.getFileStream(fileId);
   *   res.setHeader('Content-Disposition', `attachment; filename="doc.pdf"`);
   *   stream.pipe(res);
   *
   * @param {string} fileId - Drive file ID.
   * @returns {Promise<import('stream').Readable>}
   */
  async getFileStream(fileId) {
    await this._ensureInitialized();

    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      );

      return response.data;
    } catch (error) {
      if (error.code === 404) {
        throw new AppError('Drive file not found.', 404, 'DRIVE_FILE_NOT_FOUND');
      }
      throw this._wrapError(error, 'Failed to stream file from Drive');
    }
  }

  /**
   * Export a Google Doc to a specific MIME type (e.g. PDF, DOCX) as a stream.
   * Use this to export Google Docs/Sheets/Slides — not binary files.
   *
   * Common exportMimeType values:
   *   - 'application/pdf'                                              (PDF)
   *   - 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' (DOCX)
   *   - 'text/plain'                                                   (TXT)
   *
   * @param {string} docId - Google Doc ID.
   * @param {string} [exportMimeType='application/pdf'] - Target format.
   * @returns {Promise<import('stream').Readable>}
   */
  async exportDocAsStream(docId, exportMimeType = 'application/pdf') {
    await this._ensureInitialized();

    try {
      const response = await this.drive.files.export(
        { fileId: docId, mimeType: exportMimeType },
        { responseType: 'stream' },
      );

      return response.data;
    } catch (error) {
      if (error.code === 404) {
        throw new AppError('Document not found for export.', 404, 'DOCUMENT_NOT_FOUND');
      }
      throw this._wrapError(error, `Failed to export document as ${exportMimeType}`);
    }
  }

  /**
   * Upload a file buffer to a specific Drive folder.
   * Used to store finalized capstone submissions directly in Drive
   * (in addition to S3) for institutional archiving.
   *
   * @param {Buffer} fileBuffer - The file's binary content.
   * @param {string} fileName - The name to give the file in Drive.
   * @param {string} mimeType - MIME type of the file (e.g. 'application/pdf').
   * @param {string} [folderId] - Drive folder ID. Falls back to GOOGLE_DRIVE_FOLDER_ID.
   * @param {object} [metadata] - Optional extra Drive file metadata (description, etc.).
   * @returns {Promise<{ fileId: string, fileName: string, webViewLink: string, webContentLink: string }>}
   */
  async uploadFileToDrive(fileBuffer, fileName, mimeType, folderId, metadata = {}) {
    await this._ensureInitialized();

    const targetFolder = folderId || env.GOOGLE_DRIVE_FOLDER_ID;

    if (!targetFolder) {
      throw new AppError(
        'No Drive folder configured. Set GOOGLE_DRIVE_FOLDER_ID or pass a folderId.',
        503,
        'DRIVE_FOLDER_NOT_CONFIGURED',
      );
    }

    // Dynamically import stream utilities (Node built-in)
    const { Readable } = await import('node:stream');

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolder],
          description: metadata.description || '',
          ...metadata,
        },
        media: {
          mimeType,
          body: Readable.from(fileBuffer),
        },
        fields: 'id,name,webViewLink,webContentLink',
      });

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
      };
    } catch (error) {
      throw this._wrapError(error, `Failed to upload "${fileName}" to Drive`);
    }
  }

  /**
   * List template files from the single configured template folder.
   * This project uses one master template for the full paper.
   *
   * @returns {Promise<{ folderId: string, files: Array }>}
   */
  async listTemplateFiles() {
    await this._ensureInitialized();

    const folderId = env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID;

    if (!folderId) {
      return { folderId: '', files: [] };
    }

    const { files } = await this.listFilesInFolder(folderId, {
      mimeType: 'application/vnd.google-apps.document',
      pageSize: 100,
    });

    return { folderId, files };
  }

  /**
   * Backward-compatible alias for older callers.
   * @deprecated Use listTemplateFiles instead.
   */
  async listTemplatesByPhase() {
    const { folderId, files } = await this.listTemplateFiles();
    if (!folderId) return [];
    return [{ phase: 'FULL_PAPER', folderId, files }];
  }

  /**
   * Set "anyone with the link can VIEW" (read-only) permission.
   * Used for the archive journal version — students can view but never edit.
   *
   * @param {string} docId - Google Doc/Drive file ID.
   */
  async setViewPermission(docId) {
    await this._ensureInitialized();

    try {
      await this.drive.permissions.create({
        fileId: docId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (error) {
      throw this._wrapError(error, 'Failed to set view-only permission');
    }
  }

  /**
   * Revoke all "anyone" permissions from a Drive file (lock it down).
   * Called when a chapter is LOCKED or when submission is rejected.
   *
   * @param {string} docId - Google Doc/Drive file ID.
   */
  async revokePublicPermission(docId) {
    await this._ensureInitialized();

    try {
      // List all permissions and remove the "anyone" one
      const permsResponse = await this.drive.permissions.list({
        fileId: docId,
        fields: 'permissions(id,type)',
      });

      const anyonePermission = (permsResponse.data.permissions || []).find(
        (p) => p.type === 'anyone',
      );

      if (anyonePermission) {
        await this.drive.permissions.delete({
          fileId: docId,
          permissionId: anyonePermission.id,
        });
      }
    } catch (error) {
      // Non-critical — log but don't fail
      console.warn(
        `[GoogleDocsService] Failed to revoke public permission on ${docId}:`,
        error.message,
      );
    }
  }

  /**
   * Move a file into a specific Drive folder.
   * @param {string} fileId
   * @param {string} folderId
   * @private
   */
  async _moveToFolder(fileId, folderId) {
    try {
      // Get current parents
      const file = await this.drive.files.get({
        fileId,
        fields: 'parents',
      });

      const previousParents = (file.data.parents || []).join(',');

      await this.drive.files.update({
        fileId,
        addParents: folderId,
        removeParents: previousParents,
        fields: 'id, parents',
      });
    } catch (error) {
      // Non-critical — log but don't fail the operation
      console.warn(
        `[GoogleDocsService] Failed to move file ${fileId} to folder ${folderId}:`,
        error.message,
      );
    }
  }

  /**
   * Wrap Google API errors into AppError instances.
   * @param {Error} error
   * @param {string} context
   * @returns {AppError}
   * @private
   */
  _wrapError(error, context) {
    if (error instanceof AppError) return error;

    const status = error.code || error.response?.status || 500;
    const message = error.errors?.[0]?.message || error.message || 'Unknown Google API error';

    return new AppError(
      `${context}: ${message}`,
      status >= 100 && status < 600 ? status : 500,
      'GOOGLE_API_ERROR',
    );
  }
}

// Singleton instance
const googleDocsService = new GoogleDocsService();

export default googleDocsService;
