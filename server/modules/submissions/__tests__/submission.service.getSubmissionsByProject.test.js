import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../submission.model.js', () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../projects/project.model.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('../../users/user.model.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

import Submission from '../submission.model.js';
import Project from '../../projects/project.model.js';
import User from '../../users/user.model.js';
import submissionService from '../submission.service.js';
import { ROLES } from '@cms/shared';

describe('submissionService.getSubmissionsByProject', () => {
  const projectId = '64b64c0f0000000000000001';
  const requesterId = '64b64c0f0000000000000002';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns submissions for an authorized instructor without throwing a ROLES reference error', async () => {
    const deadlineInfo = { deadlineField: 'chapterDeadline', deadlineAt: new Date('2025-01-01') };

    Project.findById.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: projectId,
        projectStatus: 'active',
        adviserId: null,
        panelistIds: [],
        teamId: null,
      }),
    });

    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: requesterId,
        role: ROLES.INSTRUCTOR,
      }),
    });

    const submissionDoc = {
      toObject: () => ({
        _id: '64b64c0f0000000000000003',
        projectId,
        chapter: 1,
        version: 1,
        status: 'under_review',
      }),
    };

    Submission.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockResolvedValue([submissionDoc]),
    });
    Submission.countDocuments.mockResolvedValue(1);

    vi.spyOn(submissionService, '_resolveSubmissionDeadlineInfo').mockReturnValue(deadlineInfo);

    const result = await submissionService.getSubmissionsByProject(
      projectId,
      { page: 1, limit: 100 },
      requesterId,
    );

    expect(result.submissions).toHaveLength(1);
    expect(result.submissions[0].deadlineField).toBe('chapterDeadline');
    expect(result.pagination).toEqual({
      page: 1,
      limit: 100,
      total: 1,
      pages: 1,
    });
  });
});
