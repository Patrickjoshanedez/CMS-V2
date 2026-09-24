import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectService from '../../modules/projects/project.service.js';
import Project from '../../modules/projects/project.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import submissionService from '../../modules/submissions/submission.service.js';
import { ROLES, PROJECT_STATUSES } from '@cms/shared';

describe('projectService.getProjectManuscript', () => {
  const projectId = '65e000000000000000000010';
  const teamMemberId = '65e000000000000000000011';
  const outsiderStudentId = '65e000000000000000000012';
  const adviserId = '65e000000000000000000013';

  const mockFileBuffer = Buffer.from('%PDF-1.4 Mock PDF Manuscript Content');

  const createQueryMock = (value) => ({
    select: vi.fn().mockImplementation(() => createQueryMock(value)),
    populate: vi.fn().mockImplementation(() => createQueryMock(value)),
    sort: vi.fn().mockImplementation(() => createQueryMock(value)),
    exec: vi.fn().mockResolvedValue(value),
    then: (resolve) => Promise.resolve(value).then(resolve),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows any authenticated user to stream manuscript for an archived project', async () => {
    const archivedProject = {
      _id: projectId,
      title: 'Archived Capstone on IoT Sensor Networks',
      isArchived: true,
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      teamId: { members: [teamMemberId], leaderId: teamMemberId },
    };

    const mockSubmission = {
      _id: '65e000000000000000000099',
      projectId,
      type: 'final_academic',
      storageKey: 'archives/projects/10/final/final_academic/v1/paper.pdf',
      fileName: 'paper.pdf',
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(archivedProject));
    vi.spyOn(Submission, 'findOne').mockImplementation(() => createQueryMock(mockSubmission));
    vi.spyOn(submissionService, 'getSubmissionFileBuffer').mockResolvedValue({
      buffer: mockFileBuffer,
      fileName: 'paper.pdf',
      fileType: 'application/pdf',
      fileSize: mockFileBuffer.length,
    });

    const user = { _id: outsiderStudentId, role: ROLES.STUDENT };
    const result = await projectService.getProjectManuscript(projectId, user, {
      isDownload: false,
    });

    expect(result).toBeDefined();
    expect(result.buffer).toEqual(mockFileBuffer);
    expect(result.fileName).toBe('paper.pdf');
    expect(result.fileType).toBe('application/pdf');
    expect(submissionService.getSubmissionFileBuffer).toHaveBeenCalledWith(
      mockSubmission._id,
      outsiderStudentId,
      { isDownload: false },
    );
  });

  it('rejects an outsider student accessing an active (non-archived) capstone manuscript with 403', async () => {
    const activeProject = {
      _id: projectId,
      title: 'In-Progress Active Capstone Project',
      isArchived: false,
      projectStatus: PROJECT_STATUSES.ACTIVE,
      teamId: { members: [teamMemberId], leaderId: teamMemberId },
      adviserId,
      panelistIds: [],
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(activeProject));

    const outsiderUser = { _id: outsiderStudentId, role: ROLES.STUDENT };

    await expect(
      projectService.getProjectManuscript(projectId, outsiderUser, { isDownload: false }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('allows the appointed adviser to access an active capstone manuscript', async () => {
    const activeProject = {
      _id: projectId,
      title: 'In-Progress Active Capstone Project',
      isArchived: false,
      projectStatus: PROJECT_STATUSES.ACTIVE,
      teamId: { members: [teamMemberId], leaderId: teamMemberId },
      adviserId,
      panelistIds: [],
    };

    const mockSubmission = {
      _id: '65e000000000000000000098',
      projectId,
      type: 'final_academic',
      storageKey: 'submissions/projects/10/final_academic/v1/paper.pdf',
      fileName: 'paper.pdf',
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(activeProject));
    vi.spyOn(Submission, 'findOne').mockImplementation(() => createQueryMock(mockSubmission));
    vi.spyOn(submissionService, 'getSubmissionFileBuffer').mockResolvedValue({
      buffer: mockFileBuffer,
      fileName: 'paper.pdf',
      fileType: 'application/pdf',
      fileSize: mockFileBuffer.length,
    });

    const adviserUser = { _id: adviserId, role: ROLES.FACULTY };
    const result = await projectService.getProjectManuscript(projectId, adviserUser, {
      isDownload: true,
    });

    expect(result.buffer).toEqual(mockFileBuffer);
    expect(submissionService.getSubmissionFileBuffer).toHaveBeenCalledWith(
      mockSubmission._id,
      adviserId,
      { isDownload: true },
    );
  });

  it('prioritizes explicit type query parameter when requested', async () => {
    const archivedProject = {
      _id: projectId,
      title: 'Archived Capstone with Both Paper and Journal',
      isArchived: true,
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      teamId: { members: [teamMemberId] },
    };

    const mockJournalSubmission = {
      _id: '65e000000000000000000077',
      projectId,
      type: 'final_journal',
      storageKey: 'archives/projects/10/final/final_journal/v1/journal.pdf',
      fileName: 'journal.pdf',
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(archivedProject));
    vi.spyOn(Submission, 'findOne').mockImplementation((query) => {
      if (query.type === 'final_journal') {
        return createQueryMock(mockJournalSubmission);
      }
      return createQueryMock(null);
    });

    vi.spyOn(submissionService, 'getSubmissionFileBuffer').mockResolvedValue({
      buffer: mockFileBuffer,
      fileName: 'journal.pdf',
      fileType: 'application/pdf',
      fileSize: mockFileBuffer.length,
    });

    const user = { _id: outsiderStudentId, role: ROLES.STUDENT };
    const result = await projectService.getProjectManuscript(projectId, user, {
      type: 'final_journal',
    });

    expect(result.fileName).toBe('journal.pdf');
    expect(Submission.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, type: 'final_journal' }),
    );
  });

  it('throws 404 when manuscript submission is not available', async () => {
    const archivedProject = {
      _id: projectId,
      title: 'Archived Capstone without Manuscript File',
      isArchived: true,
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      teamId: { members: [teamMemberId] },
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(archivedProject));
    vi.spyOn(Submission, 'findOne').mockImplementation(() => createQueryMock(null));

    const user = { _id: outsiderStudentId, role: ROLES.STUDENT };

    await expect(
      projectService.getProjectManuscript(projectId, user, { isDownload: false }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'MANUSCRIPT_NOT_FOUND',
    });
  });
});
