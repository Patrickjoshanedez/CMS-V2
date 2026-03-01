import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import { EVALUATION_STATUSES, DEFENSE_TYPES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

/* ═══════════════════ Helpers ═══════════════════ */

/**
 * Create a project with a team and an assigned panelist.
 * The evaluation service checks project.panelistIds to authorize panelists.
 */
async function createProjectWithPanelist(studentId, adviserId, panelistId) {
  const team = await Team.create({
    name: 'Eval Test Team',
    leaderId: studentId,
    members: [studentId],
    isLocked: true,
    academicYear: '2024-2025',
  });
  await User.findByIdAndUpdate(studentId, { teamId: team._id });

  const project = await Project.create({
    teamId: team._id,
    title: 'Test Capstone for Evaluation',
    abstract: 'Testing evaluation grading.',
    keywords: ['test'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus: PROJECT_STATUSES.ACTIVE,
    adviserId: adviserId || undefined,
    panelistIds: panelistId ? [panelistId] : [],
  });
  return { team, project };
}

/**
 * Build a full scored criteria array matching the proposal defense defaults.
 * Each score is set to a valid value below or equal to maxScore.
 */
function buildScoredCriteria(overrides = {}) {
  const defaults = [
    { name: 'Problem Statement & Objectives', maxScore: 20, score: 18, comment: 'Good' },
    { name: 'Review of Related Literature', maxScore: 20, score: 17, comment: 'Thorough' },
    { name: 'Methodology & Design', maxScore: 20, score: 16, comment: 'Solid' },
    { name: 'Feasibility & Significance', maxScore: 15, score: 13, comment: 'Feasible' },
    { name: 'Presentation & Communication', maxScore: 15, score: 14, comment: 'Clear' },
    { name: 'Q&A / Defense of Proposal', maxScore: 10, score: 9, comment: 'Confident' },
  ];
  return defaults.map((c) => ({ ...c, ...overrides }));
}

/* ═══════════════════ Test Suite ═══════════════════ */

describe('Evaluations API — /api/evaluations', () => {
  let student, instructor, adviser, panelist;
  let studentAgent, instructorAgent, adviserAgent, panelistAgent;
  let project;

  beforeEach(async () => {
    // Create four users with unique emails
    const s = await createAuthenticatedUserWithRole('student', { email: 'eval-student@test.com' });
    const i = await createAuthenticatedUserWithRole('instructor', { email: 'eval-instructor@test.com' });
    const a = await createAuthenticatedUserWithRole('adviser', { email: 'eval-adviser@test.com' });
    const p = await createAuthenticatedUserWithRole('panelist', { email: 'eval-panelist@test.com' });

    studentAgent = s.agent;
    student = s.user;
    instructorAgent = i.agent;
    instructor = i.user;
    adviserAgent = a.agent;
    adviser = a.user;
    panelistAgent = p.agent;
    panelist = p.user;

    // Create project with the panelist assigned and adviser set
    const result = await createProjectWithPanelist(student._id, adviser._id, panelist._id);
    project = result.project;

    // Re-fetch student so teamId is populated
    student = await User.findById(student._id);
  });

  /* ────── GET /:projectId/:defenseType ────── */

  describe('GET /:projectId/:defenseType — Get or create evaluation', () => {
    it('should create a draft evaluation with default criteria for assigned panelist', async () => {
      const res = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const evaluation = res.body.data.evaluation;
      expect(evaluation.status).toBe(EVALUATION_STATUSES.DRAFT);
      expect(evaluation.criteria).toHaveLength(6);
      expect(evaluation.defenseType).toBe(DEFENSE_TYPES.PROPOSAL);
      expect(evaluation.projectId).toBe(project._id.toString());
      expect(evaluation.panelistId).toBe(panelist._id.toString());

      // All scores should be null initially
      for (const criterion of evaluation.criteria) {
        expect(criterion.score).toBeNull();
      }
    });

    it('should return existing evaluation on subsequent call', async () => {
      const res1 = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const res2 = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.evaluation._id).toBe(res2.body.data.evaluation._id);
    });

    it('should reject non-assigned panelist', async () => {
      // Create a second panelist who is NOT in the project's panelistIds
      const p2 = await createAuthenticatedUserWithRole('panelist', { email: 'eval-panelist2@test.com' });

      const res = await p2.agent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-panelist role (student)', async () => {
      const res = await studentAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid defense type', async () => {
      const res = await panelistAgent
        .get(`/api/evaluations/${project._id}/invalid`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  /* ────── PATCH /:evaluationId ────── */

  describe('PATCH /:evaluationId — Update draft evaluation', () => {
    it('should update criteria scores and overall comment', async () => {
      // First create the draft
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      const scoredCriteria = buildScoredCriteria();

      const res = await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({
          criteria: scoredCriteria,
          overallComment: 'Good work overall.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = res.body.data.evaluation;
      expect(updated.overallComment).toBe('Good work overall.');
      expect(updated.criteria[0].score).toBe(18);
      expect(updated.criteria).toHaveLength(6);
    });

    it('should reject update to non-draft evaluation', async () => {
      // Create draft
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      // Directly set status to submitted in DB
      await Evaluation.findByIdAndUpdate(evaluationId, {
        status: EVALUATION_STATUSES.SUBMITTED,
      });

      const res = await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({
          criteria: buildScoredCriteria(),
          overallComment: 'Trying to edit submitted.',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject update by different panelist', async () => {
      // Create draft by the assigned panelist
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      // Create a second panelist (not assigned to this project)
      const p2 = await createAuthenticatedUserWithRole('panelist', { email: 'eval-panelist3@test.com' });

      const res = await p2.agent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({
          criteria: buildScoredCriteria(),
          overallComment: 'Unauthorized edit.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject update by student', async () => {
      // Create draft
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      const res = await studentAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({
          criteria: buildScoredCriteria(),
          overallComment: 'Student trying to edit.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  /* ────── POST /:evaluationId/submit ────── */

  describe('POST /:evaluationId/submit — Submit evaluation', () => {
    it('should submit evaluation with all criteria scored', async () => {
      // Create + score
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'Well done.' });

      // Submit
      const res = await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const evaluation = res.body.data.evaluation;
      expect(evaluation.status).toBe(EVALUATION_STATUSES.SUBMITTED);
      expect(evaluation.submittedAt).not.toBeNull();

      // totalScore = 18 + 17 + 16 + 13 + 14 + 9 = 87
      expect(evaluation.totalScore).toBe(87);
      // maxTotalScore = 20 + 20 + 20 + 15 + 15 + 10 = 100
      expect(evaluation.maxTotalScore).toBe(100);
    });

    it('should reject submission with unscored criteria', async () => {
      // Create draft without scoring
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      const res = await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INCOMPLETE_EVALUATION');
    });

    it('should reject submission when score exceeds maxScore', async () => {
      // Create draft
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      // Build criteria with one invalid score (25 > maxScore 20)
      const invalidCriteria = [
        { name: 'Problem Statement & Objectives', maxScore: 20, score: 25, comment: 'Over max' },
        { name: 'Review of Related Literature', maxScore: 20, score: 17, comment: '' },
        { name: 'Methodology & Design', maxScore: 20, score: 16, comment: '' },
        { name: 'Feasibility & Significance', maxScore: 15, score: 13, comment: '' },
        { name: 'Presentation & Communication', maxScore: 15, score: 14, comment: '' },
        { name: 'Q&A / Defense of Proposal', maxScore: 10, score: 9, comment: '' },
      ];

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: invalidCriteria });

      const res = await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SCORE_EXCEEDS_MAX');
    });

    it('should reject double submission', async () => {
      // Create + score + submit
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'First submit.' });

      await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      // Try to submit again
      const res = await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EVALUATION_ALREADY_SUBMITTED');
    });

    it('should create notification for adviser on submission', async () => {
      // Create + score + submit
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'Notify adviser.' });

      await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      // Check that a notification was created for the adviser
      const notification = await Notification.findOne({
        userId: adviser._id,
        type: 'evaluation_submitted',
      });

      expect(notification).not.toBeNull();
      expect(notification.metadata.projectId.toString()).toBe(project._id.toString());
      expect(notification.metadata.evaluationId.toString()).toBe(evaluationId);
      expect(notification.metadata.defenseType).toBe(DEFENSE_TYPES.PROPOSAL);
    });
  });

  /* ────── POST /:projectId/:defenseType/release ────── */

  describe('POST /:projectId/:defenseType/release — Release evaluations', () => {
    it('should release all submitted evaluations (instructor)', async () => {
      // Create + score + submit an evaluation
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'Ready to release.' });

      await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      // Instructor releases
      const res = await instructorAgent
        .post(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}/release`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.releasedCount).toBe(1);

      // Verify status changed in DB
      const evaluation = await Evaluation.findById(evaluationId);
      expect(evaluation.status).toBe(EVALUATION_STATUSES.RELEASED);
      expect(evaluation.releasedAt).not.toBeNull();
    });

    it('should reject release by non-instructor', async () => {
      const res = await panelistAgent
        .post(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}/release`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 0 releasedCount if none submitted', async () => {
      const res = await instructorAgent
        .post(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}/release`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.releasedCount).toBe(0);
    });
  });

  /* ────── GET /project/:projectId/:defenseType ────── */

  describe('GET /project/:projectId/:defenseType — List evaluations', () => {
    /** Helper: create, score, submit, and optionally release an evaluation */
    async function createAndSubmitEvaluation({ release = false } = {}) {
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evaluationId}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'Complete.' });

      await panelistAgent
        .post(`/api/evaluations/${evaluationId}/submit`);

      if (release) {
        await instructorAgent
          .post(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}/release`);
      }

      return evaluationId;
    }

    it('should show all evaluations to instructor', async () => {
      await createAndSubmitEvaluation({ release: true });

      const res = await instructorAgent
        .get(`/api/evaluations/project/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evaluations).toBeInstanceOf(Array);
      expect(res.body.data.evaluations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalPanelists).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.averageScore).not.toBeNull();
    });

    it('should show only released evaluations to student', async () => {
      // Create one submitted-but-not-released eval via a second panelist
      const p2 = await createAuthenticatedUserWithRole('panelist', { email: 'eval-panelist4@test.com' });
      await Project.findByIdAndUpdate(project._id, { $push: { panelistIds: p2.user._id } });

      // Panelist 1: submit + release
      const createRes1 = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evalId1 = createRes1.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${evalId1}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'P1 done.' });

      await panelistAgent
        .post(`/api/evaluations/${evalId1}/submit`);

      // Panelist 2: submitted only (not released)
      const createRes2 = await p2.agent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evalId2 = createRes2.body.data.evaluation._id;

      await p2.agent
        .patch(`/api/evaluations/${evalId2}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'P2 done.' });

      await p2.agent
        .post(`/api/evaluations/${evalId2}/submit`);

      // Release only panelist 1's eval (release all submitted → both become released)
      // Actually releaseEvaluations releases ALL submitted, so we need a different approach:
      // Release first, then create a second eval that stays submitted.
      // Let's release now (both get released), then create a draft for tracking.
      // Instead, let's use a simpler approach: release first eval only by doing it before p2 submits.

      // Let's redo: release after only p1 has submitted
      // Clear evaluations and redo
      await Evaluation.deleteMany({});

      // P1 submits
      const r1 = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const eid1 = r1.body.data.evaluation._id;

      await panelistAgent
        .patch(`/api/evaluations/${eid1}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'P1.' });

      await panelistAgent
        .post(`/api/evaluations/${eid1}/submit`);

      // Instructor releases (only P1 is submitted at this point)
      await instructorAgent
        .post(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}/release`);

      // P2 submits AFTER release — this one stays as 'submitted'
      const r2 = await p2.agent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const eid2 = r2.body.data.evaluation._id;

      await p2.agent
        .patch(`/api/evaluations/${eid2}`)
        .send({ criteria: buildScoredCriteria(), overallComment: 'P2.' });

      await p2.agent
        .post(`/api/evaluations/${eid2}/submit`);

      // Student should only see the released eval (P1), not the submitted one (P2)
      const res = await studentAgent
        .get(`/api/evaluations/project/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evaluations).toHaveLength(1);
      expect(res.body.data.evaluations[0].status).toBe(EVALUATION_STATUSES.RELEASED);
    });

    it('should include summary statistics', async () => {
      await createAndSubmitEvaluation({ release: true });

      const res = await instructorAgent
        .get(`/api/evaluations/project/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary } = res.body.data;
      // With one released eval, scores: 18+17+16+13+14+9 = 87 out of 100
      expect(summary.averageScore).toBe(87);
      expect(summary.submittedCount).toBe(1);
      expect(summary.averagePercentage).toBe(87);
      expect(summary.averageMaxScore).toBe(100);
    });
  });

  /* ────── GET /detail/:evaluationId ────── */

  describe('GET /detail/:evaluationId — Get single evaluation', () => {
    it('should return evaluation details for adviser', async () => {
      // Create an evaluation
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      const res = await adviserAgent
        .get(`/api/evaluations/detail/${evaluationId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const evaluation = res.body.data.evaluation;
      expect(evaluation._id).toBe(evaluationId);
      // Panelist should be populated with name/email fields
      expect(evaluation.panelistId).toBeDefined();
      expect(evaluation.panelistId.firstName).toBeDefined();
      expect(evaluation.panelistId.email).toBeDefined();
    });

    it('should reject student access', async () => {
      // Create an evaluation
      const createRes = await panelistAgent
        .get(`/api/evaluations/${project._id}/${DEFENSE_TYPES.PROPOSAL}`);
      const evaluationId = createRes.body.data.evaluation._id;

      const res = await studentAgent
        .get(`/api/evaluations/detail/${evaluationId}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
