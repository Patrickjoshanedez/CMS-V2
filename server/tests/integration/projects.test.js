/**
 * Integration tests for the Projects module.
 *
 * Covers: project creation, title workflow (submit / approve / reject / revise),
 * title modification requests, adviser & panelist assignment, deadlines,
 * and project rejection. RBAC is also tested.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import googleDriveReviewService from '../../services/google-drive-review.service.js';
import storageService from '../../services/storage.service.js';
import env from '../../config/env.js';
import { PROJECT_STATUSES, TITLE_STATUSES } from '@cms/shared';

vi.spyOn(googleDriveReviewService, 'createProjectFolder').mockResolvedValue({
  folderId: 'mock-drive-folder-id',
  folderUrl: 'https://drive.google.com/drive/folders/mock-drive-folder-id',
});
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

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

function createPdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
}

function createPngBuffer() {
  return Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c6360000000020001e221bc330000000049454e44ae426082',
    'hex',
  );
}

/* ================================================================== */
/*  Test Suites                                                       */
/* ================================================================== */

describe('Projects API — /api/projects', () => {
  // Agents with persistent auth cookies
  let studentAgent, studentUser;
  let instructorAgent, instructorUser;
  let adviserAgent;
  let adviserUser;
  let panelistAgent, panelistUser;
  let team;
  let course;
  let section;
  let validProjectPayload;

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

    // Setup academic properties and payload
    const courseSec = await createCourseAndSection(instructorUser._id);
    course = courseSec.course;
    section = courseSec.section;
    validProjectPayload = createValidProjectPayload(team._id, course._id, section._id, [
      studentUser._id,
    ]);
    delete validProjectPayload.teamId; // not needed in body, inferred by service
  });

  /* ────────── Project Creation ────────── */
  describe('POST / — create project', () => {
    it('should allow a team leader to create a project', async () => {
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.title).toBe(validProjectPayload.title);
      expect(res.body.data.project.titleStatus).toBe('draft');
      expect(res.body.data.project.projectStatus).toBe('active');
    });

    it('should reject project creation when team is not finalized (unlocked)', async () => {
      await Team.findByIdAndUpdate(team._id, { isLocked: false });

      const res = await studentAgent.post('/api/projects').send(validProjectPayload);

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('TEAM_NOT_FINALIZED');
    });

    it('should reject creation from instructor role', async () => {
      const res = await instructorAgent.post('/api/projects').send(validProjectPayload);

      expect(res.status).toBe(403);
    });

    it('should reject duplicate project for same team', async () => {
      await studentAgent.post('/api/projects').send(validProjectPayload);
      const duplicatePayload = {
        ...validProjectPayload,
        title: 'Completely Different Title For Testing',
      };
      duplicatePayload.titleProposals = [
        duplicatePayload.title,
        ...duplicatePayload.titleProposals.filter(
          (proposal) => proposal !== duplicatePayload.title,
        ),
      ].slice(0, 10);

      const res = await studentAgent.post('/api/projects').send(duplicatePayload);

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

      const similarProjectPayload = createValidProjectPayload(team2._id, course._id, section._id, [
        student2._id,
      ]);
      similarProjectPayload.title = 'Capstone Management System with Plagiarism Detection';

      await Project.create(similarProjectPayload);

      // Now create with similar title
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);

      expect(res.status).toBe(201);
      // Should still succeed but may include similarProjects
      expect(res.body.data).toHaveProperty('project');
    });

    it('should resolve sectionId from team context when not provided in payload', async () => {
      // Setup: create a team with sectionId linked
      const { user: student3, agent: agentStudent3 } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'student3@test.com',
          name: 'Student Three',
        },
      );
      const team3 = await Team.create({
        name: 'Gamma Team',
        leaderId: student3._id,
        members: [student3._id],
        isLocked: true,
        academicYear: '2024-2025',
        sectionId: section._id,
      });
      await User.findByIdAndUpdate(student3._id, { teamId: team3._id });

      const payloadWithoutSection = createValidProjectPayload(team3._id, course._id, section._id, [
        student3._id,
      ]);
      delete payloadWithoutSection.sectionId;

      const res = await agentStudent3.post('/api/projects').send(payloadWithoutSection);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('project');
      expect(res.body.data.project.sectionId).toBe(section._id.toString());
    });

    it('should fail when sectionId cannot be resolved from payload or team context', async () => {
      // Create a team WITHOUT sectionId and ensure user also has no section
      const { user: student4, agent: agentStudent4 } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'student4@test.com',
          name: 'Student Four',
        },
      );
      const team4 = await Team.create({
        name: 'Delta Team',
        leaderId: student4._id,
        members: [student4._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student4._id, { teamId: team4._id, sectionId: null });

      const payloadWithoutSection = createValidProjectPayload(team4._id, course._id, section._id, [
        student4._id,
      ]);
      delete payloadWithoutSection.sectionId;

      const res = await agentStudent4.post('/api/projects').send(payloadWithoutSection);

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('SECTION_NOT_FOUND');
      expect(res.body?.error?.message || '').toContain('No section found');
    });
  });

  /* ────────── Title Submission Workflow ────────── */
  describe('Title Workflow — submit / approve / reject / revise', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
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
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
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
      expect(res.body.data.project.title).toBe(validProjectPayload.title);
    });
  });

  /* ────────── Adviser & Panelist Assignment ────────── */
  describe('Adviser & Panelist Assignment', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
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
      expect(res.body.error.code).toBe('MAX_PANELISTS_REACHED');
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

      const removalNotification = await Notification.findOne({
        userId: panelistUser._id,
        type: 'panelist_removed',
      }).sort({ createdAt: -1 });

      expect(removalNotification).not.toBeNull();
      expect(removalNotification.metadata?.projectId?.toString()).toBe(projectId.toString());
      expect(removalNotification.message).toContain('removed as a panelist');
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
    let sameSectionProjectId;
    let otherSectionProjectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = res.body.data.project._id;

      const { agent: student2Agent, user: student2User } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'student2-deadlines@test.com',
          name: 'Student Two Deadlines',
        },
      );

      const team2 = await Team.create({
        name: 'Beta Team Deadlines',
        leaderId: student2User._id,
        members: [student2User._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student2User._id, { teamId: team2._id });

      const payload2 = createValidProjectPayload(team2._id, course._id, section._id, [
        student2User._id,
      ]);
      delete payload2.teamId;

      const res2 = await student2Agent.post('/api/projects').send(payload2);
      sameSectionProjectId = res2.body.data.project._id;

      const { course: otherCourse, section: otherSection } = await createCourseAndSection(
        instructorUser._id,
      );

      const { agent: student3Agent, user: student3User } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'student3-deadlines@test.com',
          name: 'Student Three Deadlines',
        },
      );

      const team3 = await Team.create({
        name: 'Gamma Team Deadlines',
        leaderId: student3User._id,
        members: [student3User._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student3User._id, { teamId: team3._id });

      const payload3 = createValidProjectPayload(team3._id, otherCourse._id, otherSection._id, [
        student3User._id,
      ]);
      delete payload3.teamId;

      const res3 = await student3Agent.post('/api/projects').send(payload3);
      otherSectionProjectId = res3.body.data.project._id;
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

    it('should allow instructor to apply deadlines to all projects in the same section', async () => {
      const bulkPayload = {
        chapter3: '2025-05-01T00:00:00.000Z',
        tba: ['defense'],
        applyToSection: true,
      };

      const res = await instructorAgent
        .patch(`/api/projects/${projectId}/deadlines`)
        .send(bulkPayload);

      expect(res.status).toBe(200);

      const updatedBase = await Project.findById(projectId);
      const updatedSameSection = await Project.findById(sameSectionProjectId);

      expect(updatedBase.deadlines.chapter3).toBeTruthy();
      expect(updatedSameSection.deadlines.chapter3).toBeTruthy();
      expect(updatedBase.deadlines.tba).toContain('defense');
      expect(updatedSameSection.deadlines.tba).toContain('defense');
      expect(updatedBase.deadlines.defense).toBeNull();
      expect(updatedSameSection.deadlines.defense).toBeNull();
    });

    it('should not change projects in other sections during section-wide deadline update', async () => {
      const originalOtherSection = await Project.findById(otherSectionProjectId);

      const res = await instructorAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter2: '2025-04-15T00:00:00.000Z',
        applyToSection: true,
      });

      expect(res.status).toBe(200);

      const updatedOtherSection = await Project.findById(otherSectionProjectId);
      expect(updatedOtherSection.deadlines.chapter2).toEqual(
        originalOtherSection.deadlines.chapter2,
      );
    });

    it('should prevent adviser from applying deadlines section-wide', async () => {
      const res = await adviserAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter1: '2025-03-01T00:00:00.000Z',
        applyToSection: true,
      });

      expect(res.status).toBe(403);
    });

    it('should prevent adviser from updating deadlines on an unassigned project', async () => {
      const res = await adviserAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter1: '2025-03-10T00:00:00.000Z',
      });

      expect(res.status).toBe(403);
    });

    it('should allow an assigned adviser to update deadlines for a single project', async () => {
      const assignRes = await instructorAgent
        .post(`/api/projects/${projectId}/adviser`)
        .send({ adviserId: adviserUser._id.toString() });

      expect(assignRes.status).toBe(200);

      const res = await adviserAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter1: '2025-03-12T00:00:00.000Z',
      });

      expect(res.status).toBe(200);

      const updatedBase = await Project.findById(projectId);
      const unchangedSameSection = await Project.findById(sameSectionProjectId);

      expect(updatedBase.deadlines.chapter1).toBeTruthy();
      expect(unchangedSameSection.deadlines.chapter1).toBeNull();
    });

    it('should ignore sectionId override in section-wide updates and use target project section', async () => {
      const baseProject = await Project.findById(projectId);
      const otherProject = await Project.findById(otherSectionProjectId);

      const res = await instructorAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter4: '2025-06-01T00:00:00.000Z',
        applyToSection: true,
        sectionId: otherProject.sectionId.toString(),
      });

      expect(res.status).toBe(200);

      const updatedBase = await Project.findById(projectId);
      const updatedSameSection = await Project.findById(sameSectionProjectId);
      const updatedOtherSection = await Project.findById(otherSectionProjectId);

      expect(updatedBase.sectionId.toString()).toBe(baseProject.sectionId.toString());
      expect(updatedBase.deadlines.chapter4).toBeTruthy();
      expect(updatedSameSection.deadlines.chapter4).toBeTruthy();
      expect(updatedOtherSection.deadlines.chapter4).toBeNull();
    });

    it('should still update only one project when applyToSection is not set', async () => {
      const res = await instructorAgent.patch(`/api/projects/${projectId}/deadlines`).send({
        chapter1: '2025-03-20T00:00:00.000Z',
      });

      expect(res.status).toBe(200);

      const updatedBase = await Project.findById(projectId);
      const unchangedSameSection = await Project.findById(sameSectionProjectId);

      expect(updatedBase.deadlines.chapter1).toBeTruthy();
      expect(unchangedSameSection.deadlines.chapter1).toBeNull();
    });
  });

  /* ────────── Project Rejection ────────── */
  describe('POST /:id/reject — reject entire project', () => {
    let projectId;

    beforeEach(async () => {
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
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
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = res.body.data.project._id;
    });

    it("should return the student's own project via /me", async () => {
      const res = await studentAgent.get('/api/projects/me');

      expect(res.status).toBe(200);
      expect(res.body.data.project.title).toBe(validProjectPayload.title);
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
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = res.body.data.project._id;
    });

    it('should NOT allow advancing from phase 1 when chapter 1 upload is missing', async () => {
      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CHAPTER1_REQUIRED_FOR_PHASE_ADVANCE');
    });

    it('should advance from phase 1 to 2 when projectStatus is proposal_approved without chapter 1 upload', async () => {
      await Project.findByIdAndUpdate(projectId, {
        projectStatus: 'proposal_approved',
        capstonePhase: 1,
      });

      const res = await instructorAgent.post(`/api/projects/${projectId}/advance-phase`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.project.capstonePhase).toBe(2);
    });

    it('should advance from phase 1 to 2 when chapter 1 upload exists', async () => {
      await Submission.create({
        projectId,
        type: 'chapter',
        chapter: 1,
        version: 1,
        fileName: 'chapter1-phase-gate.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'test/chapter1-phase-gate.pdf',
        submittedBy: studentUser._id,
        status: 'pending',
      });

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
      const res = await studentAgent.post('/api/projects').send(validProjectPayload);
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
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject link with title too short', async () => {
        const res = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'ab',
          url: 'https://example.com',
        });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
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
        const res = await instructorAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'Faculty Link',
          url: 'https://example.com',
        });

        expect(res.status).toBe(403);
      });
    });

    describe('POST /:id/prototypes/media — upload prototype media', () => {
      it('should upload media with an archives/projects prototype key prefix', async () => {
        storageService.uploadFile.mockClear();

        const res = await studentAgent
          .post(`/api/projects/${projectId}/prototypes/media`)
          .field('title', 'Prototype UI Screenshot')
          .field('description', 'Capstone UI snapshot')
          .attach('file', createPngBuffer(), 'prototype-ui.png');

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.project.prototypes).toHaveLength(1);
        expect(res.body.data.project.prototypes[0].type).toBe('image');
        expect(storageService.uploadFile).toHaveBeenCalledTimes(1);

        const [, storageKey] = storageService.uploadFile.mock.calls.at(-1);
        expect(storageKey.startsWith(`archives/projects/${projectId}/prototypes/`)).toBe(true);
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
        const addRes = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
          title: 'To Be Removed',
          url: 'https://example.com',
        });

        const protoId = addRes.body.data.project.prototypes[0]._id;

        const res = await studentAgent.delete(`/api/projects/${projectId}/prototypes/${protoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.project.prototypes).toHaveLength(0);
      });

      it('should return 404 for non-existent prototype ID', async () => {
        const fakeId = '663b1f1f1f1f1f1f1f1f1f1f';

        const res = await studentAgent.delete(`/api/projects/${projectId}/prototypes/${fakeId}`);

        expect(res.status).toBe(404);
      });

      it('should NOT allow instructor to remove a prototype', async () => {
        const addRes = await studentAgent.post(`/api/projects/${projectId}/prototypes/link`).send({
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

  /* ────────── Archive Bulk Upload ────────── */
  describe('POST /archive/bulk — archived capstone bundle upload', () => {
    const endpoint = '/api/projects/archive/bulk';
    const basePayload = {
      title: 'Archived Capstone Bundle for CMS Validation',
      abstract: 'Legacy project brought into the archive with both final papers.',
      keywords: 'archive,bulk-upload,legacy',
      academicYear: '2024-2025',
    };

    it('should create one archived project with linked final academic and final journal submissions', async () => {
      storageService.uploadFile.mockClear();

      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper.pdf')
        .attach('academicJournalFile', createPdfBuffer(), 'academic-journal.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.isArchived).toBe(true);
      expect(res.body.data.project.projectStatus).toBe('archived');
      expect(res.body.data.submissions.finalAcademic.type).toBe('final_academic');
      expect(res.body.data.submissions.finalJournal.type).toBe('final_journal');

      const projectId = res.body.data.project._id;
      const linkedSubmissions = await Submission.find({ projectId }).sort({ type: 1 });

      expect(linkedSubmissions).toHaveLength(2);
      expect(linkedSubmissions.map((entry) => entry.type)).toEqual([
        'final_academic',
        'final_journal',
      ]);
      expect(linkedSubmissions.every((entry) => entry.version === 1)).toBe(true);

      const archiveUploadCalls = storageService.uploadFile.mock.calls.filter(
        ([, key]) => typeof key === 'string' && key.startsWith(`archives/projects/${projectId}/`),
      );

      expect(archiveUploadCalls).toHaveLength(2);
      expect(
        archiveUploadCalls.some(([, key]) =>
          key.startsWith(`archives/projects/${projectId}/final-academic/v1/`),
        ),
      ).toBe(true);
      expect(
        archiveUploadCalls.some(([, key]) =>
          key.startsWith(`archives/projects/${projectId}/final-journal/v1/`),
        ),
      ).toBe(true);
    });

    it('should reject the request when academic paper file is missing', async () => {
      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicJournalFile', createPdfBuffer(), 'academic-journal.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUAL_ARCHIVE_FILES_REQUIRED');
    });

    it('should reject the request when academic journal file is missing', async () => {
      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUAL_ARCHIVE_FILES_REQUIRED');
    });

    it('should reject duplicate files in the same archive field', async () => {
      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper-1.pdf')
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper-2.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNEXPECTED_FILE_FIELD');
    });

    it('should reject unexpected archive file field names', async () => {
      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper.pdf')
        .attach('unexpectedArchiveFile', createPdfBuffer(), 'unexpected.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNEXPECTED_FILE_FIELD');
    });

    it('should reject non-instructor users', async () => {
      const res = await studentAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', createPdfBuffer(), 'academic-paper.pdf')
        .attach('academicJournalFile', createPdfBuffer(), 'academic-journal.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should map LIMIT_FILE_SIZE to FILE_TOO_LARGE when an archive file exceeds max size', async () => {
      const oversizedPdf = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 1, 'a'),
      ]);

      const res = await instructorAgent
        .post(endpoint)
        .field('title', basePayload.title)
        .field('abstract', basePayload.abstract)
        .field('keywords', basePayload.keywords)
        .field('academicYear', basePayload.academicYear)
        .attach('academicPaperFile', oversizedPdf, 'oversized-academic-paper.pdf')
        .attach('academicJournalFile', createPdfBuffer(), 'academic-journal.pdf');

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  /* ────────── Final Upload Eligibility ────────── */
  describe('POST /api/submissions/:projectId/final-academic — eligibility guard', () => {
    let projectId;

    beforeEach(async () => {
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = createRes.body.data.project._id;

      await Project.findByIdAndUpdate(projectId, {
        capstonePhase: 4,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.ARCHIVED,
        isArchived: true,
      });
    });

    it('should reject final uploads for archived projects', async () => {
      const res = await studentAgent
        .post(`/api/submissions/${projectId}/final-academic`)
        .attach('file', createPdfBuffer(), 'final-academic.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PROJECT_NOT_ACTIVE');
    });
  });

  /* ────────── Archive Project ────────── */
  describe('POST /:id/archive — archive project', () => {
    let projectId;

    beforeEach(async () => {
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = createRes.body.data.project._id;

      await Submission.create([
        {
          projectId,
          type: 'final_academic',
          version: 1,
          fileName: 'final-academic.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          storageKey: `archives/projects/${projectId}/final-academic/v1/final-academic.pdf`,
          submittedBy: studentUser._id,
          plagiarismResult: {
            status: 'completed',
            originalityScore: 90,
          },
        },
        {
          projectId,
          type: 'final_journal',
          version: 1,
          fileName: 'final-journal.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          storageKey: `archives/projects/${projectId}/final-journal/v1/final-journal.pdf`,
          submittedBy: studentUser._id,
          plagiarismResult: {
            status: 'completed',
            originalityScore: 92,
          },
        },
      ]);
    });

    it('should archive a project when final submissions are present and plagiarism-cleared', async () => {
      const res = await instructorAgent
        .post(`/api/projects/${projectId}/archive`)
        .send({ completionNotes: 'All final requirements satisfied.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.projectStatus).toBe(PROJECT_STATUSES.ARCHIVED);
      expect(res.body.data.project.isArchived).toBe(true);
      expect(res.body.data.project.completionNotes).toBe('All final requirements satisfied.');

      const archivedProject = await Project.findById(projectId);
      expect(archivedProject.projectStatus).toBe(PROJECT_STATUSES.ARCHIVED);
      expect(archivedProject.isArchived).toBe(true);
      expect(archivedProject.archivedAt).toBeTruthy();
    });

    it('should reject archive when final academic submission is missing', async () => {
      await Submission.deleteMany({ projectId, type: 'final_academic' });

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/archive`)
        .send({ completionNotes: 'Attempt archive without academic submission.' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_ACADEMIC');
    });

    it('should reject archive when final journal plagiarism check failed', async () => {
      await Submission.findOneAndUpdate(
        { projectId, type: 'final_journal' },
        {
          plagiarismResult: {
            status: 'failed',
          },
        },
      );

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/archive`)
        .send({ completionNotes: 'Attempt archive with failed plagiarism.' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PLAGIARISM_CHECK_FAILED');
    });
  });

  /* ────────── Capstone 1 Prerequisites ────────── */
  describe('POST /api/submissions/:projectId/chapters — Capstone 1 guard', () => {
    let projectId;

    beforeEach(async () => {
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = createRes.body.data.project._id;

      await Project.findByIdAndUpdate(projectId, {
        capstonePhase: 1,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.ACTIVE,
        panelistIds: [],
      });
    });

    it('should reject chapter upload when panelists are not yet assigned', async () => {
      const res = await studentAgent
        .post(`/api/submissions/${projectId}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PANELISTS_NOT_ASSIGNED');
    });

    it('should allow chapter upload once at least one panelist is assigned', async () => {
      const assignRes = await instructorAgent
        .post(`/api/projects/${projectId}/panelists`)
        .send({ panelistId: panelistUser._id.toString() });
      expect(assignRes.status).toBe(200);

      const res = await studentAgent
        .post(`/api/submissions/${projectId}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  /* ────────── Certificate Upload ────────── */
  describe('POST /:id/certificate — upload completion certificate', () => {
    let projectId;

    beforeEach(async () => {
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = createRes.body.data.project._id;
    });

    it('should call storageService.uploadFile with buffer-first signature', async () => {
      storageService.uploadFile.mockClear();

      await Project.findByIdAndUpdate(projectId, {
        isArchived: true,
        projectStatus: 'archived',
      });

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/certificate`)
        .attach('file', createPdfBuffer(), 'completion-certificate.pdf');

      expect(res.status).toBe(201);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/\/certificates\//),
        'application/pdf',
      );

      const [firstArg, storageKey] = storageService.uploadFile.mock.calls.at(-1);
      expect(Buffer.isBuffer(firstArg)).toBe(true);
      expect(storageKey.startsWith(`archives/projects/${projectId}/certificates/`)).toBe(true);
    });

    it('should reject certificate upload when project is not archived', async () => {
      storageService.uploadFile.mockClear();

      const res = await instructorAgent
        .post(`/api/projects/${projectId}/certificate`)
        .attach('file', createPdfBuffer(), 'completion-certificate.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_ARCHIVED');
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });
  });

  /* ────────── Certificate Download URL ────────── */
  describe('GET /:id/certificate — download completion certificate', () => {
    let projectId;
    const certificateKey = 'archives/projects/test-project-id/certificates/completion-certificate.pdf';

    beforeEach(async () => {
      const createRes = await studentAgent.post('/api/projects').send(validProjectPayload);
      projectId = createRes.body.data.project._id;

      await Project.findByIdAndUpdate(projectId, {
        isArchived: true,
        projectStatus: PROJECT_STATUSES.ARCHIVED,
        certificateStorageKey: certificateKey,
      });
    });

    it('should return a signed certificate URL with a 3600-second TTL', async () => {
      storageService.getSignedUrl.mockClear();

      const res = await studentAgent.get(`/api/projects/${projectId}/certificate`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://mock-s3.example.com/signed-url');
      expect(storageService.getSignedUrl).toHaveBeenCalledWith(certificateKey, 3600);
    });

    it('should return 404 when certificate key is missing', async () => {
      await Project.findByIdAndUpdate(projectId, {
        $unset: { certificateStorageKey: 1 },
      });

      const res = await studentAgent.get(`/api/projects/${projectId}/certificate`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NO_CERTIFICATE');
    });
  });
});
