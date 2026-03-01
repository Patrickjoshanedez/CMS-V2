/**
 * Integration tests for Sprint 11 Project features:
 * Archive, Certificate, Reports, and Bulk Upload.
 *
 * Covers: POST /:id/archive, GET /archive/search, POST /:id/certificate,
 * GET /:id/certificate, GET /reports, POST /archive/bulk
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import storageService from '../../services/storage.service.js';
import { TITLE_STATUSES, PROJECT_STATUSES, SUBMISSION_STATUSES } from '@cms/shared';

/* ------------------------------------------------------------------ */
/*  S3 mock (global — always active)                                  */
/* ------------------------------------------------------------------ */
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue('https://mock-s3.example.com/signed-url');
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

/* ------------------------------------------------------------------ */
/*  Helper utilities                                                  */
/* ------------------------------------------------------------------ */

function createPdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
}

async function createProjectSetup(studentId, adviserId) {
  const team = await Team.create({
    name: 'Sprint11 Test Team',
    leaderId: studentId,
    members: [studentId],
    isLocked: true,
    academicYear: '2024-2025',
  });
  await User.findByIdAndUpdate(studentId, { teamId: team._id });
  const project = await Project.create({
    teamId: team._id,
    title: 'Sprint11 Capstone Project',
    abstract: 'Testing Sprint 11 features.',
    keywords: ['testing', 'capstone'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus: PROJECT_STATUSES.ACTIVE,
    adviserId: adviserId || undefined,
    capstonePhase: 4,
  });
  return { team, project };
}

async function createArchivedProject(studentId, adviserId) {
  const { team, project } = await createProjectSetup(studentId, adviserId);
  // Add both final paper submissions required for archiving
  await Submission.create({
    projectId: project._id,
    type: 'final_academic',
    chapter: null,
    version: 1,
    fileName: 'academic.pdf',
    fileSize: 1000,
    fileType: 'application/pdf',
    mimeType: 'application/pdf',
    storageKey: 'finals/academic/v1/academic.pdf',
    status: SUBMISSION_STATUSES.PENDING,
    submittedBy: studentId,
  });
  await Submission.create({
    projectId: project._id,
    type: 'final_journal',
    chapter: null,
    version: 1,
    fileName: 'journal.pdf',
    fileSize: 800,
    fileType: 'application/pdf',
    mimeType: 'application/pdf',
    storageKey: 'finals/journal/v1/journal.pdf',
    status: SUBMISSION_STATUSES.PENDING,
    submittedBy: studentId,
  });
  return { team, project };
}

/* ================================================================== */
/*  Test Suites                                                       */
/* ================================================================== */

describe('Sprint 11 — Project Archive, Certificate, Reports, Bulk Upload', () => {
  let studentAgent, studentUser;
  let instructorAgent, instructorUser;
  let adviserAgent, adviserUser;

  beforeEach(async () => {
    // Re-setup S3 mocks
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue('https://mock-s3.example.com/signed-url');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

    // Create authenticated users with unique emails
    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 's11-student@test.com',
    }));
    ({ agent: instructorAgent, user: instructorUser } = await createAuthenticatedUserWithRole(
      'instructor',
      { email: 's11-instructor@test.com' },
    ));
    ({ agent: adviserAgent, user: adviserUser } = await createAuthenticatedUserWithRole('adviser', {
      email: 's11-adviser@test.com',
    }));
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  POST /:id/archive — Archive project                            */
  /* ──────────────────────────────────────────────────────────────── */
  describe('POST /:id/archive — Archive project', () => {
    it('should archive project with both final papers submitted (instructor)', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      const res = await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Well done!' });

      expect(res.status).toBe(200);
      expect(res.body.data.project.isArchived).toBe(true);
      expect(res.body.data.project.projectStatus).toBe('archived');
    });

    it('should reject archive when academic version is missing', async () => {
      const { project } = await createProjectSetup(studentUser._id, adviserUser._id);

      const res = await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Attempting archive' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toContain('MISSING_ACADEMIC');
    });

    it('should reject archive when journal version is missing', async () => {
      const { project } = await createProjectSetup(studentUser._id, adviserUser._id);
      // Add only the academic submission
      await Submission.create({
        projectId: project._id,
        type: 'final_academic',
        chapter: null,
        version: 1,
        fileName: 'academic.pdf',
        fileSize: 1000,
        fileType: 'application/pdf',
        mimeType: 'application/pdf',
        storageKey: 'finals/academic/v1/academic.pdf',
        status: SUBMISSION_STATUSES.PENDING,
        submittedBy: studentUser._id,
      });

      const res = await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Missing journal' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toContain('MISSING_JOURNAL');
    });

    it('should reject archiving already archived project', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive once
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'First archive' });

      // Try again
      const res = await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Second attempt' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toContain('ALREADY_ARCHIVED');
    });

    it('should reject archive by non-instructor (student)', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      const res = await studentAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Student trying' });

      expect(res.status).toBe(403);
    });
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  GET /archive/search — Search archive                           */
  /* ──────────────────────────────────────────────────────────────── */
  describe('GET /archive/search — Search archive', () => {
    it('should return archived projects', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive the project first
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for search test' });

      const res = await instructorAgent.get('/api/projects/archive/search');

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toHaveLength(1);
      expect(res.body.data.projects[0].isArchived).toBe(true);
    });

    it('should filter by academic year', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archive for year filter' });

      // Search with matching year
      const resMatch = await instructorAgent.get('/api/projects/archive/search?academicYear=2024-2025');
      expect(resMatch.status).toBe(200);
      expect(resMatch.body.data.projects).toHaveLength(1);

      // Search with non-matching year
      const resNoMatch = await instructorAgent.get(
        '/api/projects/archive/search?academicYear=2023-2024',
      );
      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.data.projects).toHaveLength(0);
    });

    it('should set canViewAcademic=false for students', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archive for student search' });

      const res = await studentAgent.get('/api/projects/archive/search');

      expect(res.status).toBe(200);
      expect(res.body.data.canViewAcademic).toBe(false);
    });

    it('should set canViewAcademic=true for instructors', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archive for instructor search' });

      const res = await instructorAgent.get('/api/projects/archive/search');

      expect(res.status).toBe(200);
      expect(res.body.data.canViewAcademic).toBe(true);
    });

    it('should return empty for no archived projects', async () => {
      const res = await instructorAgent.get('/api/projects/archive/search');

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toHaveLength(0);
    });
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  POST /:id/certificate — Upload certificate                     */
  /* ──────────────────────────────────────────────────────────────── */
  describe('POST /:id/certificate — Upload certificate', () => {
    it('should upload certificate for archived project (instructor)', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive first
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for cert upload' });

      const res = await instructorAgent
        .post(`/api/projects/${project._id}/certificate`)
        .attach('file', createPdfBuffer(), 'cert.pdf');

      expect(res.status).toBe(201);
    });

    it('should reject upload for non-archived project', async () => {
      const { project } = await createProjectSetup(studentUser._id, adviserUser._id);

      const res = await instructorAgent
        .post(`/api/projects/${project._id}/certificate`)
        .attach('file', createPdfBuffer(), 'cert.pdf');

      expect(res.status).toBe(400);
    });

    it('should reject upload by non-instructor', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive first
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for cert RBAC test' });

      const res = await studentAgent
        .post(`/api/projects/${project._id}/certificate`)
        .attach('file', createPdfBuffer(), 'cert.pdf');

      expect(res.status).toBe(403);
    });

    it('should call storageService.uploadFile', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive first
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for S3 spy test' });

      await instructorAgent
        .post(`/api/projects/${project._id}/certificate`)
        .attach('file', createPdfBuffer(), 'cert.pdf');

      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  GET /:id/certificate — Get certificate URL                     */
  /* ──────────────────────────────────────────────────────────────── */
  describe('GET /:id/certificate — Get certificate URL', () => {
    it('should return signed URL for project with certificate', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive the project
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for cert download' });

      // Upload a certificate
      await instructorAgent
        .post(`/api/projects/${project._id}/certificate`)
        .attach('file', createPdfBuffer(), 'cert.pdf');

      const res = await instructorAgent.get(`/api/projects/${project._id}/certificate`);

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeDefined();
    });

    it('should reject when no certificate uploaded', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive but do NOT upload certificate
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving without cert' });

      const res = await instructorAgent.get(`/api/projects/${project._id}/certificate`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toContain('NO_CERTIFICATE');
    });
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  GET /reports — Generate report                                  */
  /* ──────────────────────────────────────────────────────────────── */
  describe('GET /reports — Generate report', () => {
    it('should return report grouped by academic year (instructor)', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      // Archive a project so reports have data
      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for report' });

      const res = await instructorAgent.get('/api/projects/reports');

      expect(res.status).toBe(200);
      expect(res.body.data.report.totalProjects).toBe(1);
      expect(res.body.data.report.byYear).toBeInstanceOf(Array);
      expect(res.body.data.report.byYear.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by academic year', async () => {
      const { project } = await createArchivedProject(studentUser._id, adviserUser._id);

      await instructorAgent
        .post(`/api/projects/${project._id}/archive`)
        .send({ completionNotes: 'Archiving for year filter' });

      // Matching year
      const resMatch = await instructorAgent.get('/api/projects/reports?academicYear=2024-2025');
      expect(resMatch.status).toBe(200);
      expect(resMatch.body.data.report.totalProjects).toBe(1);

      // Non-matching year
      const resNoMatch = await instructorAgent.get('/api/projects/reports?academicYear=2023-2024');
      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.data.report.totalProjects).toBe(0);
    });

    it('should reject non-instructor', async () => {
      const res = await studentAgent.get('/api/projects/reports');

      expect(res.status).toBe(403);
    });
  });

  /* ──────────────────────────────────────────────────────────────── */
  /*  POST /archive/bulk — Bulk upload legacy document                */
  /* ──────────────────────────────────────────────────────────────── */
  describe('POST /archive/bulk — Bulk upload legacy document', () => {
    it('should bulk upload a legacy document (instructor)', async () => {
      const res = await instructorAgent
        .post('/api/projects/archive/bulk')
        .field('title', 'Legacy Capstone')
        .field('academicYear', '2020-2021')
        .field('keywords', 'legacy,archive')
        .attach('file', createPdfBuffer(), 'legacy.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.project).toBeDefined();
      expect(res.body.data.submission).toBeDefined();
    });

    it('should create an archived project record', async () => {
      await instructorAgent
        .post('/api/projects/archive/bulk')
        .field('title', 'Legacy Capstone Verify')
        .field('academicYear', '2020-2021')
        .field('keywords', 'legacy,verify')
        .attach('file', createPdfBuffer(), 'legacy.pdf');

      const project = await Project.findOne({ title: 'Legacy Capstone Verify' });
      expect(project).not.toBeNull();
      expect(project.isArchived).toBe(true);
    });

    it('should reject without required fields', async () => {
      // Omit title
      const res = await instructorAgent
        .post('/api/projects/archive/bulk')
        .field('academicYear', '2020-2021')
        .field('keywords', 'legacy')
        .attach('file', createPdfBuffer(), 'legacy.pdf');

      expect(res.status).toBe(400);
    });

    it('should reject by non-instructor', async () => {
      const res = await studentAgent
        .post('/api/projects/archive/bulk')
        .field('title', 'Student Attempt')
        .field('academicYear', '2020-2021')
        .field('keywords', 'forbidden')
        .attach('file', createPdfBuffer(), 'legacy.pdf');

      expect(res.status).toBe(403);
    });
  });
});
