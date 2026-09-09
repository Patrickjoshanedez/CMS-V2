import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppError from '../../utils/AppError.js';

describe('SubmissionService.getSubmissionRevisionDiff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retrieves revision diff comparing target submission with previous version', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');
    const { default: User } = await import('../../modules/users/user.model.js');
    const { default: Project } = await import('../../modules/projects/project.model.js');

    const targetSub = {
      _id: 'sub-002',
      projectId: 'proj-123',
      chapter: 1,
      version: 2,
      fileName: 'Chapter1_v2.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: 'Revised text with new findings.',
      annotations: [],
      populate: vi.fn().mockResolvedValue(true),
    };

    const prevSub = {
      _id: 'sub-001',
      projectId: 'proj-123',
      chapter: 1,
      version: 1,
      fileName: 'Chapter1_v1.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: 'Original text.',
      annotations: [
        {
          _id: 'ann-1',
          content: 'Clarify this paragraph.',
          selectedText: 'Original text',
          userId: {
            firstName: 'Allan',
            lastName: 'Adviser',
            email: 'adviser@buksu.edu.ph',
            role: 'faculty',
          },
          resolved: false,
          replies: [],
        },
      ],
      populate: vi.fn().mockResolvedValue(true),
    };

    const mockUser = { _id: 'user-1', role: 'student', teamId: 'team-1' };
    const mockProject = { _id: 'proj-123', teamId: { _id: 'team-1', members: ['user-1'] } };

    vi.spyOn(Submission, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(targetSub),
    });
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
    vi.spyOn(Project, 'findById').mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockProject),
    });
    vi.spyOn(submissionService, '_assertCanViewSubmission').mockReturnValue(true);

    vi.spyOn(Submission, 'find').mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: 'sub-001',
            version: 1,
            chapter: 1,
            type: 'chapter',
            fileName: 'Chapter1_v1.docx',
          },
        ]),
      }),
    });

    vi.spyOn(Submission, 'findOne').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(prevSub),
      }),
    });

    const diff = await submissionService.getSubmissionRevisionDiff('sub-002', 'user-1');

    expect(diff).toHaveProperty('current');
    expect(diff).toHaveProperty('previous');
    expect(diff).toHaveProperty('availableVersions');
    expect(diff.current.id).toBe('sub-002');
    expect(diff.current.version).toBe(2);
    expect(diff.previous.id).toBe('sub-001');
    expect(diff.previous.version).toBe(1);
    expect(diff.previous.extractedText).toBe('Original text.');
    expect(diff.previous.annotations.length).toBe(1);
    expect(diff.availableVersions.length).toBe(1);
  });

  it('throws 404 when target submission is not found', async () => {
    const { default: submissionService } =
      await import('../../modules/submissions/submission.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');

    vi.spyOn(Submission, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(
      submissionService.getSubmissionRevisionDiff('nonexistent-id', 'user-1'),
    ).rejects.toThrow(AppError);
  });
});
