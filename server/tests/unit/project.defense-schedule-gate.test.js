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
});
