import { afterEach, describe, expect, it, vi } from 'vitest';

describe('SubmissionReviewWorkspaceService & TeamTemplateService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves submission feedback with full submitter name fields', async () => {
    const { default: submissionReviewWorkspaceService } =
      await import('../../modules/submissions/services/submissionReviewWorkspace.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');
    const { default: User } = await import('../../modules/users/user.model.js');
    const { default: Project } = await import('../../modules/projects/project.model.js');

    const mockSubmission = {
      _id: 'sub-feedback-1',
      projectId: { _id: 'proj-1', title: 'Smart Farming IoT' },
      chapter: 1,
      version: 1,
      status: 'pending',
      submittedBy: {
        _id: 'user-stud-1',
        firstName: 'Maria',
        middleName: 'Santos',
        lastName: 'Clara',
        email: 'maria@student.buksu.edu.ph',
      },
      createdAt: new Date(),
      annotations: [],
    };

    const mockUser = { _id: 'user-adviser-1', role: 'faculty', teamId: null };
    const mockProject = { _id: 'proj-1', title: 'Smart Farming IoT', teamId: { members: [] } };

    vi.spyOn(Submission, 'findById').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockSubmission),
    });
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
    vi.spyOn(Project, 'findById').mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockProject),
    });

    const result = await submissionReviewWorkspaceService.getSubmissionFeedback(
      'sub-feedback-1',
      'user-adviser-1',
      'faculty',
    );

    expect(result.feedback).toBeDefined();
    expect(result.feedback.submissionId).toBe('sub-feedback-1');
    expect(result.feedback.submittedBy.firstName).toBe('Maria');
    expect(result.feedback.submittedBy.lastName).toBe('Clara');
  });

  it('retrieves multi-member version history without restricting by single submitter', async () => {
    const { default: submissionReviewWorkspaceService } =
      await import('../../modules/submissions/services/submissionReviewWorkspace.service.js');
    const { default: Submission } = await import('../../modules/submissions/submission.model.js');
    const { default: User } = await import('../../modules/users/user.model.js');
    const { default: Project } = await import('../../modules/projects/project.model.js');

    const mockCurrentSub = {
      _id: 'sub-2',
      projectId: 'proj-1',
      chapter: 1,
      version: 2,
      submittedBy: { _id: 'member-2', firstName: 'Bob' },
    };

    const mockVersions = [
      {
        _id: 'sub-2',
        version: 2,
        chapter: 1,
        submittedBy: { firstName: 'Bob', lastName: 'Developer' },
        status: 'approved',
      },
      {
        _id: 'sub-1',
        version: 1,
        chapter: 1,
        submittedBy: { firstName: 'Alice', lastName: 'Lead' },
        status: 'rejected',
      },
    ];

    vi.spyOn(Submission, 'findById').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockCurrentSub),
    });
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'user-1' }),
    });
    vi.spyOn(Project, 'findById').mockReturnValue({
      populate: vi.fn().mockResolvedValue({ _id: 'proj-1', teamId: { members: [] } }),
    });
    vi.spyOn(Submission, 'find').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockVersions),
    });

    const result = await submissionReviewWorkspaceService.getSubmissionVersions(
      'sub-2',
      'user-1',
      'student',
    );

    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].version).toBe(2);
    expect(result.versions[1].version).toBe(1);
    expect(result.versions[1].submittedBy.firstName).toBe('Alice');
  });

  it('resolves team manuscript template via TeamTemplateService', async () => {
    const { default: teamTemplateService } =
      await import('../../modules/teams/services/teamTemplate.service.js');
    const { default: Team } = await import('../../modules/teams/team.model.js');
    const { default: Project } = await import('../../modules/projects/project.model.js');
    const { default: DocumentTemplate } =
      await import('../../modules/teams/documentTemplate.model.js');

    vi.spyOn(Team, 'findById').mockResolvedValue({
      _id: 'team-1',
      academicYear: '2025-2026',
    });
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: 'proj-1',
      title: 'Approved IoT Project',
      titleStatus: 'approved',
    });
    vi.spyOn(DocumentTemplate, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        targetType: 'MANUSCRIPT_CHAPTERS_1_5',
        versionLabel: 'AY 2025–2026 v2.1',
        distributionType: 'GOOGLE_DOCS',
        resourcePayload: { googleDocsUrl: 'https://docs.google.com/test' },
        updatedAt: new Date(),
      }),
    });

    const result = await teamTemplateService.getTeamManuscriptTemplate('team-1');
    expect(result.isUnlocked).toBe(true);
    expect(result.approvedTitle).toBe('Approved IoT Project');
    expect(result.template.url).toBe('https://docs.google.com/test');
  });
});
