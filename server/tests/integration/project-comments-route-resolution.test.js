import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { ROLES } from '@cms/shared';
import projectRoutes from '../../modules/projects/project.routes.js';
import userRoutes from '../../modules/users/user.routes.js';
import Course from '../../modules/academics/course.model.js';
import Section from '../../modules/academics/section.model.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import errorHandler from '../../middleware/errorHandler.js';
import AppError from '../../utils/AppError.js';
import { generateAccessToken } from '../../utils/generateToken.js';

function createRouteHarness(basePath, router) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(basePath, router);
  app.all('*', (req, _res, next) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });
  app.use(errorHandler);
  return supertest(app);
}

async function seedProjectForAccessTest(ownerStudentId, createdByUserId) {
  const academicYear = '2024-2025';
  const suffix = Date.now().toString().slice(-6);
  const course = await Course.create({
    name: `Route Access Course ${suffix}`,
    code: `RAC${suffix}`,
    createdBy: createdByUserId,
  });

  const section = await Section.create({
    name: `Route Access Section ${suffix}`,
    code: `RAS${suffix}`,
    courseId: course._id,
    academicYear,
    createdBy: createdByUserId,
  });

  const team = await Team.create({
    name: `Route Access Team ${suffix}`,
    leaderId: ownerStudentId,
    members: [ownerStudentId],
    isLocked: true,
    academicYear,
    courseId: course._id,
    sectionId: section._id,
  });

  await User.findByIdAndUpdate(ownerStudentId, { teamId: team._id, sectionId: section._id });

  const title = `Route Access Test Project ${suffix}`;
  const project = await Project.create({
    teamId: team._id,
    title,
    titleProposals: [
      title,
      `${title} - Variant 1`,
      `${title} - Variant 2`,
      `${title} - Variant 3`,
      `${title} - Variant 4`,
    ],
    abstract: 'Project used for route-level and service-level authorization tests.',
    keywords: ['route', 'authorization'],
    academicYear,
    courseId: course._id,
    sectionId: section._id,
    memberRoleAssignments: [
      {
        userId: ownerStudentId,
        professionalTitle: 'Lead Developer',
        traditionalRole: 'Programmer',
        responsibilities: 'Owns architecture and core implementation.',
      },
    ],
  });

  return { project, section };
}

describe('Projects comments route resolution', () => {
  it('keeps users import-students reachable (not unmatched 404)', async () => {
    const user = await User.create({
      firstName: 'Import',
      lastName: 'Verifier',
      email: 'import-verifier@example.com',
      password: 'Password123',
      role: ROLES.INSTRUCTOR,
      isVerified: true,
      isActive: true,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const request = createRouteHarness('/api/users', userRoutes);

    const response = await request
      .post('/api/users/import-students')
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ sectionId: new mongoose.Types.ObjectId().toString() });

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(400);
  });

  it('matches the comments route and still 404s for an invalid sibling path', async () => {
    const user = await User.create({
      firstName: 'Route',
      lastName: 'Verifier',
      email: 'route-verifier@example.com',
      password: 'Password123',
      role: ROLES.INSTRUCTOR,
      isVerified: true,
      isActive: true,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const request = createRouteHarness('/api/projects', projectRoutes);

    const projectId = new mongoose.Types.ObjectId().toString();
    const proposalId = '0';
    const body = { text: 'Route-level verification comment' };

    const matchedRouteResponse = await request
      .post(`/api/projects/${projectId}/title-proposals/${proposalId}/comments`)
      .set('Cookie', [`accessToken=${accessToken}`])
      .send(body);

    // The route is mounted and matched; the 404 here comes from project lookup, not router mismatch.
    expect(matchedRouteResponse.status).toBe(404);
    expect(matchedRouteResponse.body?.error?.code).toBe('PROJECT_NOT_FOUND');

    const unmatchedSiblingResponse = await request
      .post(`/api/projects/${projectId}/title-proposals/${proposalId}/comment`)
      .set('Cookie', [`accessToken=${accessToken}`])
      .send(body);

    expect(unmatchedSiblingResponse.status).toBe(404);
    expect(unmatchedSiblingResponse.body?.error?.code).toBe('NOT_FOUND');
    expect(unmatchedSiblingResponse.body?.error?.message).toContain(
      `/api/projects/${projectId}/title-proposals/${proposalId}/comment`,
    );
  });

  it("blocks students from fetching another team's project via GET /api/projects/:id", async () => {
    const owner = await User.create({
      firstName: 'Owner',
      lastName: 'Student',
      email: 'owner-student@example.com',
      password: 'Password123',
      role: ROLES.STUDENT,
      isVerified: true,
      isActive: true,
    });

    const intruder = await User.create({
      firstName: 'Other',
      lastName: 'Student',
      email: 'other-student@example.com',
      password: 'Password123',
      role: ROLES.STUDENT,
      isVerified: true,
      isActive: true,
    });

    const facultyCreator = await User.create({
      firstName: 'Creator',
      lastName: 'Faculty',
      email: 'faculty-creator@example.com',
      password: 'Password123',
      role: ROLES.INSTRUCTOR,
      isVerified: true,
      isActive: true,
    });

    const { project } = await seedProjectForAccessTest(owner._id, facultyCreator._id);
    const intruderToken = generateAccessToken({
      userId: intruder._id.toString(),
      role: intruder.role,
    });

    const request = createRouteHarness('/api/projects', projectRoutes);
    const response = await request
      .get(`/api/projects/${project._id}`)
      .set('Cookie', [`accessToken=${intruderToken}`]);

    expect(response.status).toBe(403);
    expect(response.body?.error?.code).toBe('FORBIDDEN');
  });

  it('allows faculty to fetch a project via GET /api/projects/:id', async () => {
    const owner = await User.create({
      firstName: 'Owner',
      lastName: 'Student',
      email: 'owner-student-2@example.com',
      password: 'Password123',
      role: ROLES.STUDENT,
      isVerified: true,
      isActive: true,
    });

    const instructor = await User.create({
      firstName: 'Faculty',
      lastName: 'Viewer',
      email: 'faculty-viewer@example.com',
      password: 'Password123',
      role: ROLES.INSTRUCTOR,
      isVerified: true,
      isActive: true,
    });

    const { project } = await seedProjectForAccessTest(owner._id, instructor._id);
    const facultyToken = generateAccessToken({
      userId: instructor._id.toString(),
      role: instructor.role,
    });

    const request = createRouteHarness('/api/projects', projectRoutes);
    const response = await request
      .get(`/api/projects/${project._id}`)
      .set('Cookie', [`accessToken=${facultyToken}`]);

    expect(response.status).toBe(200);
    expect(response.body?.data?.project?._id).toBe(project._id.toString());
  });

  it('flags non-student existing users during student import', async () => {
    const instructor = await User.create({
      firstName: 'Import',
      lastName: 'Faculty',
      email: 'import-faculty@example.com',
      password: 'Password123',
      role: ROLES.INSTRUCTOR,
      isVerified: true,
      isActive: true,
    });

    const nonStudent = await User.create({
      firstName: 'Existing',
      lastName: 'Adviser',
      email: 'existing-adviser@example.com',
      password: 'Password123',
      role: ROLES.ADVISER,
      isVerified: true,
      isActive: true,
    });

    const course = await Course.create({
      name: 'Import Security Course',
      code: 'ISC101',
      createdBy: instructor._id,
    });
    const section = await Section.create({
      name: 'Import Security Section',
      code: 'ISS101',
      courseId: course._id,
      academicYear: '2024-2025',
      createdBy: instructor._id,
    });

    const csv = [
      'firstName,lastName,email,schoolId',
      'Imported,Row,existing-adviser@example.com,2026-0001',
    ].join('\n');

    const accessToken = generateAccessToken({
      userId: instructor._id.toString(),
      role: instructor.role,
    });

    const request = createRouteHarness('/api/users', userRoutes);
    const response = await request
      .post('/api/users/import-students')
      .set('Cookie', [`accessToken=${accessToken}`])
      .field('sectionId', section._id.toString())
      .attach('file', Buffer.from(csv), 'students.csv');

    expect(response.status).toBe(200);
    expect(response.body?.data?.created).toBe(0);
    expect(response.body?.data?.skipped).toBe(1);
    expect(response.body?.data?.errors?.[0]).toContain('not a student');

    const refreshedNonStudent = await User.findById(nonStudent._id);
    expect(refreshedNonStudent?.sectionId).toBeNull();
  });
});
