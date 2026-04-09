import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import auditRequestCapture from '../../middleware/auditRequestCapture.js';
import AuditLog from '../../modules/audit/audit.model.js';

function buildApp({ withUser = true, routePath, method = 'post', statusCode = 200 } = {}) {
  const app = express();

  if (withUser) {
    app.use((req, res, next) => {
      req.user = {
        _id: new mongoose.Types.ObjectId(),
        role: 'student',
      };
      next();
    });
  }

  app.use(auditRequestCapture);

  app[method](routePath, (req, res) => {
    res.status(statusCode).json({ ok: true });
  });

  return app;
}

async function waitForLogCount(expectedCount, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const count = await AuditLog.countDocuments({});
    if (count === expectedCount) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('auditRequestCapture middleware', () => {
  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  afterEach(async () => {
    await AuditLog.deleteMany({});
  });

  it('redacts sensitive team invite token path in metadata and description', async () => {
    const sensitiveToken = 'VerySensitiveInviteTokenABC1234567890';
    const app = buildApp({
      routePath: `/api/teams/invites/${sensitiveToken}/accept`,
      method: 'post',
      statusCode: 200,
    });

    const res = await request(app).post(`/api/teams/invites/${sensitiveToken}/accept`);

    expect(res.status).toBe(200);
    await waitForLogCount(1);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.path).toBe('/api/teams/invites/[REDACTED]/accept');
    expect(logs[0].description).toContain('/api/teams/invites/[REDACTED]/accept');
    expect(logs[0].description).not.toContain(sensitiveToken);
  });

  it('suppresses duplicate capture for non-plagiarism submissions routes', async () => {
    const app = buildApp({
      routePath: '/api/submissions/507f191e810c19729de860ea/grade',
      method: 'patch',
      statusCode: 200,
    });

    const res = await request(app).patch('/api/submissions/507f191e810c19729de860ea/grade');

    expect(res.status).toBe(200);
    await waitForLogCount(0);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(0);
  });

  it('redacts JWT-like path segments in metadata and description', async () => {
    const jwtLikeSegment =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.c29tZV9wYXlsb2FkX2RhdGFfZm9yX3Rlc3Rpbmc.c2lnbmF0dXJlX3NlZ21lbnRfZm9yX3Rlc3Rpbmc';
    const app = buildApp({
      routePath: `/api/auth/reset/${jwtLikeSegment}`,
      method: 'post',
      statusCode: 200,
    });

    const res = await request(app).post(`/api/auth/reset/${jwtLikeSegment}`);

    expect(res.status).toBe(200);
    await waitForLogCount(1);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.path).toBe('/api/auth/reset/[REDACTED]');
    expect(logs[0].description).toContain('/api/auth/reset/[REDACTED]');
    expect(logs[0].description).not.toContain(jwtLikeSegment);
  });

  it('redacts long opaque token-like segments in metadata and description', async () => {
    const longOpaqueToken = 'OpaqueTokenPathSegmentZ9Y8X7W6V5U4T3S2R1Q0';
    const app = buildApp({
      routePath: `/api/auth/session/${longOpaqueToken}/revoke`,
      method: 'delete',
      statusCode: 200,
    });

    const res = await request(app).delete(`/api/auth/session/${longOpaqueToken}/revoke`);

    expect(res.status).toBe(200);
    await waitForLogCount(1);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.path).toBe('/api/auth/session/[REDACTED]/revoke');
    expect(logs[0].description).toContain('/api/auth/session/[REDACTED]/revoke');
    expect(logs[0].description).not.toContain(longOpaqueToken);
  });

  it('captures submissions plagiarism routes exactly once', async () => {
    const app = buildApp({
      routePath: '/api/submissions/507f191e810c19729de860ea/plagiarism/check',
      method: 'post',
      statusCode: 200,
    });

    const res = await request(app).post(
      '/api/submissions/507f191e810c19729de860ea/plagiarism/check',
    );

    expect(res.status).toBe(200);
    await waitForLogCount(1);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('http.post');
    expect(logs[0].metadata.path).toBe(
      '/api/submissions/507f191e810c19729de860ea/plagiarism/check',
    );
  });

  it('captures allowed resource mutation once with expected http.* action', async () => {
    const app = buildApp({
      routePath: '/api/auth/logout',
      method: 'post',
      statusCode: 200,
    });

    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    await waitForLogCount(1);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('http.post');
    expect(logs[0].metadata.path).toBe('/api/auth/logout');
    expect(logs[0].metadata.method).toBe('POST');
    expect(logs[0].metadata.statusCode).toBe(200);
  });

  it('does not log failed responses or successful responses without req.user', async () => {
    const failedApp = buildApp({
      routePath: '/api/auth/logout',
      method: 'post',
      statusCode: 500,
    });

    const noUserApp = buildApp({
      withUser: false,
      routePath: '/api/auth/logout',
      method: 'post',
      statusCode: 200,
    });

    const failedRes = await request(failedApp).post('/api/auth/logout');
    expect(failedRes.status).toBe(500);

    const noUserRes = await request(noUserApp).post('/api/auth/logout');
    expect(noUserRes.status).toBe(200);

    await waitForLogCount(0);

    const logs = await AuditLog.find({}).lean();
    expect(logs).toHaveLength(0);
  });
});
