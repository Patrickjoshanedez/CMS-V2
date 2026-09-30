import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectService from '../../modules/projects/project.service.js';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import Team from '../../modules/teams/team.model.js';
import * as socketService from '../../services/socket.service.js';
import { ROLES } from '@cms/shared';

describe('projectService - Defense Schedule Clearing & Deadline Persistence', () => {
  const instructorId = '65e000000000000000000001';
  const projectId = '65e000000000000000000002';

  const mockInstructor = {
    _id: instructorId,
    role: ROLES.INSTRUCTOR,
    firstName: 'Instructor',
    lastName: 'User',
  };

  let mockProject;
  let findByIdAndUpdateSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(socketService, 'emitToRoom').mockImplementation(() => {});
    vi.spyOn(socketService, 'emitToUser').mockImplementation(() => {});
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([]);
    vi.spyOn(Team, 'findById').mockResolvedValue({
      members: ['65e000000000000000000099'],
    });

    mockProject = {
      _id: projectId,
      title: 'CMS Project',
      teamId: '65e000000000000000000010',
      adviserId: '65e000000000000000000020',
      secretaryId: '65e000000000000000000030',
      deadlines: {
        proposal: new Date('2026-09-01'),
        defense: new Date('2026-10-15'),
      },
      defenseSchedule: {
        date: new Date('2026-10-15'),
        time: '09:00 AM - 10:00 AM',
        venue: 'COT Conference Room',
        round: '1st',
        defenseType: 'proposal',
        status: 'scheduled',
      },
      panelistIds: ['65e000000000000000000040'],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    findByIdAndUpdateSpy = vi.spyOn(Project, 'findByIdAndUpdate').mockResolvedValue(mockProject);
    vi.spyOn(projectService, '_notifyTeamMembers').mockResolvedValue(true);
    vi.spyOn(projectService, '_getProjectOrFail').mockResolvedValue(mockProject);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears defense schedule and unsets deadlines.defense when unscheduling', async () => {
    await projectService.scheduleDefense(
      projectId,
      {
        status: 'unscheduled',
        date: null,
        time: '',
      },
      mockInstructor,
    );

    expect(mockProject.defenseSchedule.status).toBe('unscheduled');
    expect(mockProject.defenseSchedule.date).toBeNull();
    expect(mockProject.defenseSchedule.time).toBe('');
    expect(mockProject.defenseSchedule.venue).toBe('');
    expect(mockProject.defenseSchedule.scheduledAt).toBeNull();
    expect(mockProject.deadlines.defense).toBeUndefined();

    expect(Notification.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'defense_unscheduled',
          title: 'Capstone Defense Hearing Postponed / Unscheduled',
          message: `The defense hearing schedule for "${mockProject.title}" has been removed.`,
          metadata: expect.objectContaining({
            projectId: mockProject._id,
          }),
        }),
      ]),
    );

    expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        $unset: { 'deadlines.defense': '' },
        $set: expect.objectContaining({
          defenseSchedule: expect.objectContaining({
            status: 'unscheduled',
            date: null,
            time: '',
            venue: '',
          }),
        }),
      }),
    );
  });

  it('dispatches defense_scheduled notifications when scheduling defense', async () => {
    mockProject.defenseSchedule.status = 'pending_scheduling';

    await projectService.scheduleDefense(
      projectId,
      {
        status: 'scheduled',
        date: '2026-11-15T09:00:00.000Z',
        time: '10:00 AM - 10:30 AM',
        venue: 'COT Conference Room',
      },
      mockInstructor,
    );

    expect(Notification.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'defense_scheduled',
          title: 'Capstone 2 Defense Scheduled',
          metadata: expect.objectContaining({
            projectId: mockProject._id,
          }),
        }),
      ]),
    );
  });

  it('clears defense schedule when date is empty string and time is empty', async () => {
    await projectService.scheduleDefense(
      projectId,
      {
        date: '',
        time: '',
      },
      mockInstructor,
    );

    expect(mockProject.defenseSchedule.status).toBe('unscheduled');
    expect(mockProject.defenseSchedule.date).toBeNull();
    expect(mockProject.defenseSchedule.time).toBe('');
    expect(mockProject.defenseSchedule.venue).toBe('');
    expect(mockProject.deadlines.defense).toBeUndefined();
  });

  it('updates targetProject.defenseSchedule when clearing defense deadline in setDeadlines', async () => {
    mockProject.defenseSchedule = {
      date: new Date('2026-10-15'),
      status: 'scheduled',
    };

    await projectService.setDeadlines(
      projectId,
      {
        defense: null,
      },
      mockInstructor,
    );

    expect(mockProject.defenseSchedule.date).toBeNull();
    expect(mockProject.defenseSchedule.status).toBe('unscheduled');
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('handles targetProject without initial deadlines in setDeadlines (null-safety)', async () => {
    mockProject.deadlines = null;
    mockProject.defenseSchedule = {
      date: new Date('2026-10-15'),
      status: 'scheduled',
    };

    await projectService.setDeadlines(
      projectId,
      {
        proposal: new Date('2026-11-01'),
        defense: null,
      },
      mockInstructor,
    );

    expect(mockProject.deadlines).toBeDefined();
    expect(mockProject.deadlines.proposal).toEqual(new Date('2026-11-01'));
    expect(mockProject.defenseSchedule.status).toBe('unscheduled');
    expect(mockProject.save).toHaveBeenCalled();
  });

  it('validates successfully against Project schema with defenseSchedule.status: "unscheduled"', async () => {
    const validProject = new Project({
      teamId: '65e000000000000000000001',
      title: 'A Valid Capstone Project Title',
      titleProposals: ['A Valid Capstone Project Title'],
      academicYear: '2025-2026',
      courseId: '65e000000000000000000003',
      sectionId: '65e000000000000000000004',
      defenseSchedule: {
        status: 'unscheduled',
      },
    });

    await expect(validProject.validate()).resolves.toBeUndefined();
    expect(Project.schema.path('defenseSchedule.status').enumValues).toContain('unscheduled');
  });
});
