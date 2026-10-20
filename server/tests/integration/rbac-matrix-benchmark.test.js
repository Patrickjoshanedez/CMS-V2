import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  createAgent,
  createAuthenticatedUserWithRole,
  createVerifiedUser,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import env from '../../config/env.js';
import { ROLES, TITLE_STATUSES } from '@cms/shared';

describe('Table 4.4 RBAC Security & Institutional Governance Matrix', () => {
  it('Rule 1: Instructor excluded from committee appointment (HTTP 400)', async () => {
    const { agent: instructorAgent, user: instructorUser } = await createAuthenticatedUserWithRole(
      ROLES.INSTRUCTOR,
    );
    const student = await createVerifiedUser({ role: ROLES.STUDENT });
    const anotherInstructor = await createVerifiedUser({ role: ROLES.INSTRUCTOR });

    const team = await Team.create({
      name: `Team Benchmark R1-${Date.now()}`,
      leaderId: student._id,
      members: [student._id],
      academicYear: '2025-2026',
      isLocked: true,
    });

    const res = await instructorAgent.put(`/api/teams/${team._id}/committee`).send({
      adviserId: anotherInstructor._id.toString(),
    });

    const getMsg = (r) => r.body.error?.message || r.body.message || '';
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(getMsg(res)).toMatch(/Course instructors cannot serve as a capstone adviser/i);
  });

  it('Rule 2: Adviser and Panelist mutual exclusion on the same team (HTTP 400)', async () => {
    const { agent: instructorAgent } = await createAuthenticatedUserWithRole(ROLES.INSTRUCTOR);
    const student = await createVerifiedUser({ role: ROLES.STUDENT });
    const facultyUser = await createVerifiedUser({ role: ROLES.FACULTY });

    const team = await Team.create({
      name: `Team Benchmark R2-${Date.now()}`,
      leaderId: student._id,
      members: [student._id],
      academicYear: '2025-2026',
      isLocked: true,
    });

    const res = await instructorAgent.put(`/api/teams/${team._id}/committee`).send({
      adviserId: facultyUser._id.toString(),
      panelistIds: [facultyUser._id.toString()],
    });

    const getMsg = (r) => r.body.error?.message || r.body.message || '';
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(getMsg(res)).toMatch(/cannot serve as a defense panelist on the same team/i);
  });

  it('Rule 3: Committee signing blocked before Secretary endorsement (HTTP 403)', async () => {
    const { agent: adviserAgent, user: adviserUser } = await createAuthenticatedUserWithRole(
      ROLES.ADVISER,
    );
    const { user: instructorUser } = await createAuthenticatedUserWithRole(ROLES.INSTRUCTOR);
    const student = await createVerifiedUser({ role: ROLES.STUDENT });

    const team = await Team.create({
      name: `Team Benchmark R3-${Date.now()}`,
      leaderId: student._id,
      members: [student._id],
      academicYear: '2025-2026',
      isLocked: true,
    });

    const { course, section } = await createCourseAndSection(instructorUser._id);
    const payload = createValidProjectPayload(team._id, course._id, section._id, [student._id]);
    payload.title = `Benchmark Project R3-${Date.now()}`;
    payload.adviserId = adviserUser._id;
    payload.capstonePhase = 1;
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.admSignaturesByMilestone = {
      CAPSTONE_1: {
        secretary: { endorsed: false },
      },
    };

    const project = await Project.create(payload);

    const res = await adviserAgent.post(`/api/projects/${project._id}/adm-signatures`).send({
      milestone: 'CAPSTONE_1',
      role: 'adviser',
      tier: 1,
      signatoryName: 'Prof. Adviser',
    });

    const getMsg = (r) => r.body.error?.message || r.body.message || '';
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(getMsg(res)).toMatch(/must be reviewed and endorsed by the Committee Secretary/i);
  });

  it('Rule 4: Non-appointed Secretary writing/saving minutes (HTTP 403)', async () => {
    const { agent: nonSecAgent, user: nonSecUser } = await createAuthenticatedUserWithRole(
      ROLES.FACULTY,
    );
    const { user: instructorUser } = await createAuthenticatedUserWithRole(ROLES.INSTRUCTOR);
    const secretary = await createVerifiedUser({ role: ROLES.FACULTY });
    const student = await createVerifiedUser({ role: ROLES.STUDENT });

    const team = await Team.create({
      name: `Team Benchmark R4-${Date.now()}`,
      leaderId: student._id,
      members: [student._id],
      academicYear: '2025-2026',
      isLocked: true,
    });

    const { course, section } = await createCourseAndSection(instructorUser._id);
    const payload = createValidProjectPayload(team._id, course._id, section._id, [student._id]);
    payload.title = `Benchmark Project R4-${Date.now()}`;
    payload.secretaryId = secretary._id;
    payload.capstonePhase = 2;
    payload.titleStatus = TITLE_STATUSES.APPROVED;

    const project = await Project.create(payload);

    const res = await nonSecAgent.post('/api/submissions/secretary/save-minutes').send({
      projectId: project._id.toString(),
      milestone: 'CAPSTONE_2',
      minutesData: {
        defenseType: 'prototype',
        panelRemarks: [],
      },
    });

    const getMsg = (r) => r.body.error?.message || r.body.message || '';
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(getMsg(res)).toMatch(/requires secretary capability/i);
  });

  it('Rule 5: Student editing/modifying defense minutes (HTTP 403)', async () => {
    const { agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole(
      ROLES.STUDENT,
    );
    const { user: instructorUser } = await createAuthenticatedUserWithRole(ROLES.INSTRUCTOR);

    const team = await Team.create({
      name: `Team Benchmark R5-${Date.now()}`,
      leaderId: studentUser._id,
      members: [studentUser._id],
      academicYear: '2025-2026',
      isLocked: true,
    });

    const { course, section } = await createCourseAndSection(instructorUser._id);
    const payload = createValidProjectPayload(team._id, course._id, section._id, [studentUser._id]);
    payload.title = `Benchmark Project R5-${Date.now()}`;
    payload.capstonePhase = 2;
    payload.titleStatus = TITLE_STATUSES.APPROVED;

    const project = await Project.create(payload);

    const res = await studentAgent.post('/api/submissions/secretary/save-minutes').send({
      projectId: project._id.toString(),
      milestone: 'CAPSTONE_2',
      minutesData: {},
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Rule 6: Expired or tampered JWT rejection (HTTP 401)', async () => {
    const unauthAgent = createAgent();

    // 6a. Tampered token
    const tamperedToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwicm9sZSI6InN0dWRlbnQifQ.TAMPERED_SIGNATURE';
    const resTampered = await unauthAgent
      .get('/api/users/me')
      .set('Cookie', [`accessToken=${tamperedToken}`]);

    expect(resTampered.status).toBe(401);

    // 6b. Expired token
    const expiredToken = jwt.sign(
      { userId: '65e000000000000000000099', role: 'student' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-10s' },
    );
    const resExpired = await unauthAgent
      .get('/api/users/me')
      .set('Cookie', [`accessToken=${expiredToken}`]);

    expect(resExpired.status).toBe(401);
  });
});
