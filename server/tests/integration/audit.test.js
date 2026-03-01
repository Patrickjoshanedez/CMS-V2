import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createAuthenticatedUserWithRole, request } from '../helpers.js';
import AuditLog from '../../modules/audit/audit.model.js';
import auditService from '../../modules/audit/audit.service.js';

/* ═══════════════════════════════════════════════════════════════════
 *  Audit Log API — /api/audit
 *
 *  Tests cover:
 *    1. AuditService.log() — direct log creation
 *    2. GET  / — Query audit logs (Instructor only, with filters & pagination)
 *    3. GET  /:targetType/:targetId — Entity history (faculty roles)
 *    4. Authorization — students denied, role checks enforced
 *    5. auditLog middleware — verify audit entries created on route hits
 * ═══════════════════════════════════════════════════════════════════ */

describe('Audit Log API — /api/audit', () => {
  let instructorAgent, instructor;
  let adviserAgent, adviser;
  let panelistAgent, panelist;
  let studentAgent, student;

  beforeEach(async () => {
    const i = await createAuthenticatedUserWithRole('instructor', { email: 'audit-inst@test.com' });
    const a = await createAuthenticatedUserWithRole('adviser', { email: 'audit-adv@test.com' });
    const p = await createAuthenticatedUserWithRole('panelist', { email: 'audit-pan@test.com' });
    const s = await createAuthenticatedUserWithRole('student', { email: 'audit-stu@test.com' });

    instructorAgent = i.agent;
    instructor = i.user;
    adviserAgent = a.agent;
    adviser = a.user;
    panelistAgent = p.agent;
    panelist = p.user;
    studentAgent = s.agent;
    student = s.user;

    // Wait for fire-and-forget login audit entries to land, then clear them
    await new Promise((resolve) => setTimeout(resolve, 200));
    await AuditLog.deleteMany({});
  });

  /* ──────────── Helper: Seed audit entries ──────────── */

  async function seedAuditEntries() {
    const projectId = new mongoose.Types.ObjectId();
    const submissionId = new mongoose.Types.ObjectId();

    const entries = [
      {
        action: 'project.created',
        actor: instructor._id,
        actorRole: 'instructor',
        targetType: 'Project',
        targetId: projectId.toString(),
        description: 'Created project Alpha',
        metadata: { title: 'Alpha' },
        ipAddress: '127.0.0.1',
      },
      {
        action: 'project.archived',
        actor: instructor._id,
        actorRole: 'instructor',
        targetType: 'Project',
        targetId: projectId.toString(),
        description: 'Archived project Alpha',
        metadata: {},
        ipAddress: '127.0.0.1',
      },
      {
        action: 'submission.chapter_uploaded',
        actor: student._id,
        actorRole: 'student',
        targetType: 'Submission',
        targetId: submissionId.toString(),
        description: 'Uploaded Chapter 1',
        metadata: { chapter: 1 },
        ipAddress: '192.168.1.1',
      },
      {
        action: 'user.role_changed',
        actor: instructor._id,
        actorRole: 'instructor',
        targetType: 'User',
        targetId: student._id.toString(),
        description: 'Changed role for student',
        metadata: { newRole: 'adviser' },
        ipAddress: '127.0.0.1',
      },
      {
        action: 'settings.updated',
        actor: instructor._id,
        actorRole: 'instructor',
        targetType: 'Settings',
        description: 'Updated system settings',
        metadata: { changes: { plagiarismThreshold: 80 } },
        ipAddress: '127.0.0.1',
      },
    ];

    await AuditLog.insertMany(entries);
    return { projectId, submissionId };
  }

  /* ──────────── AuditService.log() ──────────── */

  describe('AuditService.log()', () => {
    it('should create an audit log entry', async () => {
      const entry = await auditService.log({
        action: 'test.action',
        actor: instructor._id,
        actorRole: 'instructor',
        targetType: 'System',
        description: 'Test audit log entry',
        metadata: { test: true },
        ipAddress: '127.0.0.1',
      });

      expect(entry).toBeTruthy();
      expect(entry.action).toBe('test.action');
      expect(entry.actorRole).toBe('instructor');
      expect(entry.targetType).toBe('System');

      const found = await AuditLog.findById(entry._id);
      expect(found).toBeTruthy();
    });

    it('should not crash on invalid data (swallows errors)', async () => {
      // Missing required fields — should not throw
      const entry = await auditService.log({});
      expect(entry).toBeNull();
    });
  });

  /* ──────────── GET /api/audit ──────────── */

  describe('GET /api/audit — Query audit logs (Instructor only)', () => {
    it('should return empty results when no logs exist', async () => {
      const res = await instructorAgent.get('/api/audit');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalPages).toBe(0);
    });

    it('should return all audit logs with pagination', async () => {
      await seedAuditEntries();

      const res = await instructorAgent.get('/api/audit');

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBe(5);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.totalPages).toBe(1);
    });

    it('should filter by action pattern', async () => {
      await seedAuditEntries();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ action: 'project' });

      expect(res.status).toBe(200);
      // Should match 'project.created' and 'project.archived'
      expect(res.body.data.logs.length).toBe(2);
      expect(res.body.data.logs.every((l) => l.action.includes('project'))).toBe(true);
    });

    it('should filter by targetType', async () => {
      await seedAuditEntries();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ targetType: 'User' });

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBe(1);
      expect(res.body.data.logs[0].action).toBe('user.role_changed');
    });

    it('should filter by actor', async () => {
      await seedAuditEntries();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ actor: student._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBe(1);
      expect(res.body.data.logs[0].action).toBe('submission.chapter_uploaded');
    });

    it('should filter by date range', async () => {
      await seedAuditEntries();

      // Use a wide range that captures everything
      const startDate = new Date(Date.now() - 60000).toISOString();
      const endDate = new Date(Date.now() + 60000).toISOString();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ startDate, endDate });

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBe(5);
    });

    it('should paginate results', async () => {
      await seedAuditEntries();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBe(2);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.totalPages).toBe(3);
      expect(res.body.data.page).toBe(1);

      // Fetch page 2
      const res2 = await instructorAgent
        .get('/api/audit')
        .query({ page: 2, limit: 2 });

      expect(res2.body.data.logs.length).toBe(2);
      expect(res2.body.data.page).toBe(2);
    });

    it('should sort logs by createdAt descending (newest first)', async () => {
      await seedAuditEntries();

      const res = await instructorAgent.get('/api/audit');

      const timestamps = res.body.data.logs.map((l) => new Date(l.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('should populate actor with name and email', async () => {
      await seedAuditEntries();

      const res = await instructorAgent
        .get('/api/audit')
        .query({ targetType: 'User' });

      expect(res.status).toBe(200);
      const log = res.body.data.logs[0];
      expect(log.actor).toHaveProperty('firstName');
      expect(log.actor).toHaveProperty('lastName');
      expect(log.actor).toHaveProperty('email');
    });
  });

  /* ──────────── GET /api/audit/:targetType/:targetId ──────────── */

  describe('GET /api/audit/:targetType/:targetId — Entity history', () => {
    it('should return history for a specific project', async () => {
      const { projectId } = await seedAuditEntries();

      const res = await instructorAgent
        .get(`/api/audit/Project/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should find 'project.created' and 'project.archived'
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((l) => l.targetType === 'Project')).toBe(true);
    });

    it('should allow an adviser to view entity history', async () => {
      const { projectId } = await seedAuditEntries();

      const res = await adviserAgent
        .get(`/api/audit/Project/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should allow a panelist to view entity history', async () => {
      const { projectId } = await seedAuditEntries();

      const res = await panelistAgent
        .get(`/api/audit/Project/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should return empty array for non-existent entity', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await instructorAgent
        .get(`/api/audit/Project/${fakeId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should respect the limit query parameter', async () => {
      const { projectId } = await seedAuditEntries();

      const res = await instructorAgent
        .get(`/api/audit/Project/${projectId}`)
        .query({ limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  /* ──────────── Authorization ──────────── */

  describe('Authorization', () => {
    it('should deny students from querying all audit logs', async () => {
      const res = await studentAgent.get('/api/audit');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny advisers from querying all audit logs', async () => {
      const res = await adviserAgent.get('/api/audit');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny panelists from querying all audit logs', async () => {
      const res = await panelistAgent.get('/api/audit');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny students from viewing entity history', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await studentAgent
        .get(`/api/audit/Project/${fakeId}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny unauthenticated users from audit logs', async () => {
      const res = await request.get('/api/audit');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /* ──────────── Audit Middleware Integration ──────────── */

  describe('Audit Middleware — settings update creates audit entry', () => {
    it('should create an audit entry when settings are updated', async () => {
      // Update settings — the auditLog middleware is wired on PUT /api/settings
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 85 });

      expect(res.status).toBe(200);

      // The audit entry is created async (setImmediate), wait briefly
      await new Promise((resolve) => setTimeout(resolve, 200));

      const logs = await AuditLog.find({ action: 'settings.updated' }).lean();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const entry = logs[0];
      expect(entry.actorRole).toBe('instructor');
      expect(entry.targetType).toBe('Settings');
      expect(entry.description).toBe('Updated system settings');
    });
  });
});
