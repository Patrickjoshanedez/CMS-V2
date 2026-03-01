/**
 * Integration tests for the Projects module.
 *
 * Covers: project creation, title workflow (submit / approve / reject / revise),
 * title modification requests, adviser & panelist assignment, deadlines,
 * and project rejection. RBAC is also tested.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthenticatedUserWithRole, request } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';

/* ------------------------------------------------------------------ */
/*  Factory helpers (specific to project tests)                       */
/* ------------------------------------------------------------------ */

/**
 * Create a locked team with a specific student as leader.
 * Projects can only be created for locked teams.
 */
async function createLockedTeam(leaderId) {
  const team = await Team.create({
    name: 'Alpha Team',
    leaderId,
    members: [leaderId],
    isLocked: true,
    academicYear: '2024-2025',
  });
  // Link user to team
  await User.findByIdAndUpdate(leaderId, { teamId: team._id });
  return team;
}

const VALID_PROJECT = {
  title: 'Capstone Management System with Plagiarism Checker',
  abstract: 'A web-based system for managing capstone projects.',
  keywords: ['capstone', 'plagiarism', 'management'],
  academicYear: '2024-2025',
};

/* ================================================================== */
/*  Test Suites                                                       */
/* ================================================================== */

describe('Projects API — /api/projects', () => {
  // Agents with persistent auth cookies
  let studentAgent, studentUser;
  let instructorAgent, instructorUser;
  let adviserAgent, adviserUser;
  let panelistAgent, panelistUser;
  let team;

  beforeEach(async () => {
    // Create authenticated users with roles
    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'student1@test.com',
      name: 'Student One',
    }));
    ({ agent: instructorAgent, user: instructorUser } = await createAuthenticatedUserWithRole(
      'instructor',
      {
        email: 'instructor1@test.com',
        name: 'Instructor One',
      },
    ));
    ({ agent: adviserAgent, user: adviserUser } = await createAuthenticatedUserWithRole('adviser', {
      email: 'adviser1@test.com',
      name: 'Adviser One',
    }));
    ({ agent: panelistAgent, user: panelistUser } = await createAuthenticatedUserWithRole(
      'panelist',
      {
        email: 'panelist1@test.com',
        name: 'Panelist One',
      },
    ));

    // Create a locked team for the student
    team = await createLockedTeam(studentUser._id);
    // Re-fetch student to get updated teamId
    studentUser = await User.findById(studentUser._id);
  });

  /* ────────── Project Creation ────────── */
  describe('POST / — create project', () => {
    it('should allow a team leader to create a project', async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.title).toBe(VALID_PROJECT.title);
      expect(res.body.data.project.titleStatus).toBe('draft');
      expect(res.body.data.project.projectStatus).toBe('active');
    });

    it('should reject creation from instructor role', async () => {
      const res = await instructorAgent.post('/api/projects').send(VALID_PROJECT);

      expect(res.status).toBe(403);
    });

    it('should reject duplicate project for same team', async () => {
      await studentAgent.post('/api/projects').send(VALID_PROJECT);
      const res = await studentAgent
        .post('/api/projects')
        .send({ ...VALID_PROJECT, title: 'Completely Different Title For Testing' });

      expect(res.status).toBe(409);
    });

    it('should return similar projects when title overlaps', async () => {
      // Create another team + project with similar title first
      const { user: student2 } = await createAuthenticatedUserWithRole('student', {
        email: 'student2@test.com',
        name: 'Student Two',
      });
      const team2 = await Team.create({
        name: 'Beta Team',
        leaderId: student2._id,
        members: [student2._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student2._id, { teamId: team2._id });

      await Project.create({
        teamId: team2._id,
        title: 'Capstone Management System with Plagiarism Detection',
        academicYear: '2024-2025',
      });

      // Now create with similar title
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);

      expect(res.status).toBe(201);
      // Should still succeed but may include similarProjects
      expect(res.body.data).toHaveProperty('project');
    });
  });

  /* ────────── Title Submission Workflow ────────── */
  describe('Title Workflow — submit / approve / reject / revise', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it('should allow team leader to submit title for approval', async () => {
      const res = await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('submitted');
    });

    it('should allow instructor to approve a submitted title', async () => {
      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});

      const res = await instructorAgent.post(`/api/projects/${projectId}/title/approve`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('approved');
    });

    it('should allow instructor to reject a submitted title', async () => {
      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/title/reject`)
        .send({ reason: 'The topic is too broad. Please narrow it down.' });

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('revision_required');
      expect(res.body.data.project.rejectionReason).toBe(
        'The topic is too broad. Please narrow it down.',
      );
    });

    it('should allow student to revise and resubmit after rejection', async () => {
      // Submit → reject → revise
      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      await instructorAgent
        .post(`/api/projects/${projectId}/title/reject`)
        .send({ reason: 'Too broad.' });

      const res = await studentAgent
        .patch(`/api/projects/${projectId}/title/revise`)
        .send({ title: 'Narrowed Title: Automated Plagiarism Detection for BukSU' });

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('submitted');
      expect(res.body.data.project.title).toBe(
        'Narrowed Title: Automated Plagiarism Detection for BukSU',
      );
    });

    it('should prevent student from approving a title', async () => {
      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});

      const res = await studentAgent.post(`/api/projects/${projectId}/title/approve`).send({});

      expect(res.status).toBe(403);
    });
  });

  /* ────────── Title Modification Request ────────── */
  describe('Title Modification Request', () => {
    let projectId;

    beforeEach(async () => {
      // Create → submit → approve
      const createRes = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = createRes.body.data.project._id;

      await studentAgent.post(`/api/projects/${projectId}/title/submit`).send({});
      await instructorAgent.post(`/api/projects/${projectId}/title/approve`).send({});
    });

    it('should allow team leader to request title modification', async () => {
      const res = await studentAgent.post(`/api/projects/${projectId}/title/modification`).send({
        proposedTitle: 'Updated: CMS with AI-Powered Plagiarism Detection',
        justification:
          'We decided to incorporate AI-based detection instead of basic text matching for higher accuracy.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('pending_modification');
    });

    it('should allow instructor to resolve (approve) the modification', async () => {
      await studentAgent.post(`/api/projects/${projectId}/title/modification`).send({
        proposedTitle: 'Updated: CMS with AI-Powered Plagiarism Detection',
        justification: 'We want to incorporate AI-based detection for better accuracy.',
      });

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/title/modification/resolve`)
        .send({
          action: 'approved',
          reviewNote: 'Good change, approved.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('approved');
      expect(res.body.data.project.title).toBe('Updated: CMS with AI-Powered Plagiarism Detection');
    });

    it('should allow instructor to deny the modification', async () => {
      await studentAgent.post(`/api/projects/${projectId}/title/modification`).send({
        proposedTitle: 'Updated: CMS with AI-Powered Plagiarism Detection',
        justification: 'We want to incorporate AI-based detection for better accuracy.',
      });

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/title/modification/resolve`)
        .send({
          action: 'denied',
          reviewNote: 'Keep the original title.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.project.titleStatus).toBe('approved');
      // Title should remain unchanged
      expect(res.body.data.project.title).toBe(VALID_PROJECT.title);
    });
  });

  /* ────────── Adviser & Panelist Assignment ────────── */
  describe('Adviser & Panelist Assignment', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it('should allow instructor to assign an adviser', async () => {
      const res = await instructorAgent
        .post(`/api/projects/${projectId}/adviser`)
        .send({ adviserId: adviserUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.project.adviserId).toBe(adviserUser._id.toString());
    });

    it('should allow instructor to assign a panelist', async () => {
      const res = await instructorAgent
        .post(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelistUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.project.panelistIds).toContain(panelistUser._id.toString());
    });

    it('should reject assigning more than 3 panelists', async () => {
      // Create 3 panelists and assign them
      const panelists = [];
      for (let i = 2; i <= 4; i++) {
        const { user } = await createAuthenticatedUserWithRole('panelist', {
          email: `panelist${i}@test.com`,
          name: `Panelist ${i}`,
        });
        panelists.push(user);
      }

      // Assign first 3
      await instructorAgent
        .post(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelistUser._id.toString() });

      for (let i = 0; i < 2; i++) {
        await instructorAgent
          .post(`/api/projects/${projectId}/panelists`)
          .send({ panelistId: panelists[i]._id.toString() });
      }

      // Fourth should fail
      const res = await instructorAgent
        .post(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelists[2]._id.toString() });

      expect(res.status).toBe(400);
    });

    it('should allow instructor to remove a panelist', async () => {
      await instructorAgent
        .post(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelistUser._id.toString() });

      const res = await instructorAgent
        .delete(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelistUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.project.panelistIds).not.toContain(panelistUser._id.toString());
    });

    it('should prevent student from assigning adviser', async () => {
      const res = await studentAgent
        .post(`/api/projects/${projectId}/adviser`)
        .send({ adviserId: adviserUser._id.toString() });

      expect(res.status).toBe(403);
    });

    it('should allow panelist to self-select into a project', async () => {
      const res = await panelistAgent.post(`/api/projects/${projectId}/panelists/select`);

      expect(res.status).toBe(200);
      expect(res.body.data.project.panelistIds).toContain(panelistUser._id.toString());
    });
  });

  /* ────────── Deadlines ────────── */
  describe('PATCH /:id/deadlines — set deadlines', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it('should allow instructor to set deadlines', async () => {
      const deadlines = {
        chapter1: '2025-03-01T00:00:00.000Z',
        chapter2: '2025-04-01T00:00:00.000Z',
      };

      const res = await instructorAgent
        .patch(`/api/projects/${projectId}/deadlines`)
        .send(deadlines);

      expect(res.status).toBe(200);
      expect(res.body.data.project.deadlines.chapter1).toBeTruthy();
      expect(res.body.data.project.deadlines.chapter2).toBeTruthy();
    });

    it('should reject deadlines from student role', async () => {
      const res = await studentAgent
        .patch(`/api/projects/${projectId}/deadlines`)
        .send({ chapter1: '2025-03-01T00:00:00.000Z' });

      expect(res.status).toBe(403);
    });
  });

  /* ────────── Project Rejection ────────── */
  describe('POST /:id/reject — reject entire project', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it('should allow instructor to reject a project', async () => {
      const res = await instructorAgent
        .post(`/api/projects/${projectId}/reject`)
        .send({ reason: 'The proposal does not meet the requirements.' });

      expect(res.status).toBe(200);
      expect(res.body.data.project.projectStatus).toBe('rejected');
    });

    it('should prevent student from rejecting a project', async () => {
      const res = await studentAgent
        .post(`/api/projects/${projectId}/reject`)
        .send({ reason: 'Self-rejection attempt.' });

      expect(res.status).toBe(403);
    });
  });

  /* ────────── GET endpoints ────────── */
  describe('GET endpoints — listing & retrieval', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it("should return the student's own project via /me", async () => {
      const res = await studentAgent.get('/api/projects/me');

      expect(res.status).toBe(200);
      expect(res.body.data.project.title).toBe(VALID_PROJECT.title);
    });

    it('should allow faculty to get a project by ID', async () => {
      const res = await instructorAgent.get(`/api/projects/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.project._id).toBe(projectId);
    });

    it('should allow instructor to list projects', async () => {
      const res = await instructorAgent.get('/api/projects');

      expect(res.status).toBe(200);
      expect(res.body.data.projects.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('should reject list from student role', async () => {
      const res = await studentAgent.get('/api/projects');

      expect(res.status).toBe(403);
    });
  });

  /* ────────── Phase Advancement ────────── */
  describe('POST /:id/advance-phase — advance capstone phase', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;
    });

    it('should NOT allow advancing from phase 1 if proposal is not approved', async () => {
      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PROPOSAL_NOT_APPROVED');
    });

    it('should advance from phase 1 to 2 when proposal is approved', async () => {
      // Submit and approve the title first
      await studentAgent.post(`/api/projects/${projectId}/title/submit`);
      await instructorAgent.post(`/api/projects/${projectId}/title/approve`);

      // Update project status to proposal_approved (simulate full workflow)
      await Project.findByIdAndUpdate(projectId, { projectStatus: 'proposal_approved' });

      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.project.capstonePhase).toBe(2);
    });

    it('should advance from phase 2 to 3 without proposal requirement', async () => {
      // Set project to phase 2 directly
      await Project.findByIdAndUpdate(projectId, {
        projectStatus: 'proposal_approved',
        capstonePhase: 2,
      });

      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.project.capstonePhase).toBe(3);
    });

    it('should NOT allow advancing beyond phase 4', async () => {
      await Project.findByIdAndUpdate(projectId, { capstonePhase: 4 });

      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_FINAL_PHASE');
    });

    it('should NOT allow student to advance phase', async () => {
      const res = await studentAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(403);
    });
  });

  /* ────────── Prototype Management ────────── */
  describe('Prototype CRUD — /api/projects/:id/prototypes', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(VALID_PROJECT);
      projectId = res.body.data.project._id;

      // Set project to Capstone phase 2 (prototypes only allowed in phase 2 & 3)
      await Project.findByIdAndUpdate(projectId, {
        capstonePhase: 2,
        projectStatus: 'proposal_approved',
      });
    });

    /* ── Add link prototype ── */
    describe('POST /:id/prototypes/link — add prototype link', () => {
      it('should add a link prototype successfully', async () => {
        const res = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Live Demo',
          description: 'Our live demo site',
          url: 'https://example.com/demo',
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.project.prototypes).toHaveLength(1);
        expect(res.body.data.project.prototypes[0].type).toBe('link');
        expect(res.body.data.project.prototypes[0].url).toBe('https://example.com/demo');
      });

      it('should reject link with invalid URL', async () => {
        const res = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Bad URL Prototype',
          url: 'not-a-valid-url',
        });

        expect(res.status).toBe(400);
      });

      it('should reject link with title too short', async () => {
        const res = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'ab',
          url: 'https://example.com',
        });

        expect(res.status).toBe(400);
      });

      it('should NOT allow link prototype during phase 1', async () => {
        await Project.findByIdAndUpdate(projectId, { capstonePhase: 1 });

        const res = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Demo Link',
          url: 'https://example.com',
        });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_PHASE_FOR_PROTOTYPE');
      });

      it('should NOT allow instructor to add a link prototype', async () => {
        const res = await instructorAgent
          .post(`/api/projects/${projectId}/prototypes/link`)
          .send({
            title: 'Faculty Link',
            url: 'https://example.com',
          });

        expect(res.status).toBe(403);
      });
    });

    /* ── Get prototypes ── */
    describe('GET /:id/prototypes — list prototypes', () => {
      it('should return an empty array when no prototypes exist', async () => {
        const res = await studentAgent.get(`/api/projects/${projectId}/prototypes`);

        expect(res.status).toBe(200);
        expect(res.body.data.prototypes).toHaveLength(0);
      });

      it('should return prototypes after adding a link', async () => {
        await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Live Demo',
          url: 'https://example.com/demo',
        });

        const res = await studentAgent.get(`/api/projects/${projectId}/prototypes`);

        expect(res.status).toBe(200);
        expect(res.body.data.prototypes).toHaveLength(1);
        expect(res.body.data.prototypes[0].title).toBe('Live Demo');
      });

      it('should allow instructor to view prototypes', async () => {
        await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Demo Site',
          url: 'https://example.com',
        });

        const res = await instructorAgent.get(`/api/projects/${projectId}/prototypes`);

        expect(res.status).toBe(200);
        expect(res.body.data.prototypes).toHaveLength(1);
      });
    });

    /* ── Remove prototype ── */
    describe('DELETE /:id/prototypes/:prototypeId — remove prototype', () => {
      it('should remove a link prototype successfully', async () => {
        // Add a prototype first
        const addRes = await studentAgent
          .post(`/api/projects/${projectId}/prototypes/link`)
          .send({
            title: 'To Be Removed',
            url: 'https://example.com',
          });

        const protoId = addRes.body.data.project.prototypes[0]._id;

        const res = await studentAgent.delete(
          `/api/projects/${projectId}/prototypes/${protoId}`,
        );

        expect(res.status).toBe(200);
        expect(res.body.data.project.prototypes).toHaveLength(0);
      });

      it('should return 404 for non-existent prototype ID', async () => {
        const fakeId = '663b1f1f1f1f1f1f1f1f1f1f';

        const res = await studentAgent.delete(
          `/api/projects/${projectId}/prototypes/${fakeId}`,
        );

        expect(res.status).toBe(404);
      });

      it('should NOT allow instructor to remove a prototype', async () => {
        const addRes = await studentAgent
          .post(`/api/projects/${projectId}/prototypes/link`)
          .send({
            title: 'Instructor Cannot Remove',
            url: 'https://example.com',
          });

        const protoId = addRes.body.data.project.prototypes[0]._id;

        const res = await instructorAgent.delete(
          `/api/projects/${projectId}/prototypes/${protoId}`,
        );

        expect(res.status).toBe(403);
      });
    });
  });
});
