import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectService from '../../modules/projects/project.service.js';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import * as socketService from '../../services/socket.service.js';
import { TITLE_STATUSES, ROLES } from '@cms/shared';

describe('projectService.approveTitle - Defense Schedule Prerequisite & Auto-Completion', () => {
  const instructorId = '65e000000000000000000001';
  const projectId = '65e000000000000000000002';

  const mockInstructor = {
    _id: instructorId,
    role: ROLES.INSTRUCTOR,
    firstName: 'Instructor',
    lastName: 'User',
  };

  let mockProject;

  const createQueryMock = (value) => ({
    select: vi.fn().mockImplementation(() => createQueryMock(value)),
    populate: vi.fn().mockImplementation(() => createQueryMock(value)),
    sort: vi.fn().mockImplementation(() => createQueryMock(value)),
    exec: vi.fn().mockResolvedValue(value),
    then: (resolve) => Promise.resolve(value).then(resolve),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});

    mockProject = {
      _id: projectId,
      title: 'Decentralized LoRa-Enabled Evacuation Mesh',
      titleStatus: TITLE_STATUSES.SUBMITTED,
      titleProposals: [
        {
          title: 'Decentralized LoRa-Enabled Evacuation Mesh',
          description: 'A mesh networking solution for rural disaster areas.',
        },
      ],
      titleProposalMetadata: [
        {
          index: 1,
          title: 'Decentralized LoRa-Enabled Evacuation Mesh',
          status: 'submitted',
        },
      ],
      defenseSchedule: null,
      teamId: '65e000000000000000000099',
      adviserId: '65e000000000000000000010',
      panelistIds: ['65e000000000000000000020'],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(mockProject));
    vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-1' });
    vi.spyOn(projectService, '_notifyTeamMembers').mockResolvedValue(true);
    vi.spyOn(projectService, '_assertCanReviewTitle').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects title approval with DEFENSE_SCHEDULE_REQUIRED when defense hearing is not scheduled', async () => {
    mockProject.defenseSchedule = null;

    await expect(
      projectService.approveTitle(projectId, mockInstructor, { proposalId: 0 }),
    ).rejects.toThrow(
      'The proponent team must have a scheduled defense hearing before their title proposal can be approved.',
    );
  });

  it('rejects title approval if defense schedule status is scheduled but date is missing', async () => {
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: null,
    };

    await expect(
      projectService.approveTitle(projectId, mockInstructor, { proposalId: 0 }),
    ).rejects.toThrow(
      'The proponent team must have a scheduled defense hearing before their title proposal can be approved.',
    );
  });

  it('approves title and auto-completes defense schedule when defense hearing is scheduled with date', async () => {
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: new Date('2026-10-15'),
      time: '09:00 AM - 10:00 AM',
      venue: 'COT Conference Room',
    };

    const result = await projectService.approveTitle(projectId, mockInstructor, { proposalId: 0 });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.defenseSchedule.status).toBe('completed');
    expect(result.project.defenseSchedule.verdict).toBe('Passed');
    expect(result.project.defenseSchedule.completedAt).toBeInstanceOf(Date);
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('approves title and maintains completed defense schedule if already completed', async () => {
    mockProject.defenseSchedule = {
      status: 'completed',
      date: new Date('2026-10-10'),
      verdict: 'Passed with Revisions',
    };

    const result = await projectService.approveTitle(projectId, mockInstructor, { proposalId: 0 });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.defenseSchedule.status).toBe('completed');
    expect(result.project.defenseSchedule.verdict).toBe('Passed with Revisions');
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('resiliently handles 1-based proposal index (proposalId: 1 when proposals length is 1)', async () => {
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: new Date('2026-10-15'),
      time: '09:00 AM - 10:00 AM',
      venue: 'COT Conference Room',
    };

    const result = await projectService.approveTitle(projectId, mockInstructor, { proposalId: 1 });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.title).toBe('Decentralized LoRa-Enabled Evacuation Mesh');
    expect(result.project.defenseSchedule.status).toBe('completed');
  });

  it('resiliently resolves proposal matching titleProposalMetadata _id', async () => {
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: new Date('2026-10-15'),
      time: '09:00 AM - 10:00 AM',
      venue: 'COT Conference Room',
    };
    mockProject.titleProposalMetadata = [
      {
        _id: '65e0000000000000000000aa',
        title: 'Decentralized LoRa-Enabled Evacuation Mesh',
        status: 'submitted',
      },
    ];

    const result = await projectService.approveTitle(projectId, mockInstructor, {
      proposalId: '65e0000000000000000000aa',
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.title).toBe('Decentralized LoRa-Enabled Evacuation Mesh');
  });

  it('auto-advances project from DRAFT to SUBMITTED and then APPROVED', async () => {
    mockProject.titleStatus = TITLE_STATUSES.DRAFT;
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: new Date('2026-10-15'),
      time: '09:00 AM - 10:00 AM',
      venue: 'COT Conference Room',
    };

    const result = await projectService.approveTitle(projectId, mockInstructor, { proposalId: 0 });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(mockProject.save).toHaveBeenCalled();
  });

  describe('projectService.rejectTitle - Proposal Deliberation Revision Requests', () => {
    it('successfully requests revision on a project with SUBMITTED status', async () => {
      mockProject.titleStatus = TITLE_STATUSES.SUBMITTED;

      const result = await projectService.rejectTitle(projectId, mockInstructor, {
        reason: 'Proposal Revision Required: Please update methodology.',
        proposalId: 0,
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.REVISION_REQUIRED);
      expect(result.project.rejectionReason).toBe(
        'Proposal Revision Required: Please update methodology.',
      );
      expect(result.project.titleProposalMetadata[0].status).toBe('rejected');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('successfully requests revision when project is in DRAFT status', async () => {
      mockProject.titleStatus = TITLE_STATUSES.DRAFT;

      const result = await projectService.rejectTitle(projectId, mockInstructor, {
        reason: 'Proposal Revision Required: Insufficient problem statement.',
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.REVISION_REQUIRED);
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('successfully requests revision when project was previously APPROVED', async () => {
      mockProject.titleStatus = TITLE_STATUSES.APPROVED;

      const result = await projectService.rejectTitle(projectId, mockInstructor, {
        reason: 'Proposal Revision Required: Committee requested scope adjustment.',
        proposalId: 0,
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.REVISION_REQUIRED);
      expect(result.project.rejectionReason).toBe(
        'Proposal Revision Required: Committee requested scope adjustment.',
      );
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('successfully updates revision reason when project is already REVISION_REQUIRED', async () => {
      mockProject.titleStatus = TITLE_STATUSES.REVISION_REQUIRED;

      const result = await projectService.rejectTitle(projectId, mockInstructor, {
        reason: 'Proposal Revision Required: Additional panel feedback.',
        proposalId: 0,
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.REVISION_REQUIRED);
      expect(result.project.rejectionReason).toBe(
        'Proposal Revision Required: Additional panel feedback.',
      );
      expect(mockProject.save).toHaveBeenCalled();
    });
  });
});
