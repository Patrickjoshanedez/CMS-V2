import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectService from '../../modules/projects/project.service.js';
import Project from '../../modules/projects/project.model.js';
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

    mockProject = {
      _id: projectId,
      title: 'CMS Project',
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
      panelistIds: [],
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
});
