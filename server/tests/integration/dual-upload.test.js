import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import storageService from '../../services/storage.service.js';
import { TITLE_STATUSES, PROJECT_STATUSES, SUBMISSION_STATUSES, ROLES } from '@cms/shared';

// Top-level mocks
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

function createPdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
}

function buildProjectPayload(teamId, studentId, adviserId, overrides = {}) {
  const title = overrides.title || 'Dual Upload Capstone';
  return {
    teamId,
    courseId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    title,
    titleProposals: overrides.titleProposals || [
      title,
      `${title} Architecture`,
      `${title} Deployment`,
      `${title} Testing`,
      `${title} Validation`,
    ],
    abstract: overrides.abstract || 'Testing dual version upload.',
    keywords: overrides.keywords || ['dual', 'upload'],
    academicYear: '2024-2025',
    titleStatus: overrides.titleStatus ?? TITLE_STATUSES.APPROVED,
    projectStatus: overrides.projectStatus ?? PROJECT_STATUSES.ACTIVE,
    adviserId,
    memberRoleAssignments: overrides.memberRoleAssignments || [
      {
        userId: studentId,
        professionalTitle: 'Lead Developer',
        traditionalRole: 'Programmer',
        responsibilities: 'System Logic, Database, and Deployment.',
      },
    ],
    capstonePhase: overrides.capstonePhase ?? 4,
    deadlines: overrides.deadlines || { defense: new Date(Date.now() + 86400000 * 30) },
  };
}

async function createPhase4Project(studentId, adviserId) {
  const team = await Team.create({
    name: 'Dual Upload Team',
    leaderId: studentId,
    members: [studentId],
    isLocked: true,
    academicYear: '2024-2025',
  });
  await User.findByIdAndUpdate(studentId, { teamId: team._id });
  const project = await Project.create(buildProjectPayload(team._id, studentId, adviserId));
  return { team, project };
}

describe('Sprint 11 — Dual Version Upload (Final Papers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);
  });

  describe('POST /api/submissions/:projectId/final-academic', () => {
    it('should upload final academic paper successfully (201)', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.type).toBe('final_academic');
      expect(res.body.data.submission.version).toBe(1);
    });

    it('should auto-increment version on re-upload', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      // First upload
      await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      // Second upload
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper-v2.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.submission.version).toBe(2);
    });

    it('should reject if not a student (403)', async () => {
      const { agent: instructorAgent } = await createAuthenticatedUserWithRole('instructor', {
        email: 'dual-instructor@test.com',
      });
      const { user: student } = await createAuthenticatedUserWithRole('student', {
        email: 'dual-student@test.com',
      });
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      const res = await instructorAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject if project not in phase 4', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });

      const team = await Team.create({
        name: 'Dual Upload Team',
        leaderId: student._id,
        members: [student._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student._id, { teamId: team._id });

      const project = await Project.create(
        buildProjectPayload(team._id, student._id, adviser._id, {
          title: 'Phase 1 Capstone',
          abstract: 'Testing wrong phase.',
          keywords: ['phase', 'test'],
          capstonePhase: 1,
        }),
      );

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WRONG_PHASE');
    });

    it('should reject if title not approved', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });

      const team = await Team.create({
        name: 'Dual Upload Team',
        leaderId: student._id,
        members: [student._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student._id, { teamId: team._id });

      const project = await Project.create(
        buildProjectPayload(team._id, student._id, adviser._id, {
          title: 'Unapproved Title Capstone',
          abstract: 'Testing unapproved title.',
          keywords: ['title', 'test'],
          titleStatus: TITLE_STATUSES.DRAFT,
        }),
      );

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TITLE_NOT_APPROVED');
    });

    it('should reject if user is not team member (403)', async () => {
      const { user: student } = await createAuthenticatedUserWithRole('student', {
        email: 'dual-student@test.com',
      });
      const { agent: student2Agent } = await createAuthenticatedUserWithRole('student', {
        email: 'dual-student2@test.com',
      });
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      const res = await student2Agent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_TEAM_MEMBER');
    });

    it('should require remarks for late submission', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      // Set deadline to the past after creation
      await Project.findByIdAndUpdate(project._id, {
        'deadlines.defense': new Date(Date.now() - 86400000),
      });

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('LATE_REMARKS_REQUIRED');
    });

    it('should accept late submission with remarks', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      // Set deadline to the past after creation
      await Project.findByIdAndUpdate(project._id, {
        'deadlines.defense': new Date(Date.now() - 86400000),
      });

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf')
        .field('remarks', 'Late due to external review');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should call storageService.uploadFile', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  describe('POST /api/submissions/:projectId/final-journal', () => {
    it('should upload final journal paper successfully (201)', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-journal`)
        .attach('file', createPdfBuffer(), 'journal-paper.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.type).toBe('final_journal');
    });

    it('should auto-increment version independently from academic', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });
      const { project } = await createPhase4Project(student._id, adviser._id);

      // Upload academic first (version 1 for academic)
      await studentAgent
        .post(`/api/submissions/${project._id}/final-academic`)
        .attach('file', createPdfBuffer(), 'academic-paper.pdf');

      // Upload journal — should be version 1 independently
      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-journal`)
        .attach('file', createPdfBuffer(), 'journal-paper.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.submission.version).toBe(1);
    });

    it('should reject if not a student (403)', async () => {
      const { user: student } = await createAuthenticatedUserWithRole('student', {
        email: 'dual-student@test.com',
      });
      const { agent: adviserAgent, user: adviser } = await createAuthenticatedUserWithRole(
        'adviser',
        { email: 'dual-adviser@test.com' },
      );
      const { project } = await createPhase4Project(student._id, adviser._id);

      const res = await adviserAgent
        .post(`/api/submissions/${project._id}/final-journal`)
        .attach('file', createPdfBuffer(), 'journal-paper.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject if project not in phase 4', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });

      const team = await Team.create({
        name: 'Dual Upload Team',
        leaderId: student._id,
        members: [student._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student._id, { teamId: team._id });

      const project = await Project.create(
        buildProjectPayload(team._id, student._id, adviser._id, {
          title: 'Phase 1 Journal Capstone',
          abstract: 'Testing wrong phase for journal.',
          keywords: ['phase', 'journal'],
          capstonePhase: 1,
        }),
      );

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-journal`)
        .attach('file', createPdfBuffer(), 'journal-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WRONG_PHASE');
    });

    it('should reject if title not approved', async () => {
      const { agent: studentAgent, user: student } = await createAuthenticatedUserWithRole(
        'student',
        { email: 'dual-student@test.com' },
      );
      const { user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'dual-adviser@test.com',
      });

      const team = await Team.create({
        name: 'Dual Upload Team',
        leaderId: student._id,
        members: [student._id],
        isLocked: true,
        academicYear: '2024-2025',
      });
      await User.findByIdAndUpdate(student._id, { teamId: team._id });

      const project = await Project.create(
        buildProjectPayload(team._id, student._id, adviser._id, {
          title: 'Unapproved Journal Capstone',
          abstract: 'Testing unapproved title for journal.',
          keywords: ['title', 'journal'],
          titleStatus: TITLE_STATUSES.DRAFT,
        }),
      );

      const res = await studentAgent
        .post(`/api/submissions/${project._id}/final-journal`)
        .attach('file', createPdfBuffer(), 'journal-paper.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TITLE_NOT_APPROVED');
    });
  });
});
