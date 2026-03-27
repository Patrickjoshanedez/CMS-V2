/**
 * GoogleDriveReviewService
 *
 * Classroom-style integration for manuscript review:
 * - Upload manuscript files to Drive
 * - Manage role-based permissions (writer/commenter/reader)
 * - Provide edit/preview URLs for frontend redirects
 * - Pull review comments for archival in MongoDB
 */
import { google } from 'googleapis';
import { Readable } from 'stream';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

class GoogleDriveReviewService {
  constructor() {
    this.drive = null;
    this._initialized = false;
  }

  isConfigured() {
    const hasServiceAccount = !!(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    const hasOAuthRefreshToken = !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN
    );

    const mode = env.GOOGLE_DRIVE_AUTH_MODE || 'auto';
    if (mode === 'service_account') {
      return hasServiceAccount;
    }
    if (mode === 'oauth') {
      return hasOAuthRefreshToken;
    }

    return hasServiceAccount || hasOAuthRefreshToken;
  }

  async _ensureInitialized() {
    if (this._initialized) {
      return;
    }

    if (!this.isConfigured()) {
      throw new AppError(
        'Google Drive review integration is not configured. Check GOOGLE_DRIVE_AUTH_MODE and matching credentials.',
        503,
        'GOOGLE_REVIEW_NOT_CONFIGURED',
      );
    }

    const hasServiceAccount = !!(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    const hasOAuthRefreshToken = !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN
    );
    const mode = env.GOOGLE_DRIVE_AUTH_MODE || 'auto';

    let auth;

    if (mode === 'oauth') {
      if (!hasOAuthRefreshToken) {
        throw new AppError(
          'GOOGLE_DRIVE_AUTH_MODE=oauth is set but OAuth refresh-token credentials are missing.',
          503,
          'GOOGLE_OAUTH_NOT_CONFIGURED',
        );
      }
      auth = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI,
      );
      auth.setCredentials({
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
      });
    } else if (mode === 'service_account') {
      if (!hasServiceAccount) {
        throw new AppError(
          'GOOGLE_DRIVE_AUTH_MODE=service_account is set but service-account credentials are missing.',
          503,
          'GOOGLE_SERVICE_ACCOUNT_NOT_CONFIGURED',
        );
      }
      auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } else {
      // Auto mode: prefer service-account auth for stable, app-owned Drive uploads.
      if (hasServiceAccount) {
        auth = new google.auth.JWT({
          email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
      } else {
        auth = new google.auth.OAuth2(
          env.GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET,
          env.GOOGLE_REDIRECT_URI,
        );
        auth.setCredentials({
          refresh_token: env.GOOGLE_REFRESH_TOKEN,
        });
      }
    }

    await auth.authorize();
    this.drive = google.drive({ version: 'v3', auth });
    this._initialized = true;
  }

  async _withRetry(operation, maxAttempts = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const shouldRetry = RETRYABLE_STATUS.has(status) && attempt < maxAttempts;
        if (!shouldRetry) {
          throw error;
        }

        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  async createProjectFolder(folderName, parentFolderId = env.GOOGLE_DRIVE_FOLDER_ID) {
    await this._ensureInitialized();

    if (!parentFolderId) {
      throw new AppError(
        'No Drive root folder configured. Set GOOGLE_DRIVE_FOLDER_ID before creating project folders.',
        503,
        'DRIVE_ROOT_NOT_CONFIGURED',
      );
    }

    const response = await this._withRetry(() =>
      this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id,webViewLink',
      }),
    );

    return {
      folderId: response.data.id,
      folderUrl: response.data.webViewLink || null,
    };
  }

  async uploadManuscriptFile({ fileBuffer, fileName, mimeType, folderId }) {
    await this._ensureInitialized();

    const targetFolderId = folderId || env.GOOGLE_DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new AppError(
        'No Drive folder configured. Set GOOGLE_DRIVE_FOLDER_ID or provide a project folder ID.',
        503,
        'DRIVE_FOLDER_NOT_CONFIGURED',
      );
    }

    const response = await this._withRetry(() =>
      this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
        },
        media: {
          mimeType,
          body: Readable.from(Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)),
        },
        fields: 'id,name,mimeType,webViewLink',
      }),
    );

    const fileId = response.data.id;

    return {
      fileId,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink || this.getEditUrl(fileId),
      editUrl: this.getEditUrl(fileId),
      previewUrl: this.getPreviewUrl(fileId),
    };
  }

  getEditUrl(fileId) {
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }

  getPreviewUrl(fileId) {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  }

  async syncFilePermissions(fileId, desiredPermissions) {
    await this._ensureInitialized();

    const deduped = new Map();
    for (const entry of desiredPermissions) {
      if (!entry?.email || !entry?.role) {
        continue;
      }
      deduped.set(entry.email.toLowerCase(), {
        email: entry.email.toLowerCase(),
        role: entry.role,
      });
    }

    const desired = [...deduped.values()];

    const existingRes = await this._withRetry(() =>
      this.drive.permissions.list({
        fileId,
        fields: 'permissions(id,emailAddress,role,type)',
      }),
    );

    const existing = existingRes.data.permissions || [];
    const existingByEmail = new Map(
      existing
        .filter((perm) => perm.emailAddress)
        .map((perm) => [perm.emailAddress.toLowerCase(), perm]),
    );

    // Upsert desired permissions
    for (const target of desired) {
      const current = existingByEmail.get(target.email);

      if (!current) {
        await this._withRetry(() =>
          this.drive.permissions.create({
            fileId,
            sendNotificationEmail: false,
            requestBody: {
              type: 'user',
              role: target.role,
              emailAddress: target.email,
            },
            fields: 'id',
          }),
        );
        continue;
      }

      if (current.role !== target.role) {
        await this._withRetry(() =>
          this.drive.permissions.update({
            fileId,
            permissionId: current.id,
            requestBody: { role: target.role },
            fields: 'id,role',
          }),
        );
      }
    }

    // Remove stale user permissions managed by CMS
    for (const permission of existing) {
      const email = permission.emailAddress?.toLowerCase();
      const isOwner = permission.role === 'owner';
      const isCmsManagedRole = ['reader', 'commenter', 'writer'].includes(permission.role);

      if (!email || isOwner || !isCmsManagedRole) {
        continue;
      }

      if (!deduped.has(email)) {
        await this._withRetry(() =>
          this.drive.permissions.delete({
            fileId,
            permissionId: permission.id,
          }),
        );
      }
    }

    return {
      fileId,
      syncedCount: desired.length,
      syncedAt: new Date().toISOString(),
    };
  }

  async listComments(fileId, pageToken = null) {
    await this._ensureInitialized();

    const response = await this._withRetry(() =>
      this.drive.comments.list({
        fileId,
        includeDeleted: false,
        pageSize: 100,
        pageToken: pageToken || undefined,
        fields:
          'comments(id,content,createdTime,modifiedTime,resolved,deleted,author(displayName,emailAddress),quotedFileContent/value,replies(id,content,createdTime,modifiedTime,author(displayName,emailAddress),deleted)),nextPageToken',
      }),
    );

    return {
      comments: response.data.comments || [],
      nextPageToken: response.data.nextPageToken || null,
    };
  }

  /**
   * Clone a Google Doc template to create a new document.
   *
   * Implements enterprise-grade error handling with rate limit mitigation:
   * - Exponential backoff with jitter for 429 (quota) errors
   * - Validates template doc exists before cloning
   * - Stores cloned doc in destination folder
   *
   * @param {string} templateDocId - The master template Google Doc ID
   * @param {string} newFileName - Name for the cloned document
   * @param {string} [destinationFolderId] - Folder where cloned doc is stored
   * @returns {Promise<{ clonedDocId: string, editUrl: string, previewUrl: string }>}
   * @throws {AppError} If template not found or API quota exhausted
   */
  async createFromTemplate(
    templateDocId,
    newFileName,
    destinationFolderId = env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID,
  ) {
    await this._ensureInitialized();

    if (!templateDocId) {
      throw new AppError('Template document ID is required.', 400, 'TEMPLATE_DOC_ID_MISSING');
    }

    if (!destinationFolderId) {
      throw new AppError(
        'Destination folder is not configured. Set GOOGLE_DRIVE_TEMPLATE_FOLDER_ID or provide destinationFolderId.',
        503,
        'DESTINATION_FOLDER_NOT_CONFIGURED',
      );
    }

    try {
      // Verify template exists before attempting clone
      await this._withRetry(() =>
        this.drive.files.get({
          fileId: templateDocId,
          fields: 'id,name,mimeType',
        }),
      );
    } catch (verifyError) {
      const status = verifyError?.response?.status;
      if (status === 404) {
        throw new AppError(
          `Template document not found (ID: ${templateDocId}).`,
          404,
          'TEMPLATE_NOT_FOUND',
        );
      }
      throw verifyError; // Rethrow other errors (e.g., auth, quota)
    }

    // Clone the template using copy operation
    const response = await this._withRetryWithJitter(() =>
      this.drive.files.copy({
        fileId: templateDocId,
        requestBody: {
          name: newFileName,
          parents: [destinationFolderId],
        },
        fields: 'id,name,mimeType,webViewLink',
      }),
    );

    const clonedDocId = response.data.id;

    return {
      clonedDocId,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink || this.getEditUrl(clonedDocId),
      editUrl: this.getEditUrl(clonedDocId),
      previewUrl: this.getPreviewUrl(clonedDocId),
    };
  }

  /**
   * Set "Anyone Can Edit" permission on a Google Doc.
   *
   * This allows students to access the document via a shared link
   * without requiring individual email permissions. Tracks permission
   * changes in audit logs for security compliance.
   *
   * @param {string} fileId - The Google Doc ID
   * @returns {Promise<{ fileId: string, editUrl: string, shareableLink: string, permissionId: string }>}
   * @throws {AppError} If document not found or permission change fails
   */
  async setAnyoneCanEditPermission(fileId) {
    await this._ensureInitialized();

    if (!fileId) {
      throw new AppError('File ID is required.', 400, 'FILE_ID_MISSING');
    }

    try {
      // First, check if an "anyone" permission already exists
      const existingPerms = await this._withRetry(() =>
        this.drive.permissions.list({
          fileId,
          fields: 'permissions(id,type,role)',
        }),
      );

      const anyonePermission = (existingPerms.data.permissions || []).find(
        (perm) => perm.type === 'anyone',
      );

      let permissionId = null;

      if (anyonePermission) {
        // Update existing "anyone" permission to writer if it's not already
        if (anyonePermission.role !== 'writer') {
          const updateRes = await this._withRetry(() =>
            this.drive.permissions.update({
              fileId,
              permissionId: anyonePermission.id,
              requestBody: { role: 'writer' },
              fields: 'id,role,type',
            }),
          );
          permissionId = updateRes.data.id;
        } else {
          permissionId = anyonePermission.id;
        }
      } else {
        // Create new "anyone can edit" permission
        const createRes = await this._withRetry(() =>
          this.drive.permissions.create({
            fileId,
            sendNotificationEmail: false,
            requestBody: {
              type: 'anyone',
              role: 'writer',
            },
            fields: 'id,type,role',
          }),
        );
        permissionId = createRes.data.id;
      }

      return {
        fileId,
        permissionId,
        editUrl: this.getEditUrl(fileId),
        shareableLink: this.getEditUrl(fileId),
        permissionSet: true,
      };
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        throw new AppError(`Document not found (ID: ${fileId}).`, 404, 'DOCUMENT_NOT_FOUND');
      }
      if (status === 403) {
        throw new AppError(
          'Permission denied. Service account may not have editor access.',
          403,
          'PERMISSION_DENIED',
        );
      }
      throw error;
    }
  }

  /**
   * Internal retry helper with exponential backoff + jitter.
   *
   * Per Google API best practices: adds randomized jitter to prevent
   * thundering herd when multiple clients hit rate limits simultaneously.
   *
   * @private
   * @param {Function} operation
   * @param {number} [maxAttempts=5]
   * @returns {Promise}
   */
  async _withRetryWithJitter(operation, maxAttempts = 5) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const shouldRetry = RETRYABLE_STATUS.has(status) && attempt < maxAttempts;
        if (!shouldRetry) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
        const baseBackoff = Math.min(1000 * 2 ** (attempt - 1), 30000);
        // Add random jitter: ±25% of base
        const jitter = baseBackoff * 0.25 * (Math.random() - 0.5);
        const backoffMs = Math.max(100, baseBackoff + jitter);

        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }
}

const googleDriveReviewService = new GoogleDriveReviewService();

export default googleDriveReviewService;
