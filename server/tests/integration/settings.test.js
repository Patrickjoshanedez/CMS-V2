import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthenticatedUserWithRole, request } from '../helpers.js';
import SystemSettings from '../../modules/settings/settings.model.js';

/* ═══════════════════════════════════════════════════════════════════
 *  System Settings API — /api/settings
 *
 *  Tests cover:
 *    1. GET  / — Any authenticated user can read settings
 *    2. PUT  / — Only Instructor can update settings
 *    3. Validation — Zod schema enforcement
 *    4. Authorization — Non-instructor roles are denied
 *    5. Default values — Singleton pattern with upsert
 * ═══════════════════════════════════════════════════════════════════ */

describe('System Settings API — /api/settings', () => {
  let instructorAgent, instructor;
  let studentAgent, student;
  let adviserAgent, adviser;

  beforeEach(async () => {
    const i = await createAuthenticatedUserWithRole('instructor', { email: 'settings-inst@test.com' });
    const s = await createAuthenticatedUserWithRole('student', { email: 'settings-stu@test.com' });
    const a = await createAuthenticatedUserWithRole('adviser', { email: 'settings-adv@test.com' });

    instructorAgent = i.agent;
    instructor = i.user;
    studentAgent = s.agent;
    student = s.user;
    adviserAgent = a.agent;
    adviser = a.user;
  });

  /* ──────────── GET /api/settings ──────────── */

  describe('GET /api/settings', () => {
    it('should return default settings when none have been set', async () => {
      const res = await instructorAgent.get('/api/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        plagiarismThreshold: 75,
        titleSimilarityThreshold: 0.65,
        maxFileSize: 25 * 1024 * 1024,
        systemAnnouncement: '',
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

  /* ──────────── PUT /api/settings ──────────── */

  describe('PUT /api/settings — Update settings', () => {
    it('should update plagiarism threshold as instructor', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 80 });

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
      const res = await instructorAgent
        .put('/api/settings')
        .send({ maxFileSize: newSize });

      expect(res.status).toBe(200);
      expect(res.body.data.maxFileSize).toBe(newSize);
    });

    it('should update system announcement', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ systemAnnouncement: 'Maintenance scheduled for tonight.' });

      expect(res.status).toBe(200);
      expect(res.body.data.systemAnnouncement).toBe('Maintenance scheduled for tonight.');
    });

    it('should update multiple fields at once', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({
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
      await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 65 });

      const res = await studentAgent.get('/api/settings');
      expect(res.body.data.plagiarismThreshold).toBe(65);
    });

    it('should not expose internal fields in response', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 70 });

      expect(res.body.data).not.toHaveProperty('_id');
      expect(res.body.data).not.toHaveProperty('key');
      expect(res.body.data).not.toHaveProperty('updatedBy');
      expect(res.body.data).not.toHaveProperty('__v');
    });
  });

  /* ──────────── Authorization ──────────── */

  describe('Authorization — non-instructor roles denied for PUT', () => {
    it('should reject student from updating settings', async () => {
      const res = await studentAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject adviser from updating settings', async () => {
      const res = await adviserAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated user from updating settings', async () => {
      const res = await request
        .put('/api/settings')
        .send({ plagiarismThreshold: 50 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /* ──────────── Validation ──────────── */

  describe('Validation — Zod schema enforcement', () => {
    it('should reject plagiarismThreshold below 0', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject plagiarismThreshold above 100', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 150 });

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
      const res = await instructorAgent
        .put('/api/settings')
        .send({ maxFileSize: 500 });

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

    it('should accept boundary value — plagiarismThreshold 0', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.plagiarismThreshold).toBe(0);
    });

    it('should accept boundary value — plagiarismThreshold 100', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ plagiarismThreshold: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.plagiarismThreshold).toBe(100);
    });

    it('should accept boundary value — titleSimilarityThreshold 0', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ titleSimilarityThreshold: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.titleSimilarityThreshold).toBe(0);
    });

    it('should accept boundary value — titleSimilarityThreshold 1', async () => {
      const res = await instructorAgent
        .put('/api/settings')
        .send({ titleSimilarityThreshold: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.titleSimilarityThreshold).toBe(1);
    });
  });
});
