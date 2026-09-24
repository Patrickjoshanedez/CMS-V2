import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import projectService from '../../modules/projects/project.service.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import * as socketService from '../../services/socket.service.js';
import { ROLES } from '@cms/shared';

describe('projectService.assignPanelist & assignAdviser - Institutional Role Guards & Synchronization', () => {
  const instructorId = '65e000000000000000000001';
  const projectId = '65e000000000000000000002';
  const facultyId = '65e000000000000000000003';
  const studentId = '65e000000000000000000004';
  const instructorRoleId = '65e000000000000000000005';

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
      title: 'Disaster Early Warning System',
      teamId: '65e000000000000000000099',
      adviserId: null,
      panelistIds: [],
      panelists: [],
      save: vi.fn().mockResolvedValue(true),
      populate: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Project, 'findById').mockImplementation(() => createQueryMock(mockProject));
    vi.spyOn(Notification, 'create').mockResolvedValue({ _id: 'notif-1' });
    vi.spyOn(projectService, '_notifyTeamMembers').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows appointing a faculty member with role "faculty" as panelist (Louie Labastida case)', async () => {
    const facultyUser = {
      _id: facultyId,
      role: ROLES.FACULTY,
      fullName: 'Louie Labastida',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(facultyUser);

    const result = await projectService.assignPanelist(projectId, instructorId, {
      panelistId: facultyId,
    });

    expect(result.project.panelistIds).toContain(facultyId);
    expect(result.project.panelists).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: facultyId, role: 'chair' })]),
    );
    expect(result.project.save).toHaveBeenCalled();
  });

  it('rejects appointing a student as panelist', async () => {
    const studentUser = {
      _id: studentId,
      role: ROLES.STUDENT,
      fullName: 'Student Juan',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(studentUser);

    await expect(
      projectService.assignPanelist(projectId, instructorId, { panelistId: studentId }),
    ).rejects.toThrow('Course instructors and students cannot serve as defense panelists.');
  });

  it('rejects appointing a course instructor as panelist', async () => {
    const instUser = {
      _id: instructorRoleId,
      role: ROLES.INSTRUCTOR,
      fullName: 'Instructor Gomez',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(instUser);

    await expect(
      projectService.assignPanelist(projectId, instructorId, { panelistId: instructorRoleId }),
    ).rejects.toThrow('Course instructors and students cannot serve as defense panelists.');
  });

  it('rejects appointing an adviser as a panelist on the same project (conflict of interest)', async () => {
    mockProject.adviserId = facultyId;
    const facultyUser = {
      _id: facultyId,
      role: ROLES.FACULTY,
      fullName: 'Dr. Santos',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(facultyUser);

    await expect(
      projectService.assignPanelist(projectId, instructorId, { panelistId: facultyId }),
    ).rejects.toThrow('A faculty adviser cannot serve as a defense panelist on the same project.');
  });

  it('rejects appointing an existing panelist as adviser on the same project (conflict of interest)', async () => {
    mockProject.panelistIds = [facultyId];
    const facultyUser = {
      _id: facultyId,
      role: ROLES.FACULTY,
      fullName: 'Dr. Santos',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(facultyUser);

    await expect(
      projectService.assignAdviser(projectId, instructorId, { adviserId: facultyId }),
    ).rejects.toThrow(
      'A defense panelist cannot serve as the faculty adviser on the same project.',
    );
  });

  it('synchronizes project.panelists when removing a panelist', async () => {
    mockProject.panelistIds = [facultyId];
    mockProject.panelists = [{ userId: facultyId, role: 'chair' }];

    const facultyUser = {
      _id: facultyId,
      role: ROLES.FACULTY,
      fullName: 'Louie Labastida',
    };

    vi.spyOn(User, 'findById').mockResolvedValue(facultyUser);

    const result = await projectService.removePanelist(projectId, instructorId, {
      panelistId: facultyId,
    });

    expect(result.project.panelistIds).not.toContain(facultyId);
    expect(result.project.panelists).toHaveLength(0);
    expect(result.project.save).toHaveBeenCalled();
  });
});
