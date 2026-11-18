import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import { canAccessProjectStorageFile } from '../../middleware/storage-file-server.middleware.js';

const projectId = '65a000000000000000000001';
const teamId = '65a000000000000000000002';
const studentId = '65a000000000000000000003';
const adviserId = '65a000000000000000000004';
const panelistId = '65a000000000000000000005';

describe('local project file access', () => {
  let project;

  beforeEach(() => {
    project = {
      teamId,
      memberRoleAssignments: [],
      adviserId,
      panelistIds: [panelistId],
    };
    vi.spyOn(Project, 'findById').mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(project) }),
    });
    vi.spyOn(Team, 'findById').mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ members: [studentId], leaderId: studentId }),
      }),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('allows project students, assigned advisers, assigned panelists, and instructors', async () => {
    await expect(
      canAccessProjectStorageFile({ _id: studentId, role: 'student' }, projectId),
    ).resolves.toBe(true);
    await expect(
      canAccessProjectStorageFile({ _id: adviserId, role: 'faculty' }, projectId),
    ).resolves.toBe(true);
    await expect(
      canAccessProjectStorageFile({ _id: panelistId, role: 'faculty' }, projectId),
    ).resolves.toBe(true);
    await expect(
      canAccessProjectStorageFile(
        { _id: '65a000000000000000000006', role: 'instructor' },
        projectId,
      ),
    ).resolves.toBe(true);
  });

  it('denies unrelated faculty and students, including archived projects', async () => {
    await expect(
      canAccessProjectStorageFile({ _id: '65a000000000000000000006', role: 'faculty' }, projectId),
    ).resolves.toBe(false);
    await expect(
      canAccessProjectStorageFile({ _id: '65a000000000000000000006', role: 'student' }, projectId),
    ).resolves.toBe(false);
    project.isArchived = true;
    await expect(
      canAccessProjectStorageFile({ _id: '65a000000000000000000006', role: 'student' }, projectId),
    ).resolves.toBe(false);
  });

  it('fails closed for missing projects and unauthenticated users', async () => {
    Project.findById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    });
    await expect(
      canAccessProjectStorageFile({ _id: studentId, role: 'student' }, projectId),
    ).resolves.toBe(false);
    await expect(canAccessProjectStorageFile(null, projectId)).resolves.toBe(false);
  });
});
