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
  let instructorAgent;
  let team;

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
    ({ agent: instructorAgent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'title-test-instructor@test.com',
      firstName: 'Title',
      lastName: 'Instructor',
    }));

    // Create and link team
    team = await createLockedTeam(studentUser._id);
    studentUser = await User.findById(studentUser._id);
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

      const res = await studentAgent
        .post('/api/projects/title-check')
        .send({
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
      expect(topMatch.score).toBeGreaterThanOrEqual(0.70);
      expect(topMatch.title).toContain('Capstone Management System');
    });
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  2) Completely unique title → clean pass (no similar projects)  */
  /* ─────────────────────────────────────────────────────────────── */

  describe('POST /title-check — unique title', () => {
    it('should return empty similar list for a completely unique title', async () => {
      const uniqueTitle = 'Underwater Acoustic Sensor Network for Coral Reef Monitoring';

      const res = await studentAgent
        .post('/api/projects/title-check')
        .send({
          title: uniqueTitle,
          keywords: ['underwater', 'acoustic', 'coral reef', 'sensor network'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.similarProjects).toEqual([]);
    });
  });

  /* ─────────────────────────────────────────────────────────────── */
  /*  3) Updating an APPROVED title → 403 TITLE_LOCKED              */
  /* ─────────────────────────────────────────────────────────────── */

  describe('PATCH /:id/title — CheckLock middleware', () => {
    it('should return 403 when title is approved (locked)', async () => {
      // Create a project and fast-forward to APPROVED status
      const createRes = await studentAgent.post('/api/projects').send({
        title: 'Unique Capstone Title for Lock Testing Scenario',
        abstract: 'Testing the title lock feature of the CMS.',
        keywords: ['lock', 'testing'],
        academicYear: '2024-2025',
      });

      expect(createRes.status).toBe(201);
      const projectId = createRes.body.data.project._id;

      // Submit the title (DRAFT → SUBMITTED)
      const submitRes = await studentAgent
        .post(`/api/projects/${projectId}/title/submit`)
        .send({});
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
      const createRes = await studentAgent.post('/api/projects').send({
        title: 'Another Capstone Title for Revise Lock Test',
        abstract: 'Testing the revise lock scenario.',
        keywords: ['revise', 'lock'],
        academicYear: '2024-2025',
      });
      const projectId = createRes.body.data.project._id;

      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      await instructorAgent
        .post(`/api/projects/${projectId}/title/approve`)
        .send({});

      // Attempt revise — should also be blocked
      const reviseRes = await studentAgent
        .patch(`/api/projects/${projectId}/title/revise`)
        .send({ title: 'Attempt to Revise an Approved Locked Title' });

      expect(reviseRes.status).toBe(403);
      expect(reviseRes.body.error.code).toBe('TITLE_LOCKED');
    });
  });
});
