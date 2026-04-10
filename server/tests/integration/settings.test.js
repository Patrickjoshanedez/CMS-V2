import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthenticatedUserWithRole, request } from '../helpers.js';

/* ═══════════════════════════════════════════════════════════════════
 *  System Settings API — /api/settings
 *
 *  Test Cases:
 *    TC-SET-001: GET /api/settings — Any authenticated user can read
 *    TC-SET-002: Announcement display — Update & retrieve on dashboards
 *    TC-SET-003: Maintenance mode — Blocks non-instructors with 503
 *    TC-SET-004: Auth protection — PUT restricted to instructors only
 * ═══════════════════════════════════════════════════════════════════ */

describe('System Settings API — /api/settings', () => {
  let instructorAgent;
  let studentAgent;
  let adviserAgent;

  beforeEach(async () => {
    const i = await createAuthenticatedUserWithRole('instructor', {
      email: 'settings-inst@test.com',
    });
    const s = await createAuthenticatedUserWithRole('student', { email: 'settings-stu@test.com' });
    const a = await createAuthenticatedUserWithRole('adviser', { email: 'settings-adv@test.com' });

    instructorAgent = i.agent;
    studentAgent = s.agent;
    adviserAgent = a.agent;
  });

  /* ──────────── TC-SET-001: GET /api/settings ──────────── */

  describe('TC-SET-001 — GET /api/settings (Any authenticated user)', () => {
    it('should return default settings when none have been set', async () => {
      const res = await instructorAgent.get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        plagiarismThreshold: 75,
        titleSimilarityThreshold: 0.65,
        maxFileSize: 25 * 1024 * 1024,
        systemAnnouncement: '',
        maintenanceMode: false,
      });
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should allow a student to read settings', async () => {
      const res = await studentAgent.get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plagiarismThreshold).toBe(75);
    });

    it('should allow an adviser to read settings', async () => {
      const res = await adviserAgent.get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plagiarismThreshold).toBe(75);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request.get('/api/settings');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /* ──────────── TC-SET-004: PUT Auth Protection ──────────── */

  describe('TC-SET-004 — PUT /api/settings (Instructor-only)', () => {
    it('should update plagiarism threshold as instructor', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 80 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plagiarismThreshold).toBe(80);
    });

    it('should update title similarity threshold', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ titleSimilarityThreshold: 0.8 });

      expect(res.status).toBe(200);
      expect(res.body.data.titleSimilarityThreshold).toBe(0.8);
    });

    it('should update max file size', async () => {
      const newSize = 50 * 1024 * 1024; // 50MB
      const res = await instructorAgent.put('/api/settings').send({ maxFileSize: newSize });

      expect(res.status).toBe(200);
      expect(res.body.data.maxFileSize).toBe(newSize);
    });

    it('should update multiple fields at once', async () => {
      const res = await instructorAgent.put('/api/settings').send({
        plagiarismThreshold: 90,
        titleSimilarityThreshold: 0.5,
        systemAnnouncement: 'Welcome back!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.plagiarismThreshold).toBe(90);
      expect(res.body.data.titleSimilarityThreshold).toBe(0.5);
      expect(res.body.data.systemAnnouncement).toBe('Welcome back!');
    });

    it('should persist updated values across reads', async () => {
      await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 65 });

      const res = await studentAgent.get('/api/settings');
      expect(res.body.data.plagiarismThreshold).toBe(65);
    });

    it('should not expose internal fields in response', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 70 });

      expect(res.body.data).not.toHaveProperty('_id');
      expect(res.body.data).not.toHaveProperty('key');
      expect(res.body.data).not.toHaveProperty('updatedBy');
      expect(res.body.data).not.toHaveProperty('__v');
    });

    it('should reject student from updating settings', async () => {
      const res = await studentAgent.put('/api/settings').send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject adviser from updating settings', async () => {
      const res = await adviserAgent.put('/api/settings').send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated user from updating settings', async () => {
      const res = await request.put('/api/settings').send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /* ──────────── Validation ──────────── */

  describe('Validation — Zod schema enforcement', () => {
    it('should reject plagiarismThreshold below 0', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject plagiarismThreshold above 100', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 150 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject titleSimilarityThreshold above 1', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ titleSimilarityThreshold: 1.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject titleSimilarityThreshold below 0', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ titleSimilarityThreshold: -0.1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject maxFileSize below 1KB', async () => {
      const res = await instructorAgent.put('/api/settings').send({ maxFileSize: 500 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject maxFileSize above 100MB', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ maxFileSize: 200 * 1024 * 1024 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject systemAnnouncement over 500 characters', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: 'X'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unknown fields (.strict())', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 80, unknownField: 'hack' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-boolean maintenanceMode', async () => {
      const res = await instructorAgent.put('/api/settings').send({ maintenanceMode: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept boundary value — plagiarismThreshold 0', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.plagiarismThreshold).toBe(0);
    });

    it('should accept boundary value — plagiarismThreshold 100', async () => {
      const res = await instructorAgent.put('/api/settings').send({ plagiarismThreshold: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.plagiarismThreshold).toBe(100);
    });

    it('should accept boundary value — titleSimilarityThreshold 0', async () => {
      const res = await instructorAgent.put('/api/settings').send({ titleSimilarityThreshold: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.titleSimilarityThreshold).toBe(0);
    });

    it('should accept boundary value — titleSimilarityThreshold 1', async () => {
      const res = await instructorAgent.put('/api/settings').send({ titleSimilarityThreshold: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.titleSimilarityThreshold).toBe(1);
    });
  });

  /* ──────────── TC-SET-002: Announcement Display ──────────── */

  describe('TC-SET-002 — Announcement visible on dashboards', () => {
    it('should update system announcement and retrieve it', async () => {
      const announcementText = 'System maintenance scheduled for tonight 10 PM - 2 AM EST';

      // Instructor updates the announcement
      const updateRes = await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: announcementText });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.systemAnnouncement).toBe(announcementText);

      // Student should see the announcement when calling GET /api/settings
      const studentRes = await studentAgent.get('/api/settings');
      expect(studentRes.status).toBe(200);
      expect(studentRes.body.data.systemAnnouncement).toBe(announcementText);
    });

    it('should clear announcement when set to empty string', async () => {
      // First set an announcement
      await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: 'Important notice' });

      // Then clear it
      const res = await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: '' });

      expect(res.status).toBe(200);
      expect(res.body.data.systemAnnouncement).toBe('');

      // Verify it's cleared
      const getRes = await studentAgent.get('/api/settings');
      expect(getRes.body.data.systemAnnouncement).toBe('');
    });

    it('should allow 500-character announcement at max boundary', async () => {
      const maxAnnouncement = 'A'.repeat(500);

      const res = await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: maxAnnouncement });

      expect(res.status).toBe(200);
      expect(res.body.data.systemAnnouncement).toBe(maxAnnouncement);
      expect(res.body.data.systemAnnouncement.length).toBe(500);
    });
  });

  /* ──────────── TC-SET-003: Maintenance Mode Enforcement ──────────── */

  describe('TC-SET-003 — Maintenance mode blocks non-instructors with 503', () => {
    it('should enable maintenance mode via settings', async () => {
      const res = await instructorAgent.put('/api/settings').send({ maintenanceMode: true });

      expect(res.status).toBe(200);
      expect(res.body.data.maintenanceMode).toBe(true);
    });

    it('should return 503 Service Unavailable for students when maintenance mode is on', async () => {
      // Enable maintenance mode first
      await instructorAgent.put('/api/settings').send({ maintenanceMode: true });

      // Give the setting time to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to access dashboard as student — should get 503
      const res = await studentAgent.get('/api/dashboard');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return 503 for advisers when maintenance mode is on', async () => {
      // Enable maintenance mode
      await instructorAgent.put('/api/settings').send({ maintenanceMode: true });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to access dashboard as adviser
      const res = await adviserAgent.get('/api/dashboard');

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should allow instructors to access dashboard even when maintenance mode is on', async () => {
      // Enable maintenance mode
      await instructorAgent.put('/api/settings').send({ maintenanceMode: true });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Instructor should still be able to access
      const res = await instructorAgent.get('/api/dashboard');

      // Should NOT be 503
      expect(res.status).not.toBe(503);
    });

    it('should block non-instructors from submissions when maintenance mode is on', async () => {
      // Enable maintenance mode
      await instructorAgent.put('/api/settings').send({ maintenanceMode: true });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Student tries to access submissions
      const res = await studentAgent.get('/api/submissions');

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should disable maintenance mode and restore access', async () => {
      // First enable
      await instructorAgent.put('/api/settings').send({ maintenanceMode: true });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Student should be blocked
      let res = await studentAgent.get('/api/dashboard');
      expect(res.status).toBe(503);

      // Now disable
      await instructorAgent.put('/api/settings').send({ maintenanceMode: false });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Student should be allowed through
      res = await studentAgent.get('/api/dashboard');
      expect(res.status).not.toBe(503);
    });
  });
});
