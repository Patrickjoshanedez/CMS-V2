import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import teamService from '../../modules/teams/team.service.js';
import Team from '../../modules/teams/team.model.js';
import User from '../../modules/users/user.model.js';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import * as socketService from '../../services/socket.service.js';
import { ROLES } from '@cms/shared';

describe('teamService.assignCommittee - Role Guards & Notification Resolution', () => {
  const instructorId = '65e000000000000000000001';
  const teamId = '65e000000000000000000002';
  const instructorUser = {
    _id: instructorId,
    role: ROLES.INSTRUCTOR,
    firstName: 'Patrick',
    lastName: 'Añedez',
  };

  let mockTeam;

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

    mockTeam = {
      _id: teamId,
      name: 'Team Alpha',
      members: ['65e000000000000000000003'],
      academicYear: '2025-2026',
      adviserId: null,
      secretaryId: null,
      panelistIds: [],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Team, 'findById').mockImplementation(() => createQueryMock(mockTeam));

    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock(null));

    vi.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
    vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-id' });
  });

  it('keeps an archived team roster locked', async () => {
    mockTeam.leaderId = instructorId;
    mockTeam.isLocked = true;
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(
      teamService.unlockTeam(teamId, instructorId, ROLES.INSTRUCTOR),
    ).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
    });
    expect(mockTeam.save).not.toHaveBeenCalled();
  });

  it('rejects member-role changes for an archived project before saving the team', async () => {
    const leaderId = '65e000000000000000000015';
    mockTeam.leaderId = { _id: leaderId };
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(
      teamService.assignMemberRole(
        teamId,
        leaderId,
        '65e000000000000000000016',
        'QA & Technical Documentor',
      ),
    ).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    expect(mockTeam.save).not.toHaveBeenCalled();
  });

  it('rejects leadership transfers for an archived project before saving the team', async () => {
    const leaderId = '65e000000000000000000015';
    mockTeam.leaderId = { _id: leaderId };
    mockTeam.members = [{ _id: '65e000000000000000000016' }];
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(
      teamService.transferLeadership(teamId, leaderId, '65e000000000000000000016'),
    ).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    expect(mockTeam.save).not.toHaveBeenCalled();
  });

  it('rejects Google Docs link updates for an archived project before saving the team', async () => {
    const leaderId = '65e000000000000000000015';
    mockTeam.leaderId = { _id: leaderId };
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(
      teamService.updateGoogleDocLink(teamId, leaderId, 'https://docs.google.com/document/d/test'),
    ).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    expect(mockTeam.save).not.toHaveBeenCalled();
  });

  it('rejects GitHub link updates for an archived project before saving the team', async () => {
    const leaderId = '65e000000000000000000015';
    mockTeam.leaderId = { _id: leaderId };
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(
      teamService.updateGithubLink(teamId, leaderId, 'https://github.com/example/repo'),
    ).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED' });
    expect(mockTeam.save).not.toHaveBeenCalled();
  });

  it('rejects committee changes for an archived project before saving the team', async () => {
    vi.spyOn(User, 'findById').mockImplementation(() => createQueryMock(instructorUser));
    vi.spyOn(Project, 'findOne').mockImplementation(() => createQueryMock({ isArchived: true }));

    await expect(teamService.assignCommittee(teamId, instructorId, {})).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
    });
    expect(mockTeam.save).not.toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects assignment if adviser has role instructor', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      if (id === 'adv-instructor') {
        return createQueryMock({
          _id: 'adv-instructor',
          role: ROLES.INSTRUCTOR,
          firstName: 'Instructor',
          lastName: 'User',
        });
      }
      return createQueryMock(null);
    });

    await expect(
      teamService.assignCommittee(teamId, instructorId, {
        adviserId: 'adv-instructor',
      }),
    ).rejects.toThrow(/Course instructors cannot serve as a capstone adviser/);
  });

  it('rejects assignment if secretary has role instructor', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      if (id === 'sec-instructor') {
        return createQueryMock({
          _id: 'sec-instructor',
          role: 'instructor',
          firstName: 'Instructor',
          lastName: 'User',
        });
      }
      return createQueryMock(null);
    });

    await expect(
      teamService.assignCommittee(teamId, instructorId, {
        secretaryId: 'sec-instructor',
      }),
    ).rejects.toThrow(/Course instructors cannot serve as a committee secretary/);
  });

  it('rejects assignment if any panelist has role instructor', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      return createQueryMock(null);
    });

    vi.spyOn(User, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: 'panel-1', role: 'faculty', firstName: 'Dr.', lastName: 'A' },
        { _id: 'panel-2', role: 'instructor', firstName: 'Prof.', lastName: 'B' },
      ]),
    });

    await expect(
      teamService.assignCommittee(teamId, instructorId, {
        panelistIds: ['panel-1', 'panel-2'],
      }),
    ).rejects.toThrow(/Course instructors cannot serve as defense panelists/);
  });

  it('rejects assignment if student is assigned to committee', async () => {
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      if (id === 'student-adv') {
        return createQueryMock({
          _id: 'student-adv',
          role: ROLES.STUDENT,
          firstName: 'Student',
          lastName: 'Proponent',
        });
      }
      return createQueryMock(null);
    });

    await expect(
      teamService.assignCommittee(teamId, instructorId, {
        adviserId: 'student-adv',
      }),
    ).rejects.toThrow(/Students cannot serve on the faculty committee/);
  });

  it('marks notifications as read and completed when committee is fully assigned (1 adviser, 1 secretary, >=3 panelists)', async () => {
    const adviserId = '65e000000000000000000010';
    const secretaryId = '65e000000000000000000011';
    const panelistIds = [
      '65e000000000000000000012',
      '65e000000000000000000013',
      '65e000000000000000000014',
    ];

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      if (id === adviserId) {
        return createQueryMock({
          _id: adviserId,
          role: ROLES.FACULTY,
          firstName: 'Gio',
          lastName: 'Tan',
        });
      }
      if (id === secretaryId) {
        return createQueryMock({
          _id: secretaryId,
          role: ROLES.FACULTY,
          firstName: 'Leon',
          lastName: 'Mentor',
        });
      }
      return createQueryMock(null);
    });

    vi.spyOn(User, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: panelistIds[0], role: ROLES.FACULTY, firstName: 'P1', lastName: 'L' },
        { _id: panelistIds[1], role: ROLES.FACULTY, firstName: 'P2', lastName: 'M' },
        { _id: panelistIds[2], role: ROLES.FACULTY, firstName: 'P3', lastName: 'N' },
      ]),
    });

    const result = await teamService.assignCommittee(teamId, instructorId, {
      adviserId,
      secretaryId,
      panelistIds,
    });

    expect(result.isFullyAssigned).toBe(true);
    expect(Notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        type: { $in: ['team_formation_pending_committee', 'committee_appointment_required'] },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          isRead: true,
          'metadata.status': 'completed',
          'metadata.requiresCommittee': false,
          'metadata.isFullyAssigned': true,
        }),
      }),
    );
  });

  it('does NOT mark notifications as completed when committee is partially assigned (< 3 panelists)', async () => {
    const adviserId = '65e000000000000000000010';
    const secretaryId = '65e000000000000000000011';
    const panelistIds = ['65e000000000000000000012']; // only 1 panelist

    vi.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === instructorId) return createQueryMock(instructorUser);
      if (id === adviserId) {
        return createQueryMock({
          _id: adviserId,
          role: ROLES.FACULTY,
          firstName: 'Gio',
          lastName: 'Tan',
        });
      }
      if (id === secretaryId) {
        return createQueryMock({
          _id: secretaryId,
          role: ROLES.FACULTY,
          firstName: 'Leon',
          lastName: 'Mentor',
        });
      }
      return createQueryMock(null);
    });

    vi.spyOn(User, 'find').mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue([
          { _id: panelistIds[0], role: ROLES.FACULTY, firstName: 'P1', lastName: 'L' },
        ]),
    });

    const result = await teamService.assignCommittee(teamId, instructorId, {
      adviserId,
      secretaryId,
      panelistIds,
    });

    expect(result.isFullyAssigned).toBe(false);
    expect(Notification.updateMany).not.toHaveBeenCalled();
  });
});
