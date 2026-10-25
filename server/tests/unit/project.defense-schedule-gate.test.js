import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectTitleService from '../../modules/projects/services/projectTitle.service.js';
import projectCoreService from '../../modules/projects/services/projectCore.service.js';
import User from '../../modules/users/user.model.js';
import Team from '../../modules/teams/team.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import { TITLE_STATUSES, ROLES } from '@cms/shared';

vi.mock('../../modules/projects/services/projectCore.service.js', () => ({
  default: {
    _getProjectOrFail: vi.fn(),
    _assertProjectWritable: vi.fn(),
  },
}));
vi.mock('../../modules/projects/services/projectCommittee.service.js', () => ({ default: {} }));

describe('projectTitleService.approveTitle - Pre-Course Topic Approval & State Preservation', () => {
  const instructorId = '65e000000000000000000001';
  const projectId = '65e000000000000000000002';

  const mockInstructor = {
    _id: instructorId,
    role: ROLES.INSTRUCTOR,
    firstName: 'Instructor',
    lastName: 'User',
  };

  let mockProject;

  beforeEach(() => {
    vi.clearAllMocks();

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

    projectCoreService._getProjectOrFail.mockResolvedValue(mockProject);
    vi.spyOn(projectTitleService, '_notifyTeamMembers').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('approves a title proposal without requiring an oral defense schedule', async () => {
    mockProject.defenseSchedule = null;

    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: 0,
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.capstonePhase).toBe(1);
    expect(result.project.stage).toBe('capstone_1');
    expect(result.project.defenseSchedule).toBeNull();
  });

  it('clears a legacy title-review schedule before Capstone 1 begins', async () => {
    mockProject.defenseSchedule = {
      status: 'scheduled',
      date: null,
    };
    mockProject.deadlines = {
      defense: new Date('2026-10-15'),
      removed: [],
      moved: { defense: { oldDate: new Date('2026-10-01'), newDate: new Date('2026-10-15') } },
    };

    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: 0,
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.defenseSchedule).toBeNull();
    expect(result.project.deadlines.defense).toBeUndefined();
    expect(result.project.deadlines.moved.defense).toBeUndefined();
  });

  it('does not carry a completed legacy title hearing or verdict into Capstone 1', async () => {
    mockProject.defenseSchedule = {
      status: 'completed',
      date: new Date('2026-10-15'),
      verdict: 'passed',
    };

    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: 0,
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.defenseSchedule).toBeNull();
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('resiliently handles 1-based proposal index (proposalId: 1 when proposals length is 1)', async () => {
    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: 1,
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.title).toBe('Decentralized LoRa-Enabled Evacuation Mesh');
    expect(result.project.defenseSchedule).toBeNull();
  });

  it('resiliently resolves proposal matching titleProposalMetadata _id', async () => {
    mockProject.titleProposalMetadata = [
      {
        _id: '65e0000000000000000000aa',
        title: 'Decentralized LoRa-Enabled Evacuation Mesh',
        status: 'submitted',
      },
    ];

    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: '65e0000000000000000000aa',
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(result.project.title).toBe('Decentralized LoRa-Enabled Evacuation Mesh');
  });

  it('auto-advances project from DRAFT to SUBMITTED and then APPROVED', async () => {
    mockProject.titleStatus = TITLE_STATUSES.DRAFT;

    const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
      proposalId: 0,
    });

    expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(mockProject.save).toHaveBeenCalled();
  });

  describe('projectTitleService.rejectTitle - Proposal Deliberation Revision Requests', () => {
    it('successfully requests revision on a project with SUBMITTED status', async () => {
      mockProject.titleStatus = TITLE_STATUSES.SUBMITTED;

      const result = await projectTitleService.rejectTitle(projectId, mockInstructor, {
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

      const result = await projectTitleService.rejectTitle(projectId, mockInstructor, {
        reason: 'Proposal Revision Required: Insufficient problem statement.',
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.REVISION_REQUIRED);
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('successfully requests revision when project was previously APPROVED', async () => {
      mockProject.titleStatus = TITLE_STATUSES.APPROVED;

      const result = await projectTitleService.rejectTitle(projectId, mockInstructor, {
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

      const result = await projectTitleService.rejectTitle(projectId, mockInstructor, {
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

  describe('projectTitleService.approveTitle - Post-Proposal Field-Based Adviser Appointment', () => {
    const validFacultyAdviserId = '65e000000000000000000077';
    const mockFacultyAdviser = {
      _id: validFacultyAdviserId,
      role: ROLES.FACULTY,
      firstName: 'Dr. Jane',
      lastName: 'FieldExpert',
    };

    beforeEach(() => {
      vi.spyOn(Notification, 'create').mockResolvedValue({});
    });

    it('assigns field-specific faculty adviser to project and syncs with team upon approval', async () => {
      mockProject.adviserId = null; // Vacant during proposal phase
      mockProject.secretaryId = '65e000000000000000000030';
      mockProject.panelistIds = [
        '65e000000000000000000040',
        '65e000000000000000000041',
        '65e000000000000000000042',
      ];

      vi.spyOn(User, 'findById').mockResolvedValue(mockFacultyAdviser);
      const teamUpdateSpy = vi.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});

      const result = await projectTitleService.approveTitle(projectId, mockInstructor, {
        proposalId: 0,
        adviserId: validFacultyAdviserId,
      });

      expect(result.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
      expect(result.project.adviserId).toBe(validFacultyAdviserId);
      expect(teamUpdateSpy).toHaveBeenCalledWith(mockProject.teamId, {
        adviserId: validFacultyAdviserId,
      });
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('rejects adviser appointment if assigned user is an instructor', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: '65e000000000000000000088',
        role: ROLES.INSTRUCTOR,
      });

      await expect(
        projectTitleService.approveTitle(projectId, mockInstructor, {
          proposalId: 0,
          adviserId: '65e000000000000000000088',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_COMMITTEE_ROLE',
      });
      expect(mockProject.save).not.toHaveBeenCalled();
    });

    it('rejects adviser appointment if user is already the committee secretary', async () => {
      const secretaryId = '65e000000000000000000030';
      mockProject.secretaryId = secretaryId;

      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: secretaryId,
        role: ROLES.FACULTY,
      });

      await expect(
        projectTitleService.approveTitle(projectId, mockInstructor, {
          proposalId: 0,
          adviserId: secretaryId,
        }),
      ).rejects.toMatchObject({
        code: 'ROLE_CONFLICT',
      });
      expect(mockProject.save).not.toHaveBeenCalled();
    });

    it('rejects adviser appointment if user is already a defense panelist', async () => {
      const panelistId = '65e000000000000000000040';
      mockProject.panelistIds = [
        panelistId,
        '65e000000000000000000041',
        '65e000000000000000000042',
      ];

      vi.spyOn(User, 'findById').mockResolvedValue({
        _id: panelistId,
        role: ROLES.FACULTY,
      });

      await expect(
        projectTitleService.approveTitle(projectId, mockInstructor, {
          proposalId: 0,
          adviserId: panelistId,
        }),
      ).rejects.toMatchObject({
        code: 'ROLE_CONFLICT',
      });
      expect(mockProject.save).not.toHaveBeenCalled();
    });
  });
});
