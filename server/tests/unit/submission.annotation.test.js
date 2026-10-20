import { afterEach, describe, expect, it, vi } from 'vitest';
import AppError from '../../utils/AppError.js';
import { ROLES } from '@cms/shared';

describe('SubmissionAnnotationService & Facade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds an annotation to a submission and emits notification', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');
    const { default: Notification } =
      await import('../../modules/notifications/notification.model.js');

    const mockSubmission = {
      _id: 'sub-100',
      submittedBy: 'student-1',
      projectId: 'proj-1',
      chapter: 1,
      version: 1,
      annotations: [],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
    vi.spyOn(submissionService, '_getModerationContext').mockResolvedValue({
      reviewer: { _id: 'adviser-1', role: ROLES.FACULTY },
      project: { _id: 'proj-1' },
    });
    vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-1' });

    const result = await submissionService.addAnnotation('sub-100', 'adviser-1', {
      page: 2,
      content: 'Add citation here.',
      selectedText: 'sample statement',
    });

    expect(result.submission).toBe(mockSubmission);
    expect(mockSubmission.annotations).toHaveLength(1);
    expect(mockSubmission.annotations[0].content).toBe('Add citation here.');
    expect(mockSubmission.save).toHaveBeenCalled();
  });

  it('adds a threaded reply to an existing annotation', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');

    const mockAnnotation = {
      _id: 'ann-1',
      content: 'Add citation here.',
      replies: [],
    };

    const mockSubmission = {
      _id: 'sub-100',
      annotations: {
        id: vi.fn((id) => (id === 'ann-1' ? mockAnnotation : null)),
      },
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(submissionService, 'getSubmissionViewContext').mockResolvedValue({
      submission: mockSubmission,
      project: { _id: 'proj-1', isArchived: false },
    });

    const result = await submissionService.addAnnotationReply('sub-100', 'ann-1', 'student-1', {
      content: 'Citation added.',
    });

    expect(result.submission).toBe(mockSubmission);
    expect(mockAnnotation.replies).toHaveLength(1);
    expect(mockAnnotation.replies[0].content).toBe('Citation added.');
    expect(mockSubmission.save).toHaveBeenCalled();
  });

  it('removes an annotation when requested by author', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');

    const mockAnnotation = {
      _id: 'ann-1',
      userId: 'adviser-1',
    };

    const mockSubmission = {
      _id: 'sub-100',
      annotations: {
        id: vi.fn((id) => (id === 'ann-1' ? mockAnnotation : null)),
        pull: vi.fn(),
      },
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
    vi.spyOn(submissionService, '_getModerationContext').mockResolvedValue({
      reviewer: { _id: 'adviser-1' },
      project: { _id: 'proj-1' },
    });

    const result = await submissionService.removeAnnotation(
      'sub-100',
      'ann-1',
      'adviser-1',
      ROLES.FACULTY,
    );

    expect(result.submission).toBe(mockSubmission);
    expect(mockSubmission.annotations.pull).toHaveBeenCalledWith({ _id: 'ann-1' });
    expect(mockSubmission.save).toHaveBeenCalled();
  });

  it('marks an annotation as resolved', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');

    const mockAnnotation = {
      _id: 'ann-1',
      resolved: false,
    };

    const mockSubmission = {
      _id: 'sub-100',
      annotations: {
        id: vi.fn((id) => (id === 'ann-1' ? mockAnnotation : null)),
      },
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Submission, 'findById').mockResolvedValue(mockSubmission);
    vi.spyOn(submissionService, '_getModerationContext').mockResolvedValue({
      reviewer: { _id: 'adviser-1' },
      project: { _id: 'proj-1' },
    });

    const result = await submissionService.markAnnotationResolved('sub-100', 'ann-1', 'adviser-1');

    expect(result.submission).toBe(mockSubmission);
    expect(mockAnnotation.resolved).toBe(true);
    expect(mockAnnotation.resolvedAt).toBeInstanceOf(Date);
    expect(mockSubmission.save).toHaveBeenCalled();
  });
});
