import { describe, it, expect } from 'vitest';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import User from '../../modules/users/user.model.js';
import Project from '../../modules/projects/project.model.js';
import { PROJECT_STATUSES } from '@cms/shared';

const buildTitleProposals = (baseTitle) => [
  `${baseTitle} Option 1`,
  `${baseTitle} Option 2`,
  `${baseTitle} Option 3`,
  `${baseTitle} Option 4`,
  `${baseTitle} Option 5`,
];

describe('Projects API — Archive search course filter', () => {
  it('should filter archived projects by courseId', async () => {
    const { agent: instructorAgent, user: instructor } = await createAuthenticatedUserWithRole(
      'instructor',
      { email: 'archive-filter-inst@example.com' },
    );

    const { user: studentOne } = await createAuthenticatedUserWithRole('student', {
      email: 'archive-filter-student-1@example.com',
    });

    const { user: studentTwo } = await createAuthenticatedUserWithRole('student', {
      email: 'archive-filter-student-2@example.com',
    });

    const { course: courseOne, section: sectionOne } = await createCourseAndSection(instructor._id);
    const { course: courseTwo, section: sectionTwo } = await createCourseAndSection(instructor._id);

    await User.findByIdAndUpdate(studentOne._id, { sectionId: sectionOne._id });
    await User.findByIdAndUpdate(studentTwo._id, { sectionId: sectionTwo._id });

    const teamOne = await Team.create({
      name: 'Archive Team One',
      leaderId: studentOne._id,
      members: [studentOne._id],
      academicYear: '2024-2025',
      courseId: courseOne._id,
      sectionId: sectionOne._id,
    });

    const teamTwo = await Team.create({
      name: 'Archive Team Two',
      leaderId: studentTwo._id,
      members: [studentTwo._id],
      academicYear: '2024-2025',
      courseId: courseTwo._id,
      sectionId: sectionTwo._id,
    });

    const courseOneTitle = 'Archive Filter Course One Project';
    const courseTwoTitle = 'Archive Filter Course Two Project';

    const payloadOne = createValidProjectPayload(teamOne._id, courseOne._id, sectionOne._id, [
      studentOne._id,
    ]);
    payloadOne.title = courseOneTitle;
    payloadOne.titleProposals = buildTitleProposals(courseOneTitle);

    const payloadTwo = createValidProjectPayload(teamTwo._id, courseTwo._id, sectionTwo._id, [
      studentTwo._id,
    ]);
    payloadTwo.title = courseTwoTitle;
    payloadTwo.titleProposals = buildTitleProposals(courseTwoTitle);

    await Project.create({
      ...payloadOne,
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      isArchived: true,
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await Project.create({
      ...payloadTwo,
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      isArchived: true,
      archivedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const res = await instructorAgent.get(`/api/projects/archive/search?courseId=${courseOne._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const titles = res.body.data.projects.map((project) => project.title);
    expect(titles).toContain(courseOneTitle);
    expect(titles).not.toContain(courseTwoTitle);
  });
});
