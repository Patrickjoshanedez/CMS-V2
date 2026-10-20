import { beforeEach, describe, expect, it, vi } from 'vitest';
import Team from '../../modules/teams/team.model.js';
import TeamInvite from '../../modules/teams/teamInvite.model.js';
import User from '../../modules/users/user.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import teamService from '../../modules/teams/team.service.js';

const teamId = '65e000000000000000000210';
const leaderId = '65e000000000000000000211';
const memberId = '65e000000000000000000212';

const createTeam = (overrides = {}) => ({
  _id: teamId,
  name: 'Synthetic Workflow Team',
  leaderId,
  members: [leaderId],
  memberRoles: [],
  academicTerm: '1st Semester',
  sectionId: '65e000000000000000000213',
  isLocked: false,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Phase 0 roster-finalization gates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Team, 'findById');
    vi.spyOn(TeamInvite, 'updateMany');
    vi.spyOn(Notification, 'create');
    vi.spyOn(User, 'find');
  });

  it('requires at least one student before finalizing a team', async () => {
    const team = createTeam({ members: [] });
    Team.findById.mockResolvedValue(team);

    await expect(teamService.lockTeam(teamId, leaderId)).rejects.toMatchObject({
      code: 'TEAM_INSUFFICIENT_MEMBERS',
    });
    expect(User.find).not.toHaveBeenCalled();
    expect(team.save).not.toHaveBeenCalled();
  });

  it('requires a standardized role for every member before finalizing a team', async () => {
    const team = createTeam({
      members: [leaderId, memberId],
      memberRoles: [{ userId: leaderId, role: 'Project Lead & Systems Analyst' }],
    });
    Team.findById.mockResolvedValue(team);

    await expect(teamService.lockTeam(teamId, leaderId)).rejects.toMatchObject({
      code: 'TEAM_MEMBER_ROLE_REQUIRED',
    });
    expect(User.find).not.toHaveBeenCalled();
    expect(team.save).not.toHaveBeenCalled();
  });

  it('does not accept a legacy role in place of one of the five standardized roles', async () => {
    const team = createTeam({
      members: [leaderId, memberId],
      memberRoles: [
        { userId: leaderId, role: 'Project Lead & Systems Analyst' },
        { userId: memberId, role: 'Programmer' },
      ],
    });
    Team.findById.mockResolvedValue(team);

    await expect(teamService.lockTeam(teamId, leaderId)).rejects.toMatchObject({
      code: 'TEAM_MEMBER_ROLE_REQUIRED',
    });
    expect(team.save).not.toHaveBeenCalled();
  });

  it('fills a missing legacy team term only when every member profile agrees before locking', async () => {
    const sectionId = '65e000000000000000000213';
    const instructorId = '65e000000000000000000214';
    const team = createTeam({
      members: [leaderId, memberId],
      memberRoles: [
        { userId: leaderId, role: 'Project Lead & Systems Analyst' },
        { userId: memberId, role: 'Backend & Database Developer' },
      ],
      academicTerm: null,
      sectionId,
    });
    const studentProfiles = [leaderId, memberId].map((_id) => ({
      _id,
      studentId: `E2E-${_id.slice(-3)}`,
      academicTerm: '1st Semester',
      sectionId,
      instructorId,
    }));
    const populatedTeam = {
      ...team,
      leaderId: { _id: leaderId, instructorId },
      sectionId: { name: 'BSIT-4A', code: 'BSIT-4A' },
    };
    const populatedQuery = {
      populate: vi.fn().mockReturnThis(),
      then: (resolve, reject) => Promise.resolve(populatedTeam).then(resolve, reject),
    };

    Team.findById.mockImplementationOnce(() => team).mockImplementationOnce(() => populatedQuery);
    User.find.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(studentProfiles) }),
    });
    TeamInvite.updateMany.mockResolvedValue({ modifiedCount: 0 });
    Notification.create.mockResolvedValue({ _id: 'synthetic-lock-notification' });

    const result = await teamService.lockTeam(teamId, leaderId);

    expect(team.academicTerm).toBe('1st Semester');
    expect(team.isLocked).toBe(true);
    expect(team.save).toHaveBeenCalledOnce();
    expect(TeamInvite.updateMany).toHaveBeenCalledOnce();
    expect(result.team).toBe(populatedTeam);
  });

  it('does not fill a missing team term when member profiles disagree', async () => {
    const team = createTeam({
      members: [leaderId, memberId],
      memberRoles: [
        { userId: leaderId, role: 'Project Lead & Systems Analyst' },
        { userId: memberId, role: 'Backend & Database Developer' },
      ],
      academicTerm: null,
    });
    Team.findById.mockResolvedValue(team);
    User.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: leaderId,
            studentId: 'E2E-LEAD',
            academicTerm: '1st Semester',
            sectionId: team.sectionId,
            instructorId: '65e000000000000000000214',
          },
          {
            _id: memberId,
            studentId: 'E2E-MEMBER',
            academicTerm: '2nd Semester',
            sectionId: team.sectionId,
            instructorId: '65e000000000000000000214',
          },
        ]),
      }),
    });

    await expect(teamService.lockTeam(teamId, leaderId)).rejects.toMatchObject({
      code: 'TEAM_MEMBER_PROFILE_INCOMPLETE',
    });
    expect(team.academicTerm).toBeNull();
    expect(team.save).not.toHaveBeenCalled();
  });
});
