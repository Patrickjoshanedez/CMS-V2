/**
 * Integration tests for the Submissions module.
 *
 * Covers: chapter upload, file validation (MIME & size), versioning,
 * review workflow (approve/reject/revisions), document locking & unlock,
 * annotations, pre-signed view URL, late submission enforcement, and RBAC.
 *
 * S3 operations are mocked — we replace storageService methods to avoid
 * requiring real AWS credentials in the test environment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import storageService from '../../services/storage.service.js';
import { SUBMISSION_STATUSES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

/* ------------------------------------------------------------------ */
/*  Mock S3 operations                                                */
/* ------------------------------------------------------------------ */

// Replace storage service methods so tests don't hit real S3
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a locked team, link the student to it, and create an active project
 * with an approved title. Returns { team, project }.
 */
async function createProjectSetup(studentId, adviserId = null) {
  const team = await Team.create({
    name: 'Test Team',
    leaderId: studentId,
    members: [studentId],
    isLocked: true,
    academicYear: '2024-2025',
  });

  await User.findByIdAndUpdate(studentId, { teamId: team._id });

  const project = await Project.create({
    teamId: team._id,
    title: 'Test Capstone Project',
    abstract: 'A test project for submission tests.',
    keywords: ['test'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus: PROJECT_STATUSES.ACTIVE,
    adviserId: adviserId || undefined,
    deadlines: {
      chapter1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      chapter2: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      chapter3: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  });

  return { team, project };
}

/**
 * Create a minimal valid PDF buffer (magic bytes for PDF: %PDF-1.4).
 * file-type recognizes files by their magic bytes in the first few bytes.
 */
function createPdfBuffer() {
  const header = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  return header;
}

/* ================================================================== */
/*  Test Suites                                                       */
/* ================================================================== */

describe('Submissions API — /api/submissions', () => {
  let studentAgent, studentUser;
  let instructorAgent, instructorUser;
  let adviserAgent, adviserUser;
  let panelistAgent, panelistUser;
  let team, project;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

    // Create authenticated users
    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'sub-student@test.com',
    }));
    ({ agent: instructorAgent, user: instructorUser } = await createAuthenticatedUserWithRole(
      'instructor',
      { email: 'sub-instructor@test.com' },
    ));
    ({ agent: adviserAgent, user: adviserUser } = await createAuthenticatedUserWithRole('adviser', {
      email: 'sub-adviser@test.com',
    }));
    ({ agent: panelistAgent, user: panelistUser } = await createAuthenticatedUserWithRole(
      'panelist',
      { email: 'sub-panelist@test.com' },
    ));

    // Set up project with adviser
    ({ team, project } = await createProjectSetup(studentUser._id, adviserUser._id));

    // Re-fetch student to get updated teamId
    studentUser = await User.findById(studentUser._id);
  });

  /* ────────── Chapter Upload ────────── */
  describe('POST /:projectId/chapters — Upload chapter', () => {
    it('should allow a student to upload a chapter PDF', async () => {
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.chapter).toBe(1);
      expect(res.body.data.submission.version).toBe(1);
      expect(res.body.data.submission.status).toBe(SUBMISSION_STATUSES.PENDING);
      expect(res.body.data.submission.isLate).toBe(false);

      // Verify S3 upload was called
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should auto-increment version on re-upload', async () => {
      // First upload
      await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1-v1.pdf');

      // Second upload
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1-v2.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.submission.version).toBe(2);
    });

    it('should reject upload from non-student role', async () => {
      const res = await adviserAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1.pdf');

      expect(res.status).toBe(403);
    });

    it('should reject upload when no file is attached', async () => {
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1');

      expect(res.status).toBe(400);
    });

    it('should reject upload with invalid chapter number', async () => {
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '6')
        .attach('file', createPdfBuffer(), 'chapter6.pdf');

      expect(res.status).toBe(400);
    });

    it('should reject upload to locked chapter', async () => {
      // Create a locked submission directly
      await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'locked.pdf',
        fileType: 'application/pdf',
        fileSize: 1000,
        storageKey: 'projects/test/chapters/1/v1/locked.pdf',
        status: SUBMISSION_STATUSES.LOCKED,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'new-chapter1.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCUMENT_LOCKED');
    });

    it('should require remarks for late submissions', async () => {
      // Set deadline in the past
      await Project.findByIdAndUpdate(project._id, {
        'deadlines.chapter1': new Date(Date.now() - 1000),
      });

      // Upload without remarks
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'late-chapter1.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('LATE_REMARKS_REQUIRED');
    });

    it('should accept late submission with remarks', async () => {
      // Set deadline in the past
      await Project.findByIdAndUpdate(project._id, {
        'deadlines.chapter1': new Date(Date.now() - 1000),
      });

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .field('remarks', 'Had technical difficulties with the document.')
        .attach('file', createPdfBuffer(), 'late-chapter1.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.submission.isLate).toBe(true);
      expect(res.body.data.submission.remarks).toContain('technical difficulties');
    });

    it('should reject upload when project title is not approved', async () => {
      await Project.findByIdAndUpdate(project._id, { titleStatus: 'draft' });

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/chapters`)
        .field('chapter', '1')
        .attach('file', createPdfBuffer(), 'chapter1.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TITLE_NOT_APPROVED');
    });
  });

  /* ────────── Read Submissions ────────── */
  describe('GET — Read submissions', () => {
    let submissionId;

    beforeEach(async () => {
      // Create a submission directly in DB
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });
      submissionId = sub._id.toString();
    });

    it('should get a single submission by ID', async () => {
      const res = await studentAgent.get(`/api/submissions/${submissionId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submission._id).toBe(submissionId);
      expect(res.body.data.submission.chapter).toBe(1);
    });

    it('should list submissions by project', async () => {
      const res = await studentAgent.get(`/api/submissions/project/${project._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should filter submissions by chapter', async () => {
      // Add a chapter 2 submission
      await Submission.create({
        projectId: project._id,
        chapter: 2,
        version: 1,
        fileName: 'chapter2.pdf',
        fileType: 'application/pdf',
        fileSize: 3000,
        storageKey: 'projects/test/chapters/2/v1/chapter2.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.get(`/api/submissions/project/${project._id}?chapter=1`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions).toHaveLength(1);
      expect(res.body.data.submissions[0].chapter).toBe(1);
    });

    it('should return chapter version history', async () => {
      // Add v2
      await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 2,
        fileName: 'chapter1-v2.pdf',
        fileType: 'application/pdf',
        fileSize: 6000,
        storageKey: 'projects/test/chapters/1/v2/chapter1-v2.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.get(`/api/submissions/project/${project._id}/chapters/1`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions).toHaveLength(2);
      // First should be v2 (descending)
      expect(res.body.data.submissions[0].version).toBe(2);
    });

    it('should return latest chapter submission', async () => {
      await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 2,
        fileName: 'chapter1-v2.pdf',
        fileType: 'application/pdf',
        fileSize: 6000,
        storageKey: 'projects/test/chapters/1/v2/chapter1-v2.pdf',
        status: SUBMISSION_STATUSES.UNDER_REVIEW,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.get(
        `/api/submissions/project/${project._id}/chapters/1/latest`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.submission.version).toBe(2);
    });
  });

  /* ────────── Pre-signed View URL ────────── */
  describe('GET /:submissionId/view — View document', () => {
    it('should return a pre-signed URL', async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.get(`/api/submissions/${sub._id}/view`);

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('mock-s3');
      expect(res.body.data.expiresIn).toBe(300);
    });
  });

  /* ────────── Review Workflow ────────── */
  describe('POST /:submissionId/review — Review submission', () => {
    let submissionId;

    beforeEach(async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });
      submissionId = sub._id.toString();
    });

    it('should allow adviser to approve (auto-locks)', async () => {
      const res = await adviserAgent.post(`/api/submissions/${submissionId}/review`).send({
        status: 'approved',
        reviewNote: 'Well done. Approved.',
      });

      expect(res.status).toBe(200);
      // Approved submissions are auto-locked
      expect(res.body.data.submission.status).toBe(SUBMISSION_STATUSES.LOCKED);
    });

    it('should allow instructor to request revisions', async () => {
      const res = await instructorAgent.post(`/api/submissions/${submissionId}/review`).send({
        status: 'revisions_required',
        reviewNote: 'Please fix the references.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe(SUBMISSION_STATUSES.REVISIONS_REQUIRED);
    });

    it('should allow adviser to reject', async () => {
      const res = await adviserAgent.post(`/api/submissions/${submissionId}/review`).send({
        status: 'rejected',
        reviewNote: 'Does not meet requirements.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe(SUBMISSION_STATUSES.REJECTED);
    });

    it('should reject review from student role', async () => {
      const res = await studentAgent.post(`/api/submissions/${submissionId}/review`).send({
        status: 'approved',
      });

      expect(res.status).toBe(403);
    });

    it('should reject review of locked submission', async () => {
      await Submission.findByIdAndUpdate(submissionId, { status: SUBMISSION_STATUSES.LOCKED });

      const res = await adviserAgent.post(`/api/submissions/${submissionId}/review`).send({
        status: 'approved',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SUBMISSION_LOCKED');
    });
  });

  /* ────────── Unlock ────────── */
  describe('POST /:submissionId/unlock — Unlock locked submission', () => {
    let submissionId;

    beforeEach(async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.LOCKED,
        submittedBy: studentUser._id,
      });
      submissionId = sub._id.toString();
    });

    it('should allow adviser to unlock a locked submission', async () => {
      const res = await adviserAgent.post(`/api/submissions/${submissionId}/unlock`).send({
        reason: 'Student needs to fix formatting issues in chapter 1.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe(SUBMISSION_STATUSES.PENDING);
    });

    it('should reject unlock from student role', async () => {
      const res = await studentAgent.post(`/api/submissions/${submissionId}/unlock`).send({
        reason: 'I want to edit my chapter.',
      });

      expect(res.status).toBe(403);
    });

    it('should reject unlock of non-locked submission', async () => {
      await Submission.findByIdAndUpdate(submissionId, { status: SUBMISSION_STATUSES.PENDING });

      const res = await adviserAgent.post(`/api/submissions/${submissionId}/unlock`).send({
        reason: 'This should fail because it is not locked.',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_LOCKED');
    });
  });

  /* ────────── Annotations ────────── */
  describe('Annotations — add and remove', () => {
    let submissionId;

    beforeEach(async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });
      submissionId = sub._id.toString();
    });

    it('should allow adviser to add an annotation', async () => {
      const res = await adviserAgent.post(`/api/submissions/${submissionId}/annotations`).send({
        page: 3,
        content: 'Please clarify this paragraph.',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.submission.annotations).toHaveLength(1);
      expect(res.body.data.submission.annotations[0].content).toBe(
        'Please clarify this paragraph.',
      );
      expect(res.body.data.submission.annotations[0].page).toBe(3);
    });

    it('should allow instructor to add an annotation', async () => {
      const res = await instructorAgent.post(`/api/submissions/${submissionId}/annotations`).send({
        content: 'Instructor feedback here.',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.submission.annotations).toHaveLength(1);
    });

    it('should reject annotation from student role', async () => {
      const res = await studentAgent.post(`/api/submissions/${submissionId}/annotations`).send({
        content: 'Student trying to annotate.',
      });

      expect(res.status).toBe(403);
    });

    it('should allow the annotation author to remove it', async () => {
      // Add annotation
      const addRes = await adviserAgent
        .post(`/api/submissions/${submissionId}/annotations`)
        .send({ content: 'To be removed.' });

      expect(addRes.status).toBe(201);
      const annotationId = addRes.body.data.submission.annotations[0]._id;
      expect(annotationId).toBeDefined();

      // Remove it
      const res = await adviserAgent.delete(
        `/api/submissions/${submissionId}/annotations/${annotationId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.submission.annotations).toHaveLength(0);
    });

    it('should allow instructor to remove any annotation', async () => {
      // Adviser adds annotation
      const addRes = await adviserAgent
        .post(`/api/submissions/${submissionId}/annotations`)
        .send({ content: 'Adviser comment.' });

      const annotationId = addRes.body.data.submission.annotations[0]._id;

      // Instructor removes it
      const res = await instructorAgent.delete(
        `/api/submissions/${submissionId}/annotations/${annotationId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.submission.annotations).toHaveLength(0);
    });
  });

  /* ────────── RBAC Security Tests ────────── */
  describe('RBAC — Security boundary tests', () => {
    it('should reject student attempting to review a submission', async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.post(`/api/submissions/${sub._id}/review`).send({
        status: 'approved',
      });
      expect(res.status).toBe(403);
    });

    it('should reject panelist attempting to unlock a submission', async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.LOCKED,
        submittedBy: studentUser._id,
      });

      const res = await panelistAgent.post(`/api/submissions/${sub._id}/unlock`).send({
        reason: 'Panelist trying to unlock.',
      });
      expect(res.status).toBe(403);
    });

    it('should reject student attempting to annotate', async () => {
      const sub = await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 5000,
        storageKey: 'projects/test/chapters/1/v1/chapter1.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await studentAgent.post(`/api/submissions/${sub._id}/annotations`).send({
        content: 'Student annotation attempt.',
      });
      expect(res.status).toBe(403);
    });
  });
});
