import { describe, expect, it, vi, beforeEach } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import Team from '../../modules/teams/team.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import { isProjectSubmittableForPhase } from '../../modules/submissions/submission.service.js';
import projectCoreService, {
  buildWeeklyCheckInSchedule,
  getWeeklyCheckInBlocker,
} from '../../modules/projects/services/projectCore.service.js';
import { createHash } from 'node:crypto';
import * as socketService from '../../services/socket.service.js';
import {
  signTieredADM,
  endorseADMBySecretary,
  updateActionDoneMatrixItem,
} from '../../modules/projects/project.controller.js';
import { getADMCompletion } from '../../modules/projects/services/admCompletion.js';
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
    const ganttTasks = [
      {
        id: 'task-1',
        section: 'Plan',
        title: 'Build the prototype',
        owner: '',
        startDate: '2026-03-02',
        dueDate: '2026-03-06',
        durationDays: 5,
      },
    ];
    const ganttSections = ['Plan'];
    const ganttScheduleHash = createHash('sha256')
      .update(JSON.stringify({ tasks: ganttTasks, sections: ganttSections }))
      .digest('hex');
    const weeklyCheckIns = buildWeeklyCheckInSchedule(
      { tasks: ganttTasks, sections: ganttSections },
      ganttScheduleHash,
    ).map((checkIn) => ({ ...checkIn, status: 'approved' }));

    mockProject = {
      _id: projectId,
      title: 'Automated Agro-Climatic IoT Monitoring System',
      capstonePhase: 2,
      capstoneCourse: 'Capstone 2',
      stage: 'capstone_2',
      projectStatus: 'proposal_approved',
      teamId: '65e000000000000000000020',
      adviserId,
      secretaryId,
      panelistIds: [chairId, panelistId],
      panelists: [
        { userId: chairId, role: 'chair' },
        { userId: panelistId, role: 'member' },
      ],
      ganttPlan: { tasks: ganttTasks, sections: ganttSections },
      ganttApproval: { approved: true, scheduleHash: ganttScheduleHash },
      weeklyCheckIns,
      githubRepoUrl: 'https://github.com/buksu/capstone-system',
      prototypes: [{ _id: 'prototype-1' }],
      systemDefenseApproval: { approved: true },
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
    vi.spyOn(Evaluation, 'find').mockImplementation((query) => ({
      select: vi.fn().mockResolvedValue(
        [chairId, panelistId].map((panelistId) => ({
          panelistId,
          status: 'released',
          decision: 'passed',
          defenseType: query.defenseType?.$in?.[0] || query.defenseType,
        })),
      ),
    }));
    vi.spyOn(Submission, 'findOne').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ status: 'locked' }),
    });
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([
      { userId: teamMemberId, type: 'phase_advanced' },
    ]);
  });

  it('accepts proposal-approved status for the phase that is already unlocked', () => {
    expect(
      isProjectSubmittableForPhase({ projectStatus: 'proposal_approved', capstonePhase: 1 }),
    ).toBe(true);
    expect(
      isProjectSubmittableForPhase({ projectStatus: 'proposal_approved', capstonePhase: 3 }, 3),
    ).toBe(true);
    expect(
      isProjectSubmittableForPhase({ projectStatus: 'proposal_approved', capstonePhase: 2 }, 3),
    ).toBe(false);
    expect(isProjectSubmittableForPhase({ projectStatus: 'archived', capstonePhase: 3 })).toBe(
      false,
    );
  });

  it('schedules dated tasks into weekly check-ins and blocks progression for unresolved due weeks', () => {
    const scheduleHash = 'schedule-hash';
    const schedule = buildWeeklyCheckInSchedule(
      {
        sections: ['Build'],
        tasks: [
          {
            id: 'task-a',
            section: 'Build',
            title: 'Implement API',
            startDate: '2026-10-12',
            dueDate: '2026-10-23',
          },
        ],
      },
      scheduleHash,
    );

    expect(schedule).toHaveLength(2);
    expect(schedule.every((checkIn) => checkIn.scheduleHash === scheduleHash)).toBe(true);
    expect(schedule.every((checkIn) => checkIn.taskIds.includes('task-a'))).toBe(true);
    expect(() =>
      buildWeeklyCheckInSchedule(
        {
          sections: ['Build'],
          tasks: [
            {
              id: 'invalid-date',
              section: 'Build',
              title: 'Invalid date',
              startDate: '2026-02-31',
              dueDate: '2026-03-02',
            },
          ],
        },
        scheduleHash,
      ),
    ).toThrowError(expect.objectContaining({ code: 'GANTT_TASK_DATES_REQUIRED' }));

    const project = {
      ganttApproval: { scheduleHash },
      weeklyCheckIns: schedule.map((checkIn) => ({ ...checkIn, status: 'scheduled' })),
    };
    const dueDate = new Date('2026-10-19T00:00:00.000Z');
    expect(getWeeklyCheckInBlocker(project, dueDate)?.code).toBe('WEEKLY_CHECKIN_UNRESOLVED');
    project.weeklyCheckIns[0].status = 'approved';
    expect(getWeeklyCheckInBlocker(project, dueDate)).toBeNull();
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
    mockProject.actionDoneMatrix[0].status = 'verified';
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
    expect(mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.endorsed).toBe(true);
    expect(mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.signatoryName).toBe(
      'Prof. Mary Secretary',
    );
    expect(mockProject.admSignatures.secretary.endorsed).toBe(false);
    expect(mockProject.admStatus).toBe('under_panel_review');
    expect(mockProject.capstonePhase).toBe(2);
  });

  it('preserves Capstone 1 secretary signatures when endorsing the final ADM', async () => {
    const legacySecretarySignature = {
      endorsed: true,
      signatoryName: 'Capstone 1 Secretary',
      userId: secretaryId,
    };
    mockProject.capstonePhase = 3;
    mockProject.capstoneCourse = 'Capstone 3';
    mockProject.stage = 'capstone_3';
    mockProject.admSignatures = {
      secretary: legacySecretarySignature,
      adviser: { signed: true },
      instructor: { signed: true },
      chair: { signed: true },
      panelists: [{ userId: panelistId, signed: true }],
    };
    mockProject.admSignaturesByMilestone = {
      CAPSTONE_1: mockProject.admSignatures,
      CAPSTONE_2: {
        secretary: { endorsed: true },
        adviser: {},
        instructor: {},
        chair: {},
        panelists: [],
      },
      CAPSTONE_3: {
        secretary: { endorsed: false },
        adviser: {},
        instructor: {},
        chair: {},
        panelists: [],
      },
    };
    mockProject.actionDoneMatrix = [
      { ...mockProject.actionDoneMatrix[0], status: 'verified', milestone: 'CAPSTONE_3' },
    ];

    const req = {
      params: { projectId },
      body: { milestone: 'CAPSTONE_3', signatoryName: 'Final Secretary' },
      user: {
        _id: secretaryId,
        role: ROLES.FACULTY,
        firstName: 'Mary',
        lastName: 'Secretary',
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn((err) => {
      if (err) throw err;
    });

    await endorseADMBySecretary(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockProject.admSignaturesByMilestone.CAPSTONE_3.secretary.signatoryName).toBe(
      'Final Secretary',
    );
    expect(mockProject.admSignatures.secretary).toEqual(legacySecretarySignature);
  });

  it('rejects secretary endorsement until every milestone row is verified', async () => {
    const req = {
      params: { projectId },
      body: { signatoryName: 'Prof. Mary Secretary' },
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

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('still require panel verification'),
      }),
    );
    expect(mockProject.admSignatures.secretary.endorsed).toBe(false);
    expect(mockProject.save).not.toHaveBeenCalled();
  });

  it('waits for instructor and every assigned panel member before advancing to Capstone 3', async () => {
    // Signatures are stored per milestone; the legacy slot belongs to Capstone 1 only.
    mockProject.admSignaturesByMilestone = {
      CAPSTONE_1: mockProject.admSignatures,
      CAPSTONE_2: {
        secretary: { endorsed: true, signatoryName: 'Prof. Mary Secretary' },
        adviser: { signed: false },
        instructor: { signed: false },
        chair: { signed: false },
        panelists: [],
      },
      CAPSTONE_3: {},
    };

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
    expect(mockProject.admSignaturesByMilestone.CAPSTONE_2.adviser.signed).toBe(true);
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
    expect(mockProject.admSignaturesByMilestone.CAPSTONE_2.chair.signed).toBe(true);

    expect(mockProject.admStatus).toBe('under_panel_review');
    expect(mockProject.capstonePhase).toBe(2);

    const sign = async (role, userId, userRole, tier, firstName, lastName) => {
      const req = {
        params: { projectId },
        body: { tier, role, signatoryName: `${firstName} ${lastName}` },
        user: { _id: userId, role: userRole, firstName, lastName },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await signTieredADM(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    };

    await sign(
      'instructor',
      '65e000000000000000000006',
      ROLES.INSTRUCTOR,
      1,
      'Casey',
      'Instructor',
    );
    expect(mockProject.capstonePhase).toBe(2);
    await sign('member', panelistId, ROLES.FACULTY, 2, 'Taylor', 'Member');

    // Phase advancement follows the complete institutional signature set.
    expect(mockProject.admStatus).toBe('not_started');
    expect(mockProject.capstonePhase).toBe(3);
    expect(mockProject.capstoneCourse).toBe('Capstone 3');
    expect(mockProject.stage).toBe('capstone_3');
    expect(mockProject.projectStatus).toBe('active');

    // Dispatches team notification and socket events
    expect(Notification.insertMany).toHaveBeenCalled();
    expect(socketService.emitToRoom).toHaveBeenCalledWith(
      `project:${projectId}`,
      'project:phase_advanced',
      expect.objectContaining({ capstonePhase: 3, capstoneCourse: 'Capstone 3' }),
    );
  });

  it('advances from Capstone 1 to Capstone 2 only after every required signature', async () => {
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

    expect(mockProject.capstonePhase).toBe(1);

    const sign = async (role, userId, userRole, tier, firstName, lastName) => {
      const req = {
        params: { projectId },
        body: { tier, role, signatoryName: `${firstName} ${lastName}` },
        user: { _id: userId, role: userRole, firstName, lastName },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await signTieredADM(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    };

    await sign(
      'instructor',
      '65e000000000000000000006',
      ROLES.INSTRUCTOR,
      1,
      'Casey',
      'Instructor',
    );
    await sign('member', panelistId, ROLES.FACULTY, 2, 'Taylor', 'Member');

    expect(mockProject.admStatus).toBe('not_started');
    expect(mockProject.capstonePhase).toBe(2);
    expect(mockProject.capstoneCourse).toBe('Capstone 2');
    expect(mockProject.stage).toBe('capstone_2');
    expect(mockProject.projectStatus).toBe('active');
  });

  it('ratifies final ADM in Capstone 3 without advancing beyond Phase 3', async () => {
    mockProject.capstonePhase = 3;
    mockProject.capstoneCourse = 'Capstone 3';
    mockProject.admSignaturesByMilestone = {
      CAPSTONE_1: mockProject.admSignatures,
      CAPSTONE_2: {},
      CAPSTONE_3: {
        secretary: { endorsed: true, signatoryName: 'Prof. Mary Secretary' },
        adviser: { signed: false },
        instructor: { signed: false },
        chair: { signed: false },
        panelists: [],
      },
    };

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

    const sign = async (role, userId, userRole, tier, firstName, lastName) => {
      const req = {
        params: { projectId },
        body: { tier, role, signatoryName: `${firstName} ${lastName}` },
        user: { _id: userId, role: userRole, firstName, lastName },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await signTieredADM(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    };
    await sign(
      'instructor',
      '65e000000000000000000006',
      ROLES.INSTRUCTOR,
      1,
      'Casey',
      'Instructor',
    );
    await sign('member', panelistId, ROLES.FACULTY, 2, 'Taylor', 'Member');

    expect(resChair.status).toHaveBeenCalledWith(200);

    // ADM is approved; archival remains a separate gated operation.
    expect(mockProject.admStatus).toBe('approved');
    expect(mockProject.capstonePhase).toBe(3);
    expect(mockProject.capstoneCourse).toBe('Capstone 3');
  });

  it('activates the next project stage after released ADM completion', async () => {
    vi.spyOn(projectCoreService, '_getPhaseExitBlocker').mockResolvedValue(null);
    vi.spyOn(projectCoreService, '_notifyTeamMembers').mockResolvedValue();

    const makeProject = (phase) => ({
      capstonePhase: phase,
      capstoneCourse: `Capstone ${phase}`,
      stage: `capstone_${phase}`,
      projectStatus: 'proposal_approved',
      teamId: mockTeam._id,
      panelists: [
        { userId: chairId, role: 'chair' },
        { userId: panelistId, role: 'member' },
      ],
      admSignatures: {
        secretary: { endorsed: true },
        adviser: { signed: true },
        instructor: { signed: true },
        chair: { signed: true },
        panelists: [{ userId: panelistId, signed: true }],
      },
      admSignaturesByMilestone: {
        [phase === 1 ? 'CAPSTONE_1' : 'CAPSTONE_2']: {
          secretary: { endorsed: true },
          adviser: { signed: true },
          instructor: { signed: true },
          chair: { signed: true },
          panelists: [{ userId: panelistId, signed: true }],
        },
      },
    });

    for (const phase of [1, 2]) {
      const project = makeProject(phase);
      const result = await projectCoreService.advanceAfterADMCompletion(project);

      expect(result.advanced).toBe(true);
      expect(project.capstonePhase).toBe(phase + 1);
      expect(project.capstoneCourse).toBe(`Capstone ${phase + 1}`);
      expect(project.stage).toBe(`capstone_${phase + 1}`);
      expect(project.projectStatus).toBe('active');
      expect(project.admStatus).toBe('not_started');
    }
  });

  it('does not reuse the prior milestone signatures to complete the final ADM', () => {
    const project = {
      capstonePhase: 3,
      panelists: [
        { userId: chairId, role: 'chair' },
        { userId: panelistId, role: 'member' },
      ],
      admSignatures: {
        secretary: { endorsed: true },
        adviser: { signed: true },
        instructor: { signed: true },
        chair: { signed: true },
        panelists: [{ userId: panelistId, signed: true }],
      },
      admSignaturesByMilestone: {
        CAPSTONE_2: {
          secretary: { endorsed: true },
          adviser: { signed: true },
          instructor: { signed: true },
          chair: { signed: true },
          panelists: [{ userId: panelistId, signed: true }],
        },
        CAPSTONE_3: {},
      },
      actionDoneMatrix: [],
    };

    expect(getADMCompletion(project, 'CAPSTONE_3').complete).toBe(false);
  });
});
