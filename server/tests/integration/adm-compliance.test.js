import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import { EVALUATION_STATUSES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

describe('ADM Compliance & Committee Gap Integration Suite', () => {
  let student, instructor, adviser, panelist;
  let studentAgent, instructorAgent, adviserAgent, panelistAgent;
  let project, team;

  beforeEach(async () => {
    const s = await createAuthenticatedUserWithRole('student', { email: 'adm-std@test.com' });
    const i = await createAuthenticatedUserWithRole('instructor', { email: 'adm-inst@test.com' });
    const a = await createAuthenticatedUserWithRole('adviser', { email: 'adm-adv@test.com' });
    const p = await createAuthenticatedUserWithRole('panelist', { email: 'adm-pan@test.com' });

    studentAgent = s.agent;
    student = s.user;
    instructorAgent = i.agent;
    instructor = i.user;
    adviserAgent = a.agent;
    adviser = a.user;
    panelistAgent = p.agent;
    panelist = p.user;

    team = await Team.create({
      name: 'ADM Compliance Team',
      leaderId: student._id,
      members: [student._id],
      isLocked: true,
      academicYear: '2025-2026',
    });
    await User.findByIdAndUpdate(student._id, { teamId: team._id });
    student = await User.findById(student._id);

    const { course, section } = await createCourseAndSection(instructor._id);
    const payload = createValidProjectPayload(team._id, course._id, section._id, [student._id]);
    payload.title = 'BukSU Action Done Matrix Capstone';
    payload.abstract = 'Automating panel revisions and secretary minutes extraction.';
    payload.keywords = ['adm', 'defense', 'ollama'];
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.projectStatus = PROJECT_STATUSES.ACTIVE;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelist._id];
    payload.panelists = [{ userId: panelist._id, role: 'chair' }];

    project = await Project.create(payload);
  });

  describe('Louie Jay Labastida: Embedded Document Inline Comments', () => {
    it('creates, lists, and deletes document highlight comments via API', async () => {
      const submissionId = new mongoose.Types.ObjectId();

      // Create comment by instructor
      const createRes = await instructorAgent
        .post(`/api/submissions/${submissionId}/comments`)
        .send({
          pageNumber: 3,
          coordinates: { x: 100, y: 150, width: 250, height: 20 },
          highlightText: 'The system architecture uses microservices.',
          commentText: 'Please clarify if the plagiarism engine runs as a worker or microservice.',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.comment.pageNumber).toBe(3);
      expect(createRes.body.data.comment.highlightText).toContain('microservices');

      const commentId = createRes.body.data.comment._id;

      // List comments by student
      const listRes = await studentAgent.get(`/api/submissions/${submissionId}/comments`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.comments.length).toBe(1);
      expect(listRes.body.data.comments[0]._id).toBe(commentId);

      // Delete comment by author
      const deleteRes = await instructorAgent.delete(
        `/api/submissions/${submissionId}/comments/${commentId}`,
      );

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Comment deleted.');
    });
  });

  describe('Louie Jay Labastida: Capstone 2 Direct ADM Pipeline', () => {
    it('bypasses normal manuscript upload cycles and activates ADM when Capstone 2 is requested', async () => {
      const response = await instructorAgent
        .post(`/api/projects/${project._id}/stream-routing`)
        .send({ capstoneCourse: 'Capstone 2' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.project.admStatus).toBe('awaiting_minutes_upload');
      expect(response.body.project.capstoneCourse).toBe('Capstone 2');

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject.admStatus).toBe('awaiting_minutes_upload');
      expect(updatedProject.capstoneCourse).toBe('Capstone 2');
    });

    it('allows updating single Action Done Matrix items and advances status', async () => {
      project.actionDoneMatrix = [
        {
          panelName: 'Louie Jay Labastida',
          suggestion: 'Implement Google Doc inline commenting.',
          expectedAction: 'Add canvas highlight overlays and comment models.',
          actionDone: '',
          status: 'pending',
          remarks: '',
        },
      ];
      project.admStatus = 'pending_developer_action';
      await project.save();

      const itemId = project.actionDoneMatrix[0]._id;

      const patchRes = await studentAgent
        .patch(`/api/projects/${project._id}/action-done-matrix/${itemId}`)
        .send({
          actionDone: 'Created comment.model.js and DocumentPreview inline overlay.',
          status: 'addressed',
          remarks: 'Tested with Vitest integration suite.',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.item.status).toBe('addressed');
      expect(patchRes.body.data.admStatus).toBe('under_panel_review');
    });
  });

  describe('Joseph Abella: Grade Visibility Guard', () => {
    it('blocks student grade viewing when assigned panel evaluations are not completed', async () => {
      const response = await studentAgent.get(
        `/api/evaluations/project/${project._id}/consolidated-grades?defenseType=proposal`,
      );

      expect(response.status).toBe(403);
      expect(response.body.error?.message).toContain(
        'Defense results and grading rubrics are locked',
      );
    });

    it('releases grades to student once all panel evaluations are submitted and released', async () => {
      await Evaluation.create({
        projectId: project._id,
        panelistId: panelist._id,
        defenseType: 'proposal',
        stage: 'proposal',
        status: EVALUATION_STATUSES.RELEASED,
        criteria: [
          { name: 'Problem Definition', maxScore: 25, score: 24 },
          { name: 'Methodology', maxScore: 25, score: 23 },
          { name: 'System Design', maxScore: 25, score: 25 },
          { name: 'Presentation', maxScore: 25, score: 24 },
        ],
        totalScore: 96,
        maxTotalScore: 100,
        decision: 'passed',
      });

      const response = await studentAgent.get(
        `/api/evaluations/project/${project._id}/consolidated-grades?defenseType=proposal`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('grades_released');
      expect(response.body.data.evaluations.length).toBe(1);
      expect(response.body.data.evaluations[0].totalScore).toBe(96);
    });
  });

  describe('Raul Lecaros: Team Size Cap (Max 4 Members)', () => {
    it('allows teams to contain up to 4 members', async () => {
      const s2 = await createAuthenticatedUserWithRole('student', { email: 'adm-s2@test.com' });
      const s3 = await createAuthenticatedUserWithRole('student', { email: 'adm-s3@test.com' });
      const s4 = await createAuthenticatedUserWithRole('student', { email: 'adm-s4@test.com' });

      team.members = [student._id, s2.user._id, s3.user._id, s4.user._id];
      await expect(team.save()).resolves.toBeDefined();
      expect(team.memberCount).toBe(4);
      expect(team.isFull).toBe(true);
    });

    it('rejects teams exceeding 4 members', async () => {
      const s2 = await createAuthenticatedUserWithRole('student', { email: 'adm-s2b@test.com' });
      const s3 = await createAuthenticatedUserWithRole('student', { email: 'adm-s3b@test.com' });
      const s4 = await createAuthenticatedUserWithRole('student', { email: 'adm-s4b@test.com' });
      const s5 = await createAuthenticatedUserWithRole('student', { email: 'adm-s5b@test.com' });

      team.members = [student._id, s2.user._id, s3.user._id, s4.user._id, s5.user._id];
      await expect(team.save()).rejects.toThrow(/cannot have more than 4 members/);
    });
  });
});
