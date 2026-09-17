import { describe, expect, it, vi, beforeEach } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import Team from '../../modules/teams/team.model.js';
import * as socketService from '../../services/socket.service.js';
import {
  signTieredADM,
  endorseADMBySecretary,
  updateActionDoneMatrixItem,
} from '../../modules/projects/project.controller.js';
import { ROLES } from '@cms/shared';

describe('Action Done Matrix Auto-Progression to Capstone 3 Suite', () => {
  const projectId = '65e000000000000000000010';
  const teamMemberId = '65e000000000000000000001';
  const adviserId = '65e000000000000000000002';
  const secretaryId = '65e000000000000000000003';
  const chairId = '65e000000000000000000004';
  const panelistId = '65e000000000000000000005';

  let mockProject;
  let mockTeam;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});
    vi.spyOn(socketService, 'emitToRoom').mockImplementation(() => {});
    vi.spyOn(socketService, 'getIO').mockReturnValue({ emit: vi.fn() });

    const row1 = {
      _id: 'row-1',
      panelName: 'Dr. John Chair',
      suggestion: 'Refine system architecture diagram',
      actionDone: 'Updated architecture diagram in Chapter 3',
      pageNumbers: 'p. 45',
      status: 'addressed',
      milestone: 'CAPSTONE_2',
      signatures: [],
      isLocked: false,
    };

    mockProject = {
      _id: projectId,
      title: 'Automated Agro-Climatic IoT Monitoring System',
      capstonePhase: 2,
      capstoneCourse: 'Capstone 2',
      teamId: '65e000000000000000000020',
      adviserId,
      secretaryId,
      panelistIds: [chairId, panelistId],
      actionDoneMatrix: [row1],
      admStatus: 'pending_secretary_endorsement',
      admSignatures: {
        secretary: { endorsed: false },
        adviser: { signed: false },
        instructor: { signed: false },
        chair: { signed: false },
        panelists: [],
      },
      save: vi.fn().mockImplementation(async () => mockProject),
    };
    mockProject.actionDoneMatrix.id = vi.fn((id) =>
      mockProject.actionDoneMatrix.find((r) => r._id === id),
    );

    mockTeam = {
      _id: '65e000000000000000000020',
      name: 'Team Agro',
      members: [teamMemberId],
    };

    vi.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    vi.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([
      { userId: teamMemberId, type: 'phase_advanced' },
    ]);
  });

  it('allows faculty/panelists to toggle fulfillment verification checkbox on ADM row', async () => {
    const req = {
      params: { projectId, itemId: 'row-1' },
      body: { status: 'verified' },
      user: {
        _id: panelistId,
        role: ROLES.FACULTY,
        firstName: 'Jane',
        lastName: 'Doe',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn((err) => {
      if (err) throw err;
    });

    await updateActionDoneMatrixItem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockProject.actionDoneMatrix[0].status).toBe('verified');
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('endorses ADM by Secretary and unlocks panel digital signatures', async () => {
    const req = {
      params: { projectId },
      body: {
        notes: 'All items verified and compliant.',
        signatoryName: 'Prof. Mary Secretary',
      },
      user: {
        _id: secretaryId,
        role: ROLES.FACULTY,
        firstName: 'Mary',
        lastName: 'Secretary',
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn((err) => {
      if (err) throw err;
    });

    await endorseADMBySecretary(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockProject.admSignatures.secretary.endorsed).toBe(true);
    expect(mockProject.admSignatures.secretary.signatoryName).toBe('Prof. Mary Secretary');
    expect(mockProject.admStatus).toBe('under_panel_review');
    expect(mockProject.capstonePhase).toBe(2);
  });

  it('automatically advances project to Capstone 3 once Secretary, Adviser, and Chair sign', async () => {
    // Secretary already endorsed
    mockProject.admSignatures.secretary.endorsed = true;
    mockProject.admSignatures.secretary.signatoryName = 'Prof. Mary Secretary';

    const next = vi.fn((err) => {
      if (err) throw err;
    });

    // Adviser signs Tier 1
    const reqAdviser = {
      params: { projectId },
      body: { tier: 1, role: 'adviser', signatoryName: 'Dr. Alan Adviser' },
      user: {
        _id: adviserId,
        role: ROLES.ADVISER,
        firstName: 'Alan',
        lastName: 'Adviser',
      },
    };
    const resAdviser = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqAdviser, resAdviser, next);

    expect(resAdviser.status).toHaveBeenCalledWith(200);
    expect(mockProject.admSignatures.adviser.signed).toBe(true);
    // Still waiting for Chair
    expect(mockProject.capstonePhase).toBe(2);

    // Chair signs Tier 3
    const reqChair = {
      params: { projectId },
      body: { tier: 3, role: 'chair', signatoryName: 'Dr. John Chair' },
      user: {
        _id: chairId,
        role: ROLES.FACULTY,
        firstName: 'John',
        lastName: 'Chair',
      },
    };
    const resChair = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqChair, resChair, next);

    expect(resChair.status).toHaveBeenCalledWith(200);
    expect(mockProject.admSignatures.chair.signed).toBe(true);

    // AUTOMATIC ADVANCEMENT TO CAPSTONE 3!
    expect(mockProject.admStatus).toBe('approved');
    expect(mockProject.capstonePhase).toBe(3);
    expect(mockProject.capstoneCourse).toBe('Capstone 3');

    // Dispatches team notification and socket events
    expect(Notification.insertMany).toHaveBeenCalled();
    expect(socketService.emitToRoom).toHaveBeenCalledWith(
      `project:${projectId}`,
      'project:phase_advanced',
      expect.objectContaining({ capstonePhase: 3, capstoneCourse: 'Capstone 3' }),
    );
  });

  it('automatically advances project from Capstone 1 to Capstone 2 once Secretary, Adviser, and Chair sign ADM v1', async () => {
    mockProject.capstonePhase = 1;
    mockProject.capstoneCourse = 'Capstone 1';
    mockProject.admSignatures.secretary.endorsed = true;
    mockProject.admSignatures.secretary.signatoryName = 'Prof. Mary Secretary';

    const next = vi.fn((err) => {
      if (err) throw err;
    });

    // Adviser signs Tier 1
    const reqAdviser = {
      params: { projectId },
      body: { tier: 1, role: 'adviser', signatoryName: 'Dr. Alan Adviser' },
      user: {
        _id: adviserId,
        role: ROLES.ADVISER,
        firstName: 'Alan',
        lastName: 'Adviser',
      },
    };
    const resAdviser = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqAdviser, resAdviser, next);

    expect(resAdviser.status).toHaveBeenCalledWith(200);
    expect(mockProject.capstonePhase).toBe(1);

    // Chair signs Tier 3
    const reqChair = {
      params: { projectId },
      body: { tier: 3, role: 'chair', signatoryName: 'Dr. John Chair' },
      user: {
        _id: chairId,
        role: ROLES.FACULTY,
        firstName: 'John',
        lastName: 'Chair',
      },
    };
    const resChair = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqChair, resChair, next);

    expect(resChair.status).toHaveBeenCalledWith(200);

    // AUTOMATIC ADVANCEMENT TO CAPSTONE 2!
    expect(mockProject.admStatus).toBe('approved');
    expect(mockProject.capstonePhase).toBe(2);
    expect(mockProject.capstoneCourse).toBe('Capstone 2');
  });

  it('ratifies ADM v3 in Capstone 3 without advancing beyond Phase 3', async () => {
    mockProject.capstonePhase = 3;
    mockProject.capstoneCourse = 'Capstone 3';
    mockProject.admSignatures.secretary.endorsed = true;
    mockProject.admSignatures.secretary.signatoryName = 'Prof. Mary Secretary';

    const next = vi.fn((err) => {
      if (err) throw err;
    });

    // Adviser signs Tier 1
    const reqAdviser = {
      params: { projectId },
      body: { tier: 1, role: 'adviser', signatoryName: 'Dr. Alan Adviser' },
      user: {
        _id: adviserId,
        role: ROLES.ADVISER,
        firstName: 'Alan',
        lastName: 'Adviser',
      },
    };
    const resAdviser = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqAdviser, resAdviser, next);

    // Chair signs Tier 3
    const reqChair = {
      params: { projectId },
      body: { tier: 3, role: 'chair', signatoryName: 'Dr. John Chair' },
      user: {
        _id: chairId,
        role: ROLES.FACULTY,
        firstName: 'John',
        lastName: 'Chair',
      },
    };
    const resChair = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await signTieredADM(reqChair, resChair, next);

    expect(resChair.status).toHaveBeenCalledWith(200);

    // ADM is approved and ready for archival, phase remains 3
    expect(mockProject.admStatus).toBe('approved');
    expect(mockProject.capstonePhase).toBe(3);
    expect(mockProject.capstoneCourse).toBe('Capstone 3');
  });
});
