import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppError from '../../utils/AppError.js';
import { ROLES, SUBMISSION_STATUSES } from '@cms/shared';

describe('SubmissionService — Faculty Committee Review & Concurrency Flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Committee membership & viewing authorization', () => {
    it('allows faculty assigned as adviser, panelist, or secretary to view submissions', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Submission } = await import('../../modules/submissions/submission.model.js');
      const { default: User } = await import('../../modules/users/user.model.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');

      const facultyAdviserId = '6aa14c2554d0b79f8e8aa96c';
      const facultyPanelistId = '6aa14c2554d0b79f8e8aa96d';
      const facultySecretaryId = '6aa14c2554d0b79f8e8aa96e';
      const unrelatedFacultyId = '6aa14c2554d0b79f8e8aa999';

      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: facultyAdviserId,
        panelistIds: [facultyPanelistId],
        secretaryId: facultySecretaryId,
        teamId: { _id: 'team-1', members: ['student-1'] },
      };

      const mockSubmission = {
        _id: 'sub-001',
        projectId: mockProject._id,
        chapter: 1,
        version: 1,
        type: 'chapter',
        status: SUBMISSION_STATUSES.PENDING,
        populate: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Submission, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSubmission),
        populate: vi.fn().mockResolvedValue(mockSubmission),
      });

      vi.spyOn(Project, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProject),
        select: vi.fn().mockResolvedValue(mockProject),
      });

      // 1. Faculty Adviser can view
      const adviserUser = { _id: facultyAdviserId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanViewSubmission(adviserUser, mockProject, mockSubmission),
      ).not.toThrow();

      // 2. Faculty Panelist can view
      const panelistUser = { _id: facultyPanelistId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanViewSubmission(panelistUser, mockProject, mockSubmission),
      ).not.toThrow();

      // 3. Faculty Secretary can view
      const secretaryUser = { _id: facultySecretaryId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanViewSubmission(secretaryUser, mockProject, mockSubmission),
      ).not.toThrow();

      // 4. Unrelated Faculty receives 403
      const unrelatedUser = { _id: unrelatedFacultyId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanViewSubmission(unrelatedUser, mockProject, mockSubmission),
      ).toThrow(AppError);
    });

    it('allows faculty adviser to moderate but rejects secretary from moderating', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');

      const facultyAdviserId = '6aa14c2554d0b79f8e8aa96c';
      const facultySecretaryId = '6aa14c2554d0b79f8e8aa96e';

      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: facultyAdviserId,
        panelistIds: [],
        secretaryId: facultySecretaryId,
        teamId: { _id: 'team-1', members: ['student-1'] },
      };

      const mockSubmission = {
        _id: 'sub-001',
        projectId: mockProject._id,
        chapter: 1,
        version: 1,
        type: 'chapter',
        status: SUBMISSION_STATUSES.PENDING,
      };

      vi.spyOn(Project, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProject),
        select: vi.fn().mockResolvedValue(mockProject),
      });

      // Adviser can moderate
      const adviserUser = { _id: facultyAdviserId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanModerateSubmission(adviserUser, mockProject),
      ).not.toThrow();

      // Secretary cannot moderate
      const secretaryUser = { _id: facultySecretaryId, role: ROLES.FACULTY };
      expect(() =>
        submissionService._assertCanModerateSubmission(secretaryUser, mockProject),
      ).toThrow(AppError);
    });
  });

  describe('Concurrency & Collision Prevention', () => {
    it('throws 409 Conflict when expectedUpdatedAt does not match submission.updatedAt', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Submission } = await import('../../modules/submissions/submission.model.js');
      const { default: User } = await import('../../modules/users/user.model.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');

      const facultyAdviserId = '6aa14c2554d0b79f8e8aa96c';
      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: facultyAdviserId,
        panelistIds: [],
        secretaryId: null,
      };

      const originalTimestamp = new Date('2026-09-09T10:00:00Z');
      const concurrentTimestamp = new Date('2026-09-09T10:05:00Z');

      const mockSubmission = {
        _id: 'sub-001',
        projectId: mockProject._id,
        chapter: 1,
        version: 1,
        type: 'chapter',
        status: SUBMISSION_STATUSES.PENDING,
        updatedAt: concurrentTimestamp,
        save: vi.fn().mockResolvedValue(true),
        statusHistory: [],
      };

      vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: facultyAdviserId, role: ROLES.FACULTY }),
      });
      vi.spyOn(Project, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockProject),
      });

      // Submit with stale timestamp
      await expect(
        submissionService.reviewSubmission('sub-001', facultyAdviserId, {
          status: SUBMISSION_STATUSES.APPROVED,
          reviewNote: 'Looks great',
          expectedUpdatedAt: originalTimestamp.toISOString(),
        }),
      ).rejects.toThrow(/concurrently updated|Please refresh/i);
    });
  });
});
