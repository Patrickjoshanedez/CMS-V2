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

  describe('Proposal Manuscript Adviser Defense Readiness Flow', () => {
    it('sets defenseSchedule.status = pending_scheduling when adviser approves proposal manuscript', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Submission } = await import('../../modules/submissions/submission.model.js');
      const { default: User } = await import('../../modules/users/user.model.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');
      const { default: Notification } =
        await import('../../modules/notifications/notification.model.js');
      const { default: PlagiarismResult } =
        await import('../../modules/plagiarism/plagiarism.model.js');
      const { default: Section } = await import('../../modules/academics/section.model.js');
      const { default: Team } = await import('../../modules/teams/team.model.js');

      const facultyAdviserId = '6aa14c2554d0b79f8e8aa96c';
      const proposalSubmissionId = '6aa49a6217cb643363be1c74';
      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: facultyAdviserId,
        panelistIds: ['6aa14c2554d0b79f8e8aa96d'],
        secretaryId: '6aa14c2554d0b79f8e8aa96e',
        teamId: '6aa14c2554d0b79f8e8aa970',
        sectionId: '6aa14c2554d0b79f8e8aa971',
        defenseSchedule: { status: 'none' },
        save: vi.fn().mockResolvedValue(true),
      };

      const now = new Date();
      const mockSubmission = {
        _id: proposalSubmissionId,
        projectId: mockProject._id,
        chapter: null,
        version: 1,
        type: 'proposal',
        status: SUBMISSION_STATUSES.PENDING,
        updatedAt: now,
        save: vi.fn().mockResolvedValue(true),
        statusHistory: [],
      };

      vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: facultyAdviserId, role: ROLES.FACULTY }),
      });
      vi.spyOn(Project, 'findById').mockImplementation(() => {
        const p = Promise.resolve(mockProject);
        p.select = vi.fn().mockResolvedValue(mockProject);
        p.populate = vi.fn().mockResolvedValue(mockProject);
        return p;
      });
      vi.spyOn(PlagiarismResult, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'completed', overallScore: 5 }),
      });
      vi.spyOn(Section, 'findById').mockResolvedValue({ instructorId: '6aa14c2554d0b79f8e8aa96b' });
      vi.spyOn(Team, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          name: 'AgroSense Team',
          members: ['6aa14c2554d0b79f8e8aa97a'],
          secretaryId: '6aa14c2554d0b79f8e8aa96e',
          panelistIds: ['6aa14c2554d0b79f8e8aa96d'],
          adviserId: facultyAdviserId,
        }),
      });
      vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-1' });

      await submissionService.reviewSubmission(proposalSubmissionId, facultyAdviserId, {
        status: SUBMISSION_STATUSES.APPROVED,
        reviewNote: 'Approved for defense',
      });

      expect(mockSubmission.status).toBe(SUBMISSION_STATUSES.LOCKED);
      expect(mockProject.defenseSchedule.status).toBe('pending_scheduling');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('rejects panelist from endorsing or reviewing proposal with 403 ENDORSEMENT_FORBIDDEN_ROLE', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Submission } = await import('../../modules/submissions/submission.model.js');
      const { default: User } = await import('../../modules/users/user.model.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');

      const facultyAdviserId = '6aa14c2554d0b79f8e8aa96c';
      const facultyPanelistId = '6aa14c2554d0b79f8e8aa96d';
      const proposalSubmissionId = '6aa49a6217cb643363be1c74';

      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: facultyAdviserId,
        panelistIds: [facultyPanelistId],
        secretaryId: null,
      };

      const mockSubmission = {
        _id: proposalSubmissionId,
        projectId: mockProject._id,
        chapter: null,
        type: 'proposal',
        status: SUBMISSION_STATUSES.PENDING,
        updatedAt: new Date(),
      };

      vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: facultyPanelistId, role: ROLES.FACULTY }),
      });
      vi.spyOn(Project, 'findById').mockImplementation(() => {
        const p = Promise.resolve(mockProject);
        p.select = vi.fn().mockResolvedValue(mockProject);
        p.populate = vi.fn().mockResolvedValue(mockProject);
        return p;
      });

      await expect(
        submissionService.reviewSubmission(proposalSubmissionId, facultyPanelistId, {
          status: SUBMISSION_STATUSES.APPROVED,
          reviewNote: 'Trying to endorse as panelist',
        }),
      ).rejects.toThrow(/Only the assigned adviser and course instructor can endorse/i);
    });

    it('allows course instructor to endorse proposal manuscript', async () => {
      const { default: submissionService } =
        await import('../../modules/submissions/submission.service.js');
      const { default: Submission } = await import('../../modules/submissions/submission.model.js');
      const { default: User } = await import('../../modules/users/user.model.js');
      const { default: Project } = await import('../../modules/projects/project.model.js');
      const { default: PlagiarismResult } =
        await import('../../modules/plagiarism/plagiarism.model.js');
      const { default: Section } = await import('../../modules/academics/section.model.js');
      const { default: Team } = await import('../../modules/teams/team.model.js');
      const { default: Notification } =
        await import('../../modules/notifications/notification.model.js');

      const instructorId = '6aa14c2554d0b79f8e8aa96b';
      const proposalSubmissionId = '6aa49a6217cb643363be1c74';

      const mockProject = {
        _id: '6aa151f9105a281923367325',
        title: 'AgroSense AI',
        adviserId: '6aa14c2554d0b79f8e8aa96c',
        panelistIds: ['6aa14c2554d0b79f8e8aa96d'],
        secretaryId: null,
        teamId: '6aa14c2554d0b79f8e8aa970',
        sectionId: '6aa14c2554d0b79f8e8aa971',
        defenseSchedule: { status: 'none' },
        save: vi.fn().mockResolvedValue(true),
      };

      const mockSubmission = {
        _id: proposalSubmissionId,
        projectId: mockProject._id,
        chapter: null,
        version: 1,
        type: 'proposal',
        status: SUBMISSION_STATUSES.PENDING,
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
        statusHistory: [],
      };

      vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: instructorId, role: ROLES.INSTRUCTOR }),
      });
      vi.spyOn(Project, 'findById').mockImplementation(() => {
        const p = Promise.resolve(mockProject);
        p.select = vi.fn().mockResolvedValue(mockProject);
        p.populate = vi.fn().mockResolvedValue(mockProject);
        return p;
      });
      vi.spyOn(PlagiarismResult, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'completed', overallScore: 5 }),
      });
      vi.spyOn(Section, 'findById').mockResolvedValue({ instructorId });
      vi.spyOn(Team, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          name: 'AgroSense Team',
          members: ['6aa14c2554d0b79f8e8aa97a'],
          secretaryId: null,
          panelistIds: [],
          adviserId: '6aa14c2554d0b79f8e8aa96c',
        }),
      });
      vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-1' });

      await submissionService.reviewSubmission(proposalSubmissionId, instructorId, {
        status: SUBMISSION_STATUSES.APPROVED,
        reviewNote: 'Instructor approved for defense',
      });

      expect(mockSubmission.status).toBe(SUBMISSION_STATUSES.LOCKED);
      expect(mockProject.defenseSchedule.status).toBe('pending_scheduling');
    });
  });
});
