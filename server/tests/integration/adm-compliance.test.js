import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import storageService from '../../services/storage.service.js';
import { EVALUATION_STATUSES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

// Replace storage service methods so tests don't hit real S3
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

describe('ADM Compliance & Committee Gap Integration Suite', () => {
  let student, instructor, adviser, panelist;
  let studentAgent, instructorAgent, adviserAgent, panelistAgent;
  let project, team;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

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

    it('records digital signature and auto-archives project when Panel Chair signs off final row (FR-4.5)', async () => {
      project.actionDoneMatrix = [
        {
          panelName: 'Louie Jay Labastida',
          suggestion: 'Implement Google Doc inline commenting.',
          expectedAction: 'Add canvas highlight overlays and comment models.',
          actionDone: 'Completed and verified.',
          status: 'addressed',
          remarks: '',
          signatures: [],
        },
      ];
      project.admStatus = 'under_panel_review';
      project.panelists = [{ userId: panelist._id, role: 'chair' }];
      await project.save();

      const itemId = project.actionDoneMatrix[0]._id;

      const signRes = await panelistAgent
        .post(`/api/projects/${project._id}/action-done-matrix/${itemId}/sign`)
        .send({
          signatureDataUrl: 'data:image/png;base64,mockSignatureDataUrl123',
        });

      expect(signRes.status).toBe(200);
      expect(signRes.body.success).toBe(true);
      expect(signRes.body.data.item.signatures.length).toBe(1);
      expect(signRes.body.data.item.signatures[0].name).toContain('Panelist');
      expect(signRes.body.data.projectStatus).toBe('archived');
      expect(signRes.body.data.isArchived).toBe(true);

      const archivedProject = await Project.findById(project._id);
      expect(archivedProject.projectStatus).toBe('archived');
      expect(archivedProject.isArchived).toBe(true);
      expect(archivedProject.admStatus).toBe('approved');
    });
  });

  describe('Louie Jay Labastida: Flexible Upload Buffer & Late Justification Locking', () => {
    it('locks justification note for on-time submissions with HTTP 403 (FR-4.2)', async () => {
      const Submission = (await import('../../modules/submissions/submission.model.js')).default;
      const onTimeSubmission = await Submission.create({
        projectId: project._id,
        chapter: 1,
        type: 'chapter',
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'submissions/ch1.pdf',
        status: 'pending',
        submittedBy: student._id,
        isLate: false,
      });

      const patchRes = await studentAgent
        .patch(`/api/submissions/${onTimeSubmission._id}/justification`)
        .send({
          justification: 'We had technical issues with our internet connection.',
        });

      expect(patchRes.status).toBe(403);
      expect(patchRes.body.error?.message).toContain(
        'Justifications are locked for on-time uploads',
      );
    });

    it('allows updating justification for overdue/late submissions with HTTP 200 (FR-4.2)', async () => {
      const Submission = (await import('../../modules/submissions/submission.model.js')).default;
      const lateSubmission = await Submission.create({
        projectId: project._id,
        chapter: 1,
        type: 'chapter',
        version: 1,
        fileName: 'chapter1_late.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'submissions/ch1_late.pdf',
        status: 'pending',
        submittedBy: student._id,
        isLate: true,
        justification: 'Initial note',
      });

      const patchRes = await studentAgent
        .patch(`/api/submissions/${lateSubmission._id}/justification`)
        .send({
          justification: 'Updated justification: power outage in campus computer laboratory.',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.submission.justification).toBe(
        'Updated justification: power outage in campus computer laboratory.',
      );
    });

    it('batch uploads chapter documents from draft workspace (FR-4.1)', async () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF',
      );

      const batchRes = await studentAgent
        .post(`/api/submissions/${project._id}/chapters/batch`)
        .attach('files', pdfBuffer, 'chapter1_batch.pdf')
        .field(
          'chapters',
          JSON.stringify([{ chapter: 1, remarks: 'Staged from draft workspace' }]),
        );

      expect(batchRes.status).toBe(201);
      expect(batchRes.body.success).toBe(true);
      expect(batchRes.body.data.submissions.length).toBe(1);
      expect(batchRes.body.data.submissions[0].chapter).toBe(1);
    });
  });

  describe('Joseph Abella: Flagging Incomplete Proposals', () => {
    it('flags proposal submission when institutional metadata details are incomplete (FR-4.3)', async () => {
      const Submission = (await import('../../modules/submissions/submission.model.js')).default;

      // Ensure chapters 1-3 are locked
      await Submission.create([
        {
          projectId: project._id,
          chapter: 1,
          type: 'chapter',
          version: 1,
          fileName: 'ch1.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          storageKey: 'submissions/ch1.pdf',
          status: 'locked',
          submittedBy: student._id,
        },
        {
          projectId: project._id,
          chapter: 2,
          type: 'chapter',
          version: 1,
          fileName: 'ch2.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          storageKey: 'submissions/ch2.pdf',
          status: 'locked',
          submittedBy: student._id,
        },
        {
          projectId: project._id,
          chapter: 3,
          type: 'chapter',
          version: 1,
          fileName: 'ch3.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          storageKey: 'submissions/ch3.pdf',
          status: 'locked',
          submittedBy: student._id,
        },
      ]);

      const pan2 = await createAuthenticatedUserWithRole('panelist', { email: 'adm-p2@test.com' });
      const pan3 = await createAuthenticatedUserWithRole('panelist', { email: 'adm-p3@test.com' });
      project.panelistIds = [panelist._id, pan2.user._id, pan3.user._id];
      // Intentionally clear abstract to trigger completeness flag
      project.abstract = 'Too short';
      await project.save();

      const pdfBuffer = Buffer.from(
        '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF',
      );

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/proposal`)
        .attach('file', pdfBuffer, 'compiled_proposal.pdf')
        .field('remarks', 'Initial compiled proposal draft');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.isFlagged).toBe(true);
      expect(res.body.data.submission.flagReasons.length).toBeGreaterThan(0);
      expect(res.body.data.submission.flagReasons[0]).toContain('abstract');
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
