import { beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createAuthenticatedUserWithRole } from '../helpers.js';
import AuditLog from '../../modules/audit/audit.model.js';

describe('Audit TC integration coverage', () => {
  let instructorAgent;
  let studentAgent;
  let projectId;

  beforeEach(async () => {
    const { agent, user } = await createAuthenticatedUserWithRole('instructor', {
      email: 'audit-tc-instructor@test.com',
    });
    const { agent: student } = await createAuthenticatedUserWithRole('student', {
      email: 'audit-tc-student@test.com',
    });

    instructorAgent = agent;
    studentAgent = student;
    projectId = new mongoose.Types.ObjectId();

    await AuditLog.deleteMany({});

    await AuditLog.insertMany([
      {
        action: 'login.success',
        actor: user._id,
        actorRole: 'instructor',
        targetType: 'User',
        description: 'Instructor logged in',
        createdAt: new Date('2026-04-05T09:00:00.000Z'),
      },
      {
        action: 'project.updated',
        actor: user._id,
        actorRole: 'instructor',
        targetType: 'Project',
        targetId: projectId.toString(),
        description: 'Updated project title',
        createdAt: new Date('2026-04-07T11:00:00.000Z'),
      },
      {
        action: 'project.phase_advanced',
        actor: user._id,
        actorRole: 'instructor',
        targetType: 'Project',
        targetId: projectId.toString(),
        description: 'Advanced project phase',
        createdAt: new Date('2026-04-09T10:30:00.000Z'),
      },
    ]);
  });

  it('TC-AUDIT-001: instructor can view audit logs list', async () => {
    const res = await instructorAgent.get('/api/audit');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });

  it('TC-AUDIT-002: keyword search works via action filter (login)', async () => {
    const res = await instructorAgent.get('/api/audit').query({ action: 'login' });

    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(1);
    expect(res.body.data.logs[0].action).toContain('login');
  });

  it('TC-AUDIT-003: date range filter works with startDate/endDate', async () => {
    const res = await instructorAgent.get('/api/audit').query({
      startDate: '2026-04-06',
      endDate: '2026-04-09',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBe(2);
    expect(res.body.data.logs.every((log) => log.targetType === 'Project')).toBe(true);
  });

  it('TC-AUDIT-004: project entity history endpoint returns all changes', async () => {
    const res = await instructorAgent.get(`/api/audit/Project/${projectId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.every((log) => log.targetId === projectId.toString())).toBe(true);
  });

  it('TC-AUDIT-004: student is denied project entity history access', async () => {
    const res = await studentAgent.get(`/api/audit/Project/${projectId}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
