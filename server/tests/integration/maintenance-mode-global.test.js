import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthenticatedUserWithRole } from '../helpers.js';

describe('Maintenance mode global enforcement', () => {
  let instructorAgent;
  let studentAgent;

  beforeEach(async () => {
    const instructor = await createAuthenticatedUserWithRole('instructor', {
      email: 'maintenance-inst@test.com',
    });
    const student = await createAuthenticatedUserWithRole('student', {
      email: 'maintenance-student@test.com',
    });

    instructorAgent = instructor.agent;
    studentAgent = student.agent;
  });

  it('TC-SET-003: blocks non-instructor from authenticated API routes when maintenance mode is enabled', async () => {
    const updateRes = await instructorAgent.put('/api/settings').send({ maintenanceMode: true });
    expect(updateRes.status).toBe(200);

    const studentDashboardRes = await studentAgent.get('/api/dashboard');
    expect(studentDashboardRes.status).toBe(503);
    expect(studentDashboardRes.body.error.code).toBe('SERVICE_UNAVAILABLE');

    const instructorDashboardRes = await instructorAgent.get('/api/dashboard');
    expect(instructorDashboardRes.status).not.toBe(503);
  });

  it('TC-SET-004: keeps PUT /api/settings instructor-only', async () => {
    const res = await studentAgent.put('/api/settings').send({ plagiarismThreshold: 55 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
