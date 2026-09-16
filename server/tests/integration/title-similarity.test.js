/**
 * Integration tests — Capstone Title Similarity Check & Title Lock.
 *
 * Covers the three required scenarios:
 *  1) A title ~85 % similar to an existing one returns a warning with conflicting titles.
 *  2) A completely unique title (< 20 % overlap) passes clean.
 *  3) Updating a title on an APPROVED project returns HTTP 403 (TITLE_LOCKED).
 *
 * Uses the seeding helper from `tests/seeds/capstone-titles.seed.js`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import { seedCapstoneProjects, CAPSTONE_TITLES } from '../seeds/capstone-titles.seed.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import { TITLE_STATUSES } from '@cms/shared';

/* ------------------------------------------------------------------ */
/*  Local factory helpers                                              */
/* ------------------------------------------------------------------ */

async function createLockedTeam(leaderId) {
  const team = await Team.create({
    name: 'Test Team',
    leaderId,
    members: [leaderId],
    isLocked: true,
    academicYear: '2024-2025',
  });
  await User.findByIdAndUpdate(leaderId, { teamId: team._id });
  return team;
}

/* ================================================================== */
/*  Test suite                                                        */
/* ================================================================== */

describe('Title Similarity & Lock — /api/projects', () => {
  let studentAgent, studentUser;
  let instructorUser;
  let instructorAgent;
  let team;
  let course;
  let section;

  function buildProjectRequestPayload(title) {
    const payload = createValidProjectPayload(team._id, course._id, section._id, [studentUser._id]);
    payload.title = title;

    // We must pass objects for titleProposals as of the updated schema
    const defaultProposals = payload.titleProposals;

    payload.titleProposals = [
      {
        title,
        description: 'This is a sufficiently long description',
        capstoneType: ['Implementation'],
        sdgTags: ['SDG 4: Quality Education'],
      },
      {
        title: title + ' 1',
        description: 'This is a sufficiently long description',
        capstoneType: ['Implementation'],
        sdgTags: ['SDG 4: Quality Education'],
      },
      {
        title: title + ' 2',
        description: 'This is a sufficiently long description',
        capstoneType: ['Implementation'],
        sdgTags: ['SDG 4: Quality Education'],
      },
      {
        title: title + ' 3',
        description: 'This is a sufficiently long description',
        capstoneType: ['Implementation'],
        sdgTags: ['SDG 4: Quality Education'],
      },
      {
        title: title + ' 4',
        description: 'This is a sufficiently long description',
        capstoneType: ['Implementation'],
        sdgTags: ['SDG 4: Quality Education'],
      },
    ];

    payload.memberRoleAssignments = [
      {
        userId: studentUser._id,
        role: 'Developer',
        professionalTitle: 'Lead Developer',
        traditionalRole: 'Programmer',
        responsibilities: 'System Logic',
      },
    ];

    delete payload.teamId;
    return payload;
  }

  beforeEach(async () => {
    // Seed existing corpus of capstone titles (12 projects)
    await seedCapstoneProjects();

    // Create the test student (team leader)
    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'title-test-student@test.com',
      firstName: 'Title',
      lastName: 'Tester',
    }));

    // Create an instructor for approval flow
    ({ agent: instructorAgent, user: instructorUser } = await createAuthenticatedUserWithRole(
      'instructor',
      {
        email: 'title-test-instructor@test.com',
        firstName: 'Title',
        lastName: 'Instructor',
      },
    ));

    // Create and link team
    team = await createLockedTeam(studentUser._id);
    studentUser = await User.findById(studentUser._id);

    const courseSection = await createCourseAndSection(instructorUser._id);
    course = courseSection.course;
    section = courseSection.section;
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  1) ~85 % similar title → warning with conflicting titles       */
  /* ─────────────────────────────────────────────────────────────── */

  describe('POST /title-check — similarity warning', () => {
    it('should return similar titles when input is ~85% match', async () => {
      // The seeded title #0 is:
      //   "Capstone Management System with Integrated Plagiarism Checker"
      // We submit a closely-worded variant that should score ≥ 0.70
      const nearDuplicate = 'Capstone Management System with Plagiarism Checker';

      const res = await studentAgent.post('/api/projects/title-check').send({
        title: nearDuplicate,
        keywords: ['capstone', 'management', 'plagiarism'],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.threshold).toBeGreaterThan(0);

      const { similarProjects } = res.body.data;
      expect(Array.isArray(similarProjects)).toBe(true);
      expect(similarProjects.length).toBeGreaterThanOrEqual(1);

      // The highest-scoring match should reference the seeded title
      const topMatch = similarProjects[0];
      expect(topMatch).toHaveProperty('title');
      expect(topMatch).toHaveProperty('score');
      expect(topMatch.score).toBeGreaterThanOrEqual(0.7);
      expect(topMatch.title).toContain('Capstone Management System');
    });

    it('should detect similarity when a known title is repeated in a longer noisy string', async () => {
      const repeatedNearDuplicate =
        'Capstone Management System with Integrated Plagiarism CheckerCapstone Management System with Integrated Plagiarism Checker';

      const res = await studentAgent.post('/api/projects/title-check').send({
        title: repeatedNearDuplicate,
        keywords: ['capstone', 'management', 'plagiarism'],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { similarProjects } = res.body.data;
      expect(Array.isArray(similarProjects)).toBe(true);
      expect(similarProjects.length).toBeGreaterThanOrEqual(1);
      expect(similarProjects[0].score).toBeGreaterThanOrEqual(0.7);
      expect(similarProjects[0].title).toContain('Capstone Management System');
    });
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  2) Completely unique title → clean pass (no similar projects)  */
  /* ─────────────────────────────────────────────────────────────── */

  describe('POST /title-check — unique title', () => {
    it('should return empty similar list for a completely unique title', async () => {
      const uniqueTitle = 'Underwater Acoustic Sensor Network for Coral Reef Monitoring';

      const res = await studentAgent.post('/api/projects/title-check').send({
        title: uniqueTitle,
        keywords: ['underwater', 'acoustic', 'coral reef', 'sensor network'],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.similarProjects).toEqual([]);
    });

    it('should exclude own project from matches when excludeProjectId is passed or inferred from team', async () => {
      const selfTitle = 'Self Owned Unique Capstone Title Alpha';
      const payload = buildProjectRequestPayload(selfTitle);
      const createRes = await studentAgent.post('/api/projects').send(payload);
      expect(createRes.status).toBe(201);
      const projectId = createRes.body.data.project._id;

      // 1. Explicit excludeProjectId
      const resExplicit = await studentAgent.post('/api/projects/title-check').send({
        title: selfTitle,
        excludeProjectId: projectId,
      });
      expect(resExplicit.status).toBe(200);
      expect(resExplicit.body.data.similarProjects).toEqual([]);

      // 2. Inferred excludeProjectId from user's team
      const resInferred = await studentAgent.post('/api/projects/title-check').send({
        title: selfTitle,
      });
      expect(resInferred.status).toBe(200);
      expect(resInferred.body.data.similarProjects).toEqual([]);
    });

    it('should safely return 200 when user has no team and no excludeProjectId is passed', async () => {
      const { agent: unassignedStudent } = await createAuthenticatedUserWithRole('student', {
        email: 'unassigned-student@test.com',
        firstName: 'Unassigned',
        lastName: 'Student',
      });

      const res = await unassignedStudent.post('/api/projects/title-check').send({
        title: 'Autonomous Drone Swarm Navigation in Forest Canopy',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.similarProjects)).toBe(true);
    });
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  3) Updating an APPROVED title → 403 TITLE_LOCKED              */
  /* ─────────────────────────────────────────────────────────────── */

  describe('PATCH /:id/title — CheckLock middleware', () => {
    it('should return 403 when title is approved (locked)', async () => {
      // Create a project and fast-forward to APPROVED status
      const payload = buildProjectRequestPayload('Unique Capstone Title for Lock Testing Scenario');

      const createRes = await studentAgent.post('/api/projects').send(payload);

      if (createRes.status !== 201) {
        console.error('CREATE PROJECT RESULT:', createRes.body);
      }

      expect(createRes.status).toBe(201);
      const projectId = createRes.body.data.project._id;

      // Submit the title (DRAFT → SUBMITTED)
      const submitRes = await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      expect(submitRes.status).toBe(200);

      // Approve the title via instructor (SUBMITTED → APPROVED)
      const approveRes = await instructorAgent
        .post(`/api/projects/${projectId}/title/approve`)
        .send({});
      expect(approveRes.status).toBe(200);

      // Verify it's actually approved
      const project = await Project.findById(projectId);
      expect(project.titleStatus).toBe(TITLE_STATUSES.APPROVED);

      // Attempt to update title — should be blocked by CheckLock middleware
      const updateRes = await studentAgent
        .patch(`/api/projects/${projectId}/title`)
        .send({ title: 'Attempt to Change an Approved Locked Title' });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.error.code).toBe('TITLE_LOCKED');
    });

    it('should return 403 on revise when title is approved', async () => {
      // Create + submit + approve
      const createRes = await studentAgent
        .post('/api/projects')
        .send(buildProjectRequestPayload('Another Capstone Title for Revise Lock Test'));
      const projectId = createRes.body.data.project._id;

      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      await instructorAgent.post(`/api/projects/${projectId}/title/approve`).send({});

      // Attempt revise — should also be blocked
      const reviseRes = await studentAgent
        .patch(`/api/projects/${projectId}/title/revise`)
        .send({ title: 'Attempt to Revise an Approved Locked Title' });

      expect(reviseRes.status).toBe(403);
      expect(reviseRes.body.error.code).toBe('TITLE_LOCKED');
    });
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  4) POST /:projectId/title/submit — Server-side Clearance Gate   */
  /* ─────────────────────────────────────────────────────────────── */

  describe('POST /:projectId/title/submit — Server-side Similarity Clearance Gate', () => {
    it('should reject title submission with 409 Conflict if title has >= 65% similarity with an existing project', async () => {
      // Seeded project 0: "Capstone Management System with Integrated Plagiarism Checker"
      // Submit a near-duplicate title that will score >= 65%
      const conflictingTitle = 'Capstone Management System with Plagiarism Checker';
      const payload = buildProjectRequestPayload(conflictingTitle);

      const createRes = await studentAgent.post('/api/projects').send(payload);
      expect(createRes.status).toBe(201);
      const projectId = createRes.body.data.project._id;

      // Attempt to submit title for defense review — must be rejected by similarity gate
      const submitRes = await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      expect(submitRes.status).toBe(409);
      expect(submitRes.body.error.code).toBe('TITLE_SIMILARITY_CONFLICT');
      expect(submitRes.body.error.message).toContain('65%');
    });

    it('should permit title submission with 200 OK if title has no similarity conflict', async () => {
      const distinctTitle = 'Autonomous Drone Swarm Navigation in Tropical Agroforest Canopies';
      const payload = buildProjectRequestPayload(distinctTitle);

      const createRes = await studentAgent.post('/api/projects').send(payload);
      expect(createRes.status).toBe(201);
      const projectId = createRes.body.data.project._id;

      const submitRes = await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);

      const updated = await Project.findById(projectId);
      expect(updated.titleStatus).toBe(TITLE_STATUSES.SUBMITTED);
    });
  });
});
