/**
 * Integration Tests for Plagiarism-Enhanced Submission Review Workflow
 *
 * Tests the critical path: submission → plagiarism check → review → approval/rejection
 * Validates threshold enforcement, RBAC, and error handling.
 *
 * Run with: npm test -- submission.service.plagiarism.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Submission from '../submission.model.js';
import PlagiarismResult from '../../plagiarism/plagiarism.model.js';
import Project from '../../projects/project.model.js';
import User from '../../users/user.model.js';
import Notification from '../../notifications/notification.model.js';
import submissionService from '../submission.service.js';
import { AppError } from '../../../utils/AppError.js';
import { SUBMISSION_STATUSES, PLAGIARISM_STATUSES, PROJECT_STATUSES } from '@cms/shared';

describe('Submission Review with Plagiarism Check Integration', () => {
  let studentUser, adviserUser, project, submission;

  beforeEach(async () => {
    // Clear relevant collections
    await Promise.all([
      Submission.deleteMany({}),
      PlagiarismResult.deleteMany({}),
      Project.deleteMany({}),
      User.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // Create test users
    studentUser = await User.create({
      firstName: 'Test',
      lastName: 'Student',
      email: 'student@test.com',
      password: 'password',
      role: 'student',
    });

    adviserUser = await User.create({
      firstName: 'Test',
      lastName: 'Adviser',
      email: 'adviser@test.com',
      password: 'password',
      role: 'adviser',
    });

    // Create test project
    project = await Project.create({
      title: 'Test Capstone Project',
      teamId: new mongoose.Types.ObjectId(),
      academicYear: '2025-2026',
      projectStatus: PROJECT_STATUSES.ACTIVE,
      adviserId: adviserUser._id,
    });

    // Create test submission
    submission = await Submission.create({
      projectId: project._id,
      type: 'chapter',
      chapter: 1,
      version: 1,
      fileName: 'chapter1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      storageKey: 'uploads/test-chapter1.pdf',
      status: SUBMISSION_STATUSES.UNDER_REVIEW,
      submittedBy: studentUser._id,
    });
  });

  describe('Plagiarism Check Enforcement', () => {
    it('should block approval if plagiarism check not completed', async () => {
      // No plagiarism result exists
      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
          reviewNote: 'Looks good',
        }),
      ).rejects.toThrow(AppError);

      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
          reviewNote: 'Looks good',
        }),
      ).rejects.toThrow('Plagiarism check must be completed');
    });

    it('should block approval if plagiarism check still pending', async () => {
      // Create pending plagiarism result
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.PENDING,
      });

      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
        }),
      ).rejects.toThrow('Plagiarism check must be completed');
    });

    it('should block approval if plagiarism check failed', async () => {
      // Create failed plagiarism result
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.FAILED,
        error: 'Document extraction failed',
      });

      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
        }),
      ).rejects.toThrow('Plagiarism check must be completed');
    });

    it('should block approval if similarity exceeds threshold', async () => {
      // Set threshold to 50% (default)
      process.env.PLAGIARISM_REJECT_THRESHOLD = '50';

      // Create plagiarism result with 65% similarity
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 65.0,
        textMatches: [
          {
            documentId: 'other-submission-id',
            title: 'Previous Chapter 1',
            matchPercentage: 65.0,
            spans: [{ start: 0, end: 1000 }],
          },
        ],
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
        }),
      ).rejects.toThrow('Plagiarism score (65.0%) exceeds threshold (50%)');
    });

    it('should allow approval if similarity below threshold', async () => {
      // Set threshold to 50%
      process.env.PLAGIARISM_REJECT_THRESHOLD = '50';

      // Create plagiarism result with 30% similarity (below threshold)
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 30.0,
        textMatches: [
          {
            documentId: 'other-submission-id',
            title: 'Previous Chapter 1',
            matchPercentage: 30.0,
            spans: [{ start: 0, end: 500 }],
          },
        ],
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
        reviewNote: 'Good work!',
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.LOCKED);
      expect(result.submission.reviewedBy.toString()).toBe(adviserUser._id.toString());
      expect(result.submission.reviewNote).toBe('Good work!');
    });

    it('should allow approval if similarity exactly at threshold', async () => {
      // Set threshold to 50%
      process.env.PLAGIARISM_REJECT_THRESHOLD = '50';

      // Create plagiarism result with exactly 50% similarity
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 50.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.LOCKED);
    });

    it('should use configurable threshold from environment', async () => {
      // Set custom threshold to 70%
      process.env.PLAGIARISM_REJECT_THRESHOLD = '70';

      // Create plagiarism result with 65% similarity (below new threshold)
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 65.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.LOCKED);

      // Now test with 75% (above threshold)
      const submission2 = await Submission.create({
        projectId: project._id,
        type: 'chapter',
        chapter: 2,
        version: 1,
        fileName: 'chapter2.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        storageKey: 'uploads/test-chapter2.pdf',
        status: SUBMISSION_STATUSES.UNDER_REVIEW,
        submittedBy: studentUser._id,
      });

      await PlagiarismResult.create({
        submissionId: submission2._id,
        taskId: 'test-task-456',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 75.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      await expect(
        submissionService.reviewSubmission(submission2._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.APPROVED,
        }),
      ).rejects.toThrow('Plagiarism score (75.0%) exceeds threshold (70%)');
    });
  });

  describe('Plagiarism Check Not Required for Revisions/Rejection', () => {
    it('should allow revisions request without plagiarism check', async () => {
      // No plagiarism result exists
      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        reviewNote: 'Please fix formatting',
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.REVISIONS_REQUIRED);
      expect(result.submission.reviewNote).toBe('Please fix formatting');
    });

    it('should allow rejection without plagiarism check', async () => {
      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.REJECTED,
        reviewNote: 'Does not meet requirements',
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.REJECTED);
      expect(result.submission.reviewNote).toBe('Does not meet requirements');
    });
  });

  describe('Submission Locking After Approval', () => {
    beforeEach(async () => {
      // Create passing plagiarism result
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 20.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });
    });

    it('should lock submission after approval', async () => {
      const result = await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      expect(result.submission.status).toBe(SUBMISSION_STATUSES.LOCKED);
    });

    it('should prevent re-review of locked submission', async () => {
      // First approval
      await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      // Try to review again
      await expect(
        submissionService.reviewSubmission(submission._id, adviserUser._id, {
          status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        }),
      ).rejects.toThrow('Cannot review a locked submission');
    });
  });

  describe('Proposal Approval Project Transition', () => {
    beforeEach(async () => {
      // Create proposal submission
      submission = await Submission.create({
        projectId: project._id,
        type: 'proposal',
        version: 1,
        fileName: 'proposal.pdf',
        fileType: 'application/pdf',
        fileSize: 2048000,
        storageKey: 'uploads/test-proposal.pdf',
        status: SUBMISSION_STATUSES.UNDER_REVIEW,
        submittedBy: studentUser._id,
      });

      // Update project status to proposal submitted
      project.projectStatus = PROJECT_STATUSES.PROPOSAL_SUBMITTED;
      await project.save();

      // Create passing plagiarism result
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-proposal',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 15.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });
    });

    it('should transition project status when proposal approved', async () => {
      await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject.projectStatus).toBe(PROJECT_STATUSES.PROPOSAL_APPROVED);
    });

    it('should not transition project if not proposal type', async () => {
      // Create chapter submission
      const chapterSubmission = await Submission.create({
        projectId: project._id,
        type: 'chapter',
        chapter: 2,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        storageKey: 'uploads/chapter1.pdf',
        status: SUBMISSION_STATUSES.UNDER_REVIEW,
        submittedBy: studentUser._id,
      });

      await PlagiarismResult.create({
        submissionId: chapterSubmission._id,
        taskId: 'test-task-chapter',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 10.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });

      await submissionService.reviewSubmission(chapterSubmission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
      });

      const updatedProject = await Project.findById(project._id);
      // Status should remain PROPOSAL_SUBMITTED (not changed)
      expect(updatedProject.projectStatus).toBe(PROJECT_STATUSES.PROPOSAL_SUBMITTED);
    });
  });

  describe('Notifications After Review', () => {
    beforeEach(async () => {
      await PlagiarismResult.create({
        submissionId: submission._id,
        taskId: 'test-task-123',
        status: PLAGIARISM_STATUSES.COMPLETED,
        similarityPercentage: 25.0,
        checkedAt: new Date(),
        completedAt: new Date(),
      });
    });

    it('should create notification when submission approved', async () => {
      await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.APPROVED,
        reviewNote: 'Well done!',
      });

      const notifications = await Notification.find({ userId: studentUser._id });
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('submission_approved');
      expect(notifications[0].title).toBe('Submission Reviewed');
      expect(notifications[0].message).toContain('approved & locked');
    });

    it('should create notification when revisions requested', async () => {
      await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        reviewNote: 'Please add more references',
      });

      const notifications = await Notification.find({ userId: studentUser._id });
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('submission_revisions_required');
      expect(notifications[0].message).toContain('sent back for revisions');
    });

    it('should create notification when submission rejected', async () => {
      await submissionService.reviewSubmission(submission._id, adviserUser._id, {
        status: SUBMISSION_STATUSES.REJECTED,
        reviewNote: 'Does not meet requirements',
      });

      const notifications = await Notification.find({ userId: studentUser._id });
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('submission_rejected');
      expect(notifications[0].message).toContain('rejected');
    });
  });
});
