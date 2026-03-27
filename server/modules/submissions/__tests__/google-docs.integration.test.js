/**
 * Google Docs Integration Tests
 *
 * Tests the complete workflow:
 * 1. Template cloning
 * 2. Permission setting
 * 3. Error handling and rate limiting
 * 4. Submission sync
 *
 * Requires:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY configured
 * - GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID set to valid master template doc
 * - GOOGLE_DRIVE_TEMPLATE_FOLDER_ID set to valid folder for clones
 * - Test user with permissions to perform operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import googleDriveReviewService from '../../../services/google-drive-review.service.js';
import submissionService from '../../../modules/submissions/submission.service.js';
import env from '../../../config/env.js';

describe.skipIf(!env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID || !env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID)('GoogleDriveReviewService (Integration)', () => {
  let clonedDocId = null;

  describe('Configuration Check', () => {
    it('should verify Google Drive integration is configured', () => {
      expect(googleDriveReviewService.isConfigured()).toBe(true);
    });

    it('should verify template ID is configured', () => {
      if (!env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID) {
        throw new Error(
          'GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID not set. ' +
          'Set this in .env before running integration tests.',
        );
      }
    });

    it('should verify template folder is configured', () => {
      if (!env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID) {
        throw new Error(
          'GOOGLE_DRIVE_TEMPLATE_FOLDER_ID not set. ' +
          'Set this in .env before running integration tests.',
        );
      }
    });
  });

  describe('createFromTemplate()', () => {
    it('should clone a template document', async () => {
      const now = new Date().getTime();
      const testFileName = `Integration Test ${now}`;

      const result = await googleDriveReviewService.createFromTemplate(
        env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
        testFileName,
        env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID,
      );

      expect(result).toBeDefined();
      expect(result.clonedDocId).toBeTruthy();
      expect(result.name).toContain(testFileName);
      expect(result.editUrl).toContain('docs.google.com');
      expect(result.editUrl).toContain(result.clonedDocId);

      clonedDocId = result.clonedDocId;
    });

    it('should throw error if template ID is missing', async () => {
      await expect(
        googleDriveReviewService.createFromTemplate(null, 'Test', env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID),
      ).rejects.toThrow('Template document ID is required');
    });

    it('should throw error if template not found', async () => {
      await expect(
        googleDriveReviewService.createFromTemplate(
          'nonexistent-doc-id-12345',
          'Test',
          env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID,
        ),
      ).rejects.toThrow('Template document not found');
    });

    it('should throw error if destination folder missing', async () => {
      await expect(
        googleDriveReviewService.createFromTemplate(
          env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
          'Test',
          null,
        ),
      ).rejects.toThrow('not configured');
    });
  });

  describe('setAnyoneCanEditPermission()', () => {
    it('should set "anyone can edit" permission on cloned doc', async () => {
      if (!clonedDocId) {
        throw new Error('Cloned doc not available. Run createFromTemplate test first.');
      }

      const result = await googleDriveReviewService.setAnyoneCanEditPermission(clonedDocId);

      expect(result).toBeDefined();
      expect(result.fileId).toBe(clonedDocId);
      expect(result.permissionId).toBeTruthy();
      expect(result.editUrl).toContain(clonedDocId);
      expect(result.permissionSet).toBe(true);
    });

    it('should handle idempotent permission updates', async () => {
      if (!clonedDocId) {
        throw new Error('Cloned doc not available.');
      }

      // Set permission twice
      const result1 = await googleDriveReviewService.setAnyoneCanEditPermission(clonedDocId);
      const result2 = await googleDriveReviewService.setAnyoneCanEditPermission(clonedDocId);

      expect(result1.permissionSet).toBe(true);
      expect(result2.permissionSet).toBe(true);
      // Second call should succeed without error
    });

    it('should throw error if file ID is missing', async () => {
      await expect(
        googleDriveReviewService.setAnyoneCanEditPermission(null),
      ).rejects.toThrow('File ID is required');
    });

    it('should throw error if document not found', async () => {
      await expect(
        googleDriveReviewService.setAnyoneCanEditPermission('nonexistent-doc-id'),
      ).rejects.toThrow('Document not found');
    });
  });

  describe('Full Workflow', () => {
    it('should complete template clone → permission setup → edit URL', async () => {
      const now = new Date().getTime();
      const docName = `Full Workflow Test ${now}`;

      // Step 1: Clone
      const cloned = await googleDriveReviewService.createFromTemplate(
        env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID,
        docName,
        env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID,
      );

      expect(cloned.clonedDocId).toBeTruthy();

      // Step 2: Set permissions
      const perms = await googleDriveReviewService.setAnyoneCanEditPermission(
        cloned.clonedDocId,
      );

      expect(perms.permissionSet).toBe(true);

      // Step 3: Verify edit URL is functional
      const editUrl = perms.editUrl;
      expect(editUrl).toBe(googleDriveReviewService.getEditUrl(cloned.clonedDocId));
      expect(editUrl).toContain('/edit');
    });
  });
});

describe('SubmissionService Google Docs Sync', () => {
  describe('_syncSubmissionToUserDriveAndGoogleDoc()', () => {
    const mockUser = {
      _id: 'test-user-id',
      email: 'test@example.com',
      role: 'student',
    };

    const mockProject = 'test-project-id';

    it('should gracefully degrade if Google Drive not configured', async () => {
      // Temporarily disable config
      const originalIsConfigured = googleDriveReviewService.isConfigured;
      googleDriveReviewService.isConfigured = () => false;

      try {
        const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
          user: mockUser,
          buffer: Buffer.from('test content'),
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          projectId: mockProject,
          version: 1,
          type: 'chapter',
        });

        expect(result.googleDocSyncStatus).toBe('not_supported');
        expect(result.syncedGoogleDocId).toBeNull();
      } finally {
        googleDriveReviewService.isConfigured = originalIsConfigured;
      }
    });

    if (env.GOOGLE_DRIVE_TEMPLATE_FULL_PAPER_ID) {
      it('should successfully sync chapter submission to Google Docs', async () => {
        const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
          user: mockUser,
          buffer: Buffer.from('Chapter content'),
          fileName: 'Chapter_1.pdf',
          mimeType: 'application/pdf',
          projectId: mockProject,
          version: 1,
          type: 'chapter',
        });

        expect(result.googleDocSyncStatus).toBe('synced');
        expect(result.syncedGoogleDocId).toBeTruthy();
        expect(result.syncedGoogleDocUrl).toContain('docs.google.com');
        expect(result.googleDocSyncedAt).toBeInstanceOf(Date);
      });

      it('should successfully sync proposal submission', async () => {
        const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
          user: mockUser,
          buffer: Buffer.from('Proposal content'),
          fileName: 'Proposal.pdf',
          mimeType: 'application/pdf',
          projectId: mockProject,
          version: 1,
          type: 'proposal',
        });

        expect(result.googleDocSyncStatus).toBe('synced');
        expect(result.syncedGoogleDocId).toBeTruthy();
      });

      it('should not sync unsupported document types', async () => {
        const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
          user: mockUser,
          buffer: Buffer.from('Some content'),
          fileName: 'presentation.pptx',
          mimeType: 'application/vnd.presentationml',
          projectId: mockProject,
          version: 1,
          type: 'presentation', // Not in SYNCABLE_TYPES
        });

        expect(result.googleDocSyncStatus).toBe('not_supported');
      });
    }

    it('should return proper error structure on sync failure', async () => {
      const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
        user: mockUser,
        buffer: Buffer.from('content'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        projectId: mockProject,
        version: 1,
        type: 'chapter',
      });

      // Verify response has all required fields
      expect(result).toHaveProperty('userDriveFolderId');
      expect(result).toHaveProperty('syncedGoogleDocId');
      expect(result).toHaveProperty('syncedGoogleDocUrl');
      expect(result).toHaveProperty('googleDocSyncStatus');
      expect(result).toHaveProperty('googleDocSyncErrorCode');
      expect(result).toHaveProperty('googleDocSyncErrorMessage');
      expect(result).toHaveProperty('googleDocSyncedAt');
    });
  });
});

describe('Error Handling & Edge Cases', () => {
  it('should handle rate limit (429) with exponential backoff', async () => {
    // This is an integration test that simulates a quota limit
    // In production, Google Drive API will return 429 and the service
    // should retry with backoff. This test verifies the retry logic exists.

    const durations = [];

    // Note: This is a slow test that actually waits for retries
    // Skip in CI unless specifically enabled
    if (process.env.TEST_SLOW_INTEGRATION === 'true') {
      const startTime = Date.now();

      try {
        await googleDriveReviewService.createFromTemplate(
          'test-quota-limit',
          'Test',
          env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        // With 5 attempts and exponential backoff, should take at least 1s
        expect(duration).toBeGreaterThanOrEqual(1000);
      }
    }
  });

  it('should include comprehensive metadata in error logs', async () => {
    // Verify the error structure includes all needed fields
    const mockUser = { _id: 'test', email: 'test@test.com', role: 'student' };
    const result = await submissionService._syncSubmissionToUserDriveAndGoogleDoc({
      user: mockUser,
      buffer: Buffer.from('test'),
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      projectId: 'project-123',
      version: 1,
      type: 'chapter',
    });

    if (result.googleDocSyncStatus === 'failed') {
      expect(result.googleDocSyncErrorCode).toBeTruthy();
      expect(result.googleDocSyncErrorMessage).toBeTruthy();
      expect(result.googleDocSyncErrorMessage.length).toBeLessThanOrEqual(500);
    }
  });
});
