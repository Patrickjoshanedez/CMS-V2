import { beforeEach, describe, expect, it, vi } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import projectCoreService, {
  ganttScheduleHash,
} from '../../modules/projects/services/projectCore.service.js';

describe('Capstone 3 development asset approval gate', () => {
  const projectId = '65e000000000000000000010';
  const memberId = '65e000000000000000000011';

  const createProject = (overrides = {}) => ({
    _id: projectId,
    teamId: '65e000000000000000000012',
    adviserId: '65e000000000000000000031',
    panelistIds: ['65e000000000000000000032'],
    capstonePhase: 2,
    admStatus: 'pending_secretary_endorsement',
    admSignatures: {},
    prototypes: [],
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const completeCapstone1Adm = {
    panelists: [
      { userId: '65e000000000000000000021', role: 'chair' },
      { userId: '65e000000000000000000022', role: 'panelist' },
    ],
    panelistIds: ['65e000000000000000000021', '65e000000000000000000022'],
    admSignaturesByMilestone: {
      CAPSTONE_1: {
        secretary: { endorsed: true },
        adviser: { signed: true },
        instructor: { signed: true },
        chair: { userId: '65e000000000000000000021', signed: true },
        panelists: [{ userId: '65e000000000000000000022', signed: true }],
      },
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Project, 'findById');
    vi.spyOn(Team, 'findById').mockResolvedValue({
      members: [memberId],
      leaderId: memberId,
    });
  });

  it.each([
    [
      'Gantt URL',
      (id) =>
        projectCoreService.updateGanttChartUrl(id, memberId, {
          ganttChartUrl: 'https://example.test/gantt',
        }),
    ],
    [
      'demo video URL',
      (id) =>
        projectCoreService.updateDemoVideoUrl(id, memberId, {
          demoVideoUrl: 'https://example.test/demo',
        }),
    ],
    [
      'prototype addition',
      (id) =>
        projectCoreService.addPrototype(id, memberId, {
          title: 'Test',
          type: 'link',
          url: 'https://example.test/prototype',
        }),
    ],
    [
      'prototype removal',
      (id) => projectCoreService.removePrototype(id, '65e000000000000000000013', memberId),
    ],
  ])('blocks %s while Capstone 2 ADM is pending', async (_asset, update) => {
    const project = createProject();
    Project.findById.mockResolvedValue(project);

    await expect(update(projectId)).rejects.toMatchObject({ code: 'ADM_NOT_APPROVED' });
    expect(project.save).not.toHaveBeenCalled();
  });

  it('allows a team member to update development assets after ADM approval', async () => {
    const project = createProject({ admStatus: 'approved', ...completeCapstone1Adm });
    Project.findById.mockResolvedValue(project);

    await projectCoreService.updateDemoVideoUrl(projectId, memberId, {
      demoVideoUrl: 'https://example.test/demo',
    });

    expect(project.demoVideoUrl).toBe('https://example.test/demo');
    expect(project.save).toHaveBeenCalledOnce();
  });

  it('blocks new daily progress until the assigned Adviser approves the saved Gantt plan', async () => {
    const project = createProject({
      admStatus: 'approved',
      ...completeCapstone1Adm,
      ganttPlan: { tasks: [], sections: [] },
      ganttApproval: { approved: false },
    });
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        memberId,
        {
          tasks: [
            {
              id: 'task-1',
              title: 'Build dashboard',
              section: 'System Development',
              progress: 0.25,
            },
          ],
          sections: ['System Development'],
        },
        'student',
      ),
    ).rejects.toMatchObject({ code: 'GANTT_APPROVAL_REQUIRED' });
    expect(project.save).not.toHaveBeenCalled();
  });

  it('rejects Gantt plan edits after project archival', async () => {
    const project = createProject({
      isArchived: true,
      admStatus: 'approved',
      ...completeCapstone1Adm,
    });
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        memberId,
        { tasks: [], sections: [] },
        'student',
      ),
    ).rejects.toMatchObject({ code: 'PROJECT_ARCHIVED', statusCode: 409 });
    expect(project.save).not.toHaveBeenCalled();
  });

  it.each([
    [
      'Gantt URL',
      (id) =>
        projectCoreService.updateGanttChartUrl(id, memberId, {
          ganttChartUrl: 'https://example.test/gantt',
        }),
    ],
    [
      'system clearance',
      (id) => projectCoreService.updateSystemDefenseApproval(id, memberId, { approved: true }),
    ],
    [
      'demo URL',
      (id) =>
        projectCoreService.updateDemoVideoUrl(id, memberId, {
          demoVideoUrl: 'https://example.test/demo',
        }),
    ],
    [
      'repository URL',
      (id) =>
        projectCoreService.updateGithubRepoUrl(id, memberId, {
          githubRepoUrl: 'https://example.test/repo',
        }),
    ],
    [
      'external links',
      (id) =>
        projectCoreService.updateExternalLinks(id, memberId, {
          githubRepoUrl: 'https://example.test/repo',
        }),
    ],
    [
      'Gantt approval',
      (id) => projectCoreService.updateGanttApproval(id, memberId, { approved: true }),
    ],
    [
      'weekly check-in submission',
      (id) => projectCoreService.updateWeeklyCheckIn(id, memberId, 'check-in-1', { submit: true }),
    ],
    [
      'weekly check-in review',
      (id) =>
        projectCoreService.reviewWeeklyCheckIn(id, memberId, 'check-in-1', {
          decision: 'approved',
        }),
    ],
    [
      'weekly check-in waiver',
      (id) =>
        projectCoreService.reviewWeeklyCheckInWaiver(id, memberId, 'check-in-1', {
          decision: 'granted',
        }),
    ],
    [
      'prototype addition',
      (id) =>
        projectCoreService.addPrototype(id, memberId, {
          title: 'Test',
          type: 'link',
          url: 'https://example.test/item',
        }),
    ],
    [
      'prototype removal',
      (id) => projectCoreService.removePrototype(id, '65e000000000000000000013', memberId),
    ],
    [
      'deadline update',
      (id) =>
        projectCoreService.setDeadlines(
          id,
          { chapter4: '2026-10-20' },
          { _id: memberId, role: 'adviser' },
        ),
    ],
    [
      'project rejection',
      (id) => projectCoreService.rejectProject(id, memberId, { reason: 'test' }),
    ],
    ['phase advancement', (id) => projectCoreService.advancePhase(id, memberId)],
  ])('rejects archived %s changes before saving', async (_action, update) => {
    const project = createProject({
      isArchived: true,
      admStatus: 'approved',
      ...completeCapstone1Adm,
    });
    Project.findById.mockResolvedValue(project);

    await expect(update(projectId)).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
      statusCode: 409,
    });
    expect(project.save).not.toHaveBeenCalled();
  });

  it('allows daily progress against the exact Adviser-approved Gantt schedule', async () => {
    const approvedPlan = {
      tasks: [
        {
          id: 'task-1',
          title: 'Build dashboard',
          section: 'System Development',
          progress: 0,
        },
      ],
      sections: ['System Development'],
    };
    const project = createProject({
      admStatus: 'approved',
      ...completeCapstone1Adm,
      ganttPlan: approvedPlan,
      ganttApproval: {
        approved: true,
        scheduleHash: ganttScheduleHash(approvedPlan),
      },
    });
    Project.findById.mockResolvedValue(project);

    await projectCoreService.updateGanttPlan(
      projectId,
      memberId,
      {
        tasks: [{ ...approvedPlan.tasks[0], progress: 0.25 }],
        sections: approvedPlan.sections,
      },
      'student',
    );

    expect(project.ganttPlan.tasks[0].progress).toBe(0.25);
    expect(project.save).toHaveBeenCalledOnce();
  });

  it('allows the assigned Adviser to edit the schedule without granting approval implicitly', async () => {
    const adviserId = '65e000000000000000000031';
    const project = createProject({
      admStatus: 'approved',
      ...completeCapstone1Adm,
      ganttPlan: { tasks: [], sections: [] },
      ganttApproval: { approved: false },
    });
    Project.findById.mockResolvedValue(project);

    await projectCoreService.updateGanttPlan(
      projectId,
      adviserId,
      {
        tasks: [
          { id: 'task-1', title: 'Build dashboard', section: 'System Development', progress: 0 },
        ],
        sections: ['System Development'],
      },
      'faculty',
    );

    expect(project.ganttPlan.tasks).toHaveLength(1);
    expect(project.ganttApproval.approved).toBe(false);
    expect(project.save).toHaveBeenCalledOnce();
  });

  it('rejects unrelated faculty and instructors from editing the Gantt schedule', async () => {
    const project = createProject({ admStatus: 'approved', ...completeCapstone1Adm });
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        '65e000000000000000000041',
        { tasks: [], sections: [] },
        'faculty',
      ),
    ).rejects.toMatchObject({ code: 'GANTT_EDIT_FORBIDDEN', statusCode: 403 });
    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        '65e000000000000000000042',
        { tasks: [], sections: [] },
        'instructor',
      ),
    ).rejects.toMatchObject({ code: 'GANTT_EDIT_FORBIDDEN', statusCode: 403 });
    expect(project.save).not.toHaveBeenCalled();
  });

  it('keeps assigned panelists read-only even when their account uses the faculty role', async () => {
    const project = createProject({ admStatus: 'approved', ...completeCapstone1Adm });
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        '65e000000000000000000022',
        { tasks: [], sections: [] },
        'faculty',
      ),
    ).rejects.toMatchObject({ code: 'GANTT_EDIT_FORBIDDEN', statusCode: 403 });
    expect(project.save).not.toHaveBeenCalled();
  });

  it('rejects students outside the assigned team from editing the Gantt schedule', async () => {
    const project = createProject({ admStatus: 'approved', ...completeCapstone1Adm });
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateGanttPlan(
        projectId,
        '65e000000000000000000043',
        { tasks: [], sections: [] },
        'student',
      ),
    ).rejects.toMatchObject({ code: 'GANTT_EDIT_FORBIDDEN', statusCode: 403 });
    expect(project.save).not.toHaveBeenCalled();
  });
});
