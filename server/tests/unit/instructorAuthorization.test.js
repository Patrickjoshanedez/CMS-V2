import { afterEach, describe, expect, it, vi } from 'vitest';
import User from '../../modules/users/user.model.js';
import Section from '../../modules/academics/section.model.js';
import { assertAssignedInstructorForTeam } from '../../modules/academics/instructorAuthorization.js';

const instructorId = '65e000000000000000000001';
const foreignInstructorId = '65e000000000000000000009';

describe('assigned instructor authorization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('allows the instructor assigned to the team leader', async () => {
    await expect(
      assertAssignedInstructorForTeam(
        { leaderId: { _id: '65e000000000000000000002', instructorId } },
        instructorId,
      ),
    ).resolves.toBeUndefined();
  });

  it('falls back to the section owner when the leader has no instructor assignment', async () => {
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ sectionId: '65e000000000000000000003' }),
    });
    vi.spyOn(Section, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ createdBy: instructorId }),
    });

    await expect(
      assertAssignedInstructorForTeam({ leaderId: '65e000000000000000000002' }, instructorId),
    ).resolves.toBeUndefined();
  });

  it('rejects a foreign or unassigned instructor', async () => {
    await expect(
      assertAssignedInstructorForTeam(
        { leaderId: { _id: '65e000000000000000000002', instructorId } },
        foreignInstructorId,
      ),
    ).rejects.toMatchObject({ code: 'NOT_ASSIGNED_INSTRUCTOR', statusCode: 403 });

    await expect(assertAssignedInstructorForTeam({}, instructorId)).rejects.toMatchObject({
      code: 'NOT_ASSIGNED_INSTRUCTOR',
    });
  });
});
