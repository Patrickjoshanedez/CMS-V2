import { describe, it, expect, vi, beforeEach } from 'vitest';
import deadlineNotificationService from '../../modules/settings/deadlineNotification.service.js';
import MilestoneDeadline from '../../modules/settings/milestoneDeadline.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import User from '../../modules/users/user.model.js';
import Project from '../../modules/projects/project.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import * as socketService from '../../services/socket.service.js';

describe('DeadlineNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Formatting helpers', () => {
    it('getDeliverableLabel correctly formats canonical deliverable keys', () => {
      expect(deadlineNotificationService.getDeliverableLabel('title_proposal')).toBe(
        'Title Proposal',
      );
      expect(deadlineNotificationService.getDeliverableLabel('chapters_1_3')).toBe(
        'Chapters 1–3 Manuscript',
      );
      expect(deadlineNotificationService.getDeliverableLabel('full_academic_paper')).toBe(
        'Full Academic Paper',
      );
      expect(deadlineNotificationService.getDeliverableLabel('condensed_journal_paper')).toBe(
        'Condensed Journal Paper',
      );
      expect(deadlineNotificationService.getDeliverableLabel('custom_deliverable')).toBe(
        'custom deliverable',
      );
    });

    it('formatDeadlineDate handles null, undefined and valid dates', () => {
      expect(deadlineNotificationService.formatDeadlineDate(null)).toBe('TBD');
      expect(deadlineNotificationService.formatDeadlineDate(undefined)).toBe('TBD');
      const formatted = deadlineNotificationService.formatDeadlineDate('2026-10-15T23:59:59.999Z');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });
  });

  describe('isDeliverableSubmitted', () => {
    it('returns true for title_proposal if titleStatus is approved', async () => {
      const project = { _id: 'proj-1', titleApproved: true, titleStatus: 'approved' };
      const isSubmitted = await deadlineNotificationService.isDeliverableSubmitted(
        project,
        'title_proposal',
      );
      expect(isSubmitted).toBe(true);
    });

    it('returns false for title_proposal if not approved', async () => {
      const project = { _id: 'proj-1', titleApproved: false, titleStatus: 'pending' };
      const isSubmitted = await deadlineNotificationService.isDeliverableSubmitted(
        project,
        'title_proposal',
      );
      expect(isSubmitted).toBe(false);
    });

    it('queries Submission for chapter deliverables', async () => {
      const findOneSpy = vi.spyOn(Submission, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'sub-1', status: 'approved' }),
      });

      const project = { _id: 'proj-1' };
      const isSubmitted = await deadlineNotificationService.isDeliverableSubmitted(
        project,
        'chapter_1',
      );
      expect(isSubmitted).toBe(true);
      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          type: 'chapter',
          chapter: 1,
        }),
      );
    });
  });

  describe('notifyDeadlineScheduled', () => {
    it('queries students and dispatches deadlines_set notifications', async () => {
      const mockStudents = [
        { _id: 'student-1', firstName: 'Alice', lastName: 'Cruz' },
        { _id: 'student-2', firstName: 'Bob', lastName: 'Reyes' },
      ];

      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockStudents),
        }),
      });

      const notifCreateSpy = vi.spyOn(Notification, 'create').mockImplementation(async (data) => ({
        _id: 'notif-' + data.userId,
        ...data,
      }));

      const emitSpy = vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});

      const deadline = {
        _id: 'dl-1',
        title: 'Capstone 1 Proposal Submission',
        deliverable: 'title_proposal',
        stage: 'capstone_1',
        deadlineDate: new Date('2026-10-15T23:59:59.999Z'),
        targetType: 'section',
        sectionId: 'sec-1',
      };

      const count = await deadlineNotificationService.notifyDeadlineScheduled(deadline);
      expect(count).toBe(2);
      expect(notifCreateSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledWith('student-1', 'notification:new', expect.any(Object));
      expect(emitSpy).toHaveBeenCalledWith('student-2', 'notification:new', expect.any(Object));
    });
  });

  describe('checkAndDispatchDueDeadlines', () => {
    it('dispatches deadline_due notification for unsubmitted students and prevents duplicate notifications', async () => {
      const pastDeadline = {
        _id: 'dl-past-1',
        title: 'Midterm Manuscript Submission',
        deliverable: 'chapters_1_3',
        stage: 'capstone_2',
        deadlineDate: new Date(Date.now() - 10000), // In the past
        allowLateSubmission: true,
        targetType: 'batch',
      };

      vi.spyOn(MilestoneDeadline, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([pastDeadline]),
        }),
      });

      const mockStudents = [{ _id: 'student-due-1', teamId: 'team-1', sectionId: 'sec-1' }];

      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockStudents),
        }),
      });

      // Student has not been notified yet
      const notifFindOneSpy = vi.spyOn(Notification, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      vi.spyOn(Project, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'proj-1' }),
      });

      vi.spyOn(Submission, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // Unsubmitted
      });

      const notifCreateSpy = vi.spyOn(Notification, 'create').mockImplementation(async (data) => ({
        _id: 'notif-due-1',
        ...data,
      }));

      const emitSpy = vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});

      const result = await deadlineNotificationService.checkAndDispatchDueDeadlines();
      expect(result.deadlinesChecked).toBe(1);
      expect(result.notificationsCreated).toBe(1);
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-due-1',
          type: 'deadline_due',
          title: expect.stringContaining('Submission Deadline Reached'),
        }),
      );
      expect(emitSpy).toHaveBeenCalledWith('student-due-1', 'notification:new', expect.any(Object));

      // Second check: simulate student already notified
      notifFindOneSpy.mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'existing-notif' }),
      });

      const secondResult = await deadlineNotificationService.checkAndDispatchDueDeadlines();
      expect(secondResult.notificationsCreated).toBe(0); // 0 new notifications created due to idempotency
    });
  });
});
