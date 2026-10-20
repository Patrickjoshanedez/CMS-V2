import { beforeEach, describe, expect, it, vi } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import projectCoreService, {
  buildWeeklyCheckInSchedule,
  ganttScheduleHash,
  getWeeklyCheckInBlocker,
} from '../../modules/projects/services/projectCore.service.js';

const projectId = '65e000000000000000000110';
const studentId = '65e000000000000000000111';
const adviserId = '65e000000000000000000112';
const instructorId = '65e000000000000000000113';
const checkInId = '65e000000000000000000114';

const createPlan = () => ({
  sections: ['System Development'],
  tasks: [
    {
      id: 'task-1',
      title: 'Build the dashboard',
      section: 'System Development',
      startDate: '2026-09-28',
      dueDate: '2026-10-11',
      durationDays: 14,
    },
  ],
});

const createCheckIn = (overrides = {}) => ({
  _id: checkInId,
  scheduleHash: 'approved-schedule-hash',
  weekKey: '2026-09-28',
  weekStart: new Date('2026-09-28T00:00:00.000Z'),
  dueAt: new Date('2026-10-04T23:59:59.999Z'),
  taskIds: ['task-1'],
  completedTaskIds: [],
  status: 'scheduled',
  isLate: false,
  summary: '',
  justification: '',
  ...overrides,
});

const createProject = (checkIn = createCheckIn(), overrides = {}) => {
  const ganttPlan = overrides.ganttPlan || createPlan();
  const scheduleHash = ganttScheduleHash(ganttPlan);
  if (checkIn.scheduleHash === 'approved-schedule-hash') checkIn.scheduleHash = scheduleHash;
  const weeklyCheckIns = [checkIn];
  weeklyCheckIns.id = (id) => weeklyCheckIns.find((entry) => String(entry._id) === String(id));

  return {
    _id: projectId,
    teamId: '65e000000000000000000115',
    capstonePhase: 2,
    adviserId,
    ganttPlan,
    ganttApproval: { approved: true, scheduleHash },
    weeklyCheckIns,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
};

describe('Capstone 2 weekly check-in and late-waiver gates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Project, 'findById');
    vi.spyOn(projectCoreService, '_assertTeamMember').mockResolvedValue(undefined);
    vi.spyOn(projectCoreService, '_assertCapstone2ADMApproved').mockImplementation(() => {});
    vi.spyOn(projectCoreService, '_notifyTeamMembers').mockResolvedValue(undefined);
  });

  it('allows notifications emitted by each weekly progress workflow step', () => {
    const allowedTypes = Notification.schema.path('type').enumValues;
    expect(allowedTypes).toEqual(
      expect.arrayContaining([
        'weekly_checkin_submitted',
        'weekly_checkin_reviewed',
        'weekly_checkin_waiver_reviewed',
      ]),
    );
  });

  it('creates one dated check-in for each week represented by an approved Gantt task', () => {
    const plan = createPlan();
    const scheduleHash = ganttScheduleHash(plan);
    const schedule = buildWeeklyCheckInSchedule(plan, scheduleHash);

    expect(schedule).toHaveLength(2);
    expect(schedule.map((checkIn) => checkIn.weekKey)).toEqual(['2026-09-28', '2026-10-05']);
    expect(schedule.every((checkIn) => checkIn.taskIds.includes('task-1'))).toBe(true);
  });

  it('requires a justification before submitting an overdue weekly check-in', async () => {
    const checkIn = createCheckIn();
    const project = createProject(checkIn);
    Project.findById.mockResolvedValue(project);

    await expect(
      projectCoreService.updateWeeklyCheckIn(projectId, studentId, checkInId, {
        summary: 'Implemented the first dashboard view.',
        completedTaskIds: ['task-1'],
      }),
    ).rejects.toMatchObject({ code: 'LATE_CHECKIN_JUSTIFICATION_REQUIRED' });

    expect(project.save).not.toHaveBeenCalled();
  });

  it('routes an Adviser-approved late check-in through the assigned Instructor waiver', async () => {
    const checkIn = createCheckIn({
      status: 'submitted',
      isLate: true,
      summary: 'Progress submitted late.',
    });
    const project = createProject(checkIn);
    Project.findById.mockResolvedValue(project);
    vi.spyOn(Team, 'findById').mockReturnValue({
      populate: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          leaderId: { instructorId },
          sectionId: '65e000000000000000000116',
        }),
      }),
    });

    await projectCoreService.reviewWeeklyCheckIn(projectId, adviserId, checkInId, {
      decision: 'approved',
      remarks: 'Justification accepted for review.',
    });

    expect(checkIn.status).toBe('awaiting_instructor_waiver');
    expect(getWeeklyCheckInBlocker(project, new Date('2026-10-17T00:00:00.000Z'))).toMatchObject({
      code: 'WEEKLY_CHECKIN_UNRESOLVED',
    });

    await projectCoreService.reviewWeeklyCheckInWaiver(projectId, instructorId, checkInId, {
      decision: 'granted',
      remarks: 'Synthetic test waiver granted.',
    });

    expect(checkIn.status).toBe('approved');
    expect(checkIn.instructorWaiver.reviewedBy).toBe(instructorId);
    expect(getWeeklyCheckInBlocker(project, new Date('2026-10-17T00:00:00.000Z'))).toBeNull();
    expect(project.save).toHaveBeenCalledTimes(2);
  });

  it('rejects a waiver issued by an Instructor not assigned to the team', async () => {
    const checkIn = createCheckIn({ status: 'awaiting_instructor_waiver', isLate: true });
    const project = createProject(checkIn);
    Project.findById.mockResolvedValue(project);
    vi.spyOn(Team, 'findById').mockReturnValue({
      populate: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ leaderId: { instructorId }, sectionId: null }),
      }),
    });

    await expect(
      projectCoreService.reviewWeeklyCheckInWaiver(projectId, adviserId, checkInId, {
        decision: 'granted',
      }),
    ).rejects.toMatchObject({ code: 'NOT_ASSIGNED_INSTRUCTOR' });
    expect(project.save).not.toHaveBeenCalled();
  });
});
