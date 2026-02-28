import { describe, it, expect } from 'vitest';
import {
  request,
  createAuthenticatedUserWithRole,
} from '../helpers.js';

/**
 * RBAC (Role-Based Access Control) security tests.
 *
 * Verifies that middleware-level role restrictions are enforced correctly:
 *   - Students cannot use instructor-only routes.
 *   - Advisers / panelists cannot use student-only routes.
 *   - Instructor-only endpoints reject non-instructor roles.
 *   - Unauthenticated requests to protected endpoints return 401.
 *
 * Addresses: S4-GAP-13 (RBAC security tests).
 */

// ── Instructor-only routes (User management) ────────────────────────────

describe('RBAC — Instructor-only routes', () => {
  const instructorRoutes = [
    { method: 'get', path: '/api/users' },
    { method: 'post', path: '/api/users' },
    { method: 'patch', path: '/api/users/000000000000000000000000' },
    { method: 'patch', path: '/api/users/000000000000000000000000/role' },
    { method: 'delete', path: '/api/users/000000000000000000000000' },
  ];

  describe('Student cannot access instructor routes', () => {
    instructorRoutes.forEach(({ method, path }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('student', {
          email: `stu-${method}-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send({});
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Adviser cannot access instructor routes', () => {
    instructorRoutes.forEach(({ method, path }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('adviser', {
          email: `adv-${method}-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send({});
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Panelist cannot access instructor routes', () => {
    instructorRoutes.forEach(({ method, path }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('panelist', {
          email: `pan-${method}-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send({});
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Instructor CAN access instructor routes (smoke)', () => {
    it('should allow GET /api/users', async () => {
      const { agent } = await createAuthenticatedUserWithRole('instructor', {
        email: 'inst-smoke@test.com',
      });

      const res = await agent.get('/api/users');
      expect(res.status).toBe(200);
    });
  });
});

// ── Student-only routes (Team creation / invite) ─────────────────────────

describe('RBAC — Student-only routes', () => {
  const studentRoutes = [
    { method: 'post', path: '/api/teams', body: { name: 'Test', academicYear: '2025-2026' } },
    { method: 'post', path: '/api/teams/000000000000000000000000/invite', body: { email: 'x@y.com' } },
  ];

  describe('Instructor cannot access student-only routes', () => {
    studentRoutes.forEach(({ method, path, body }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('instructor', {
          email: `inst-stu-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send(body);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('Adviser cannot access student-only routes', () => {
    studentRoutes.forEach(({ method, path, body }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('adviser', {
          email: `adv-stu-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send(body);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('Panelist cannot access student-only routes', () => {
    studentRoutes.forEach(({ method, path, body }) => {
      it(`should return 403 for ${method.toUpperCase()} ${path}`, async () => {
        const { agent } = await createAuthenticatedUserWithRole('panelist', {
          email: `pan-stu-${path.replace(/\//g, '-')}@test.com`,
        });

        const res = await agent[method](path).send(body);
        expect(res.status).toBe(403);
      });
    });
  });
});

// ── Instructor/Adviser route: GET /api/teams ────────────────────────────

describe('RBAC — GET /api/teams (instructor + adviser only)', () => {
  it('should return 403 for a student', async () => {
    const { agent } = await createAuthenticatedUserWithRole('student', {
      email: 'stu-list-teams@test.com',
    });

    const res = await agent.get('/api/teams');
    expect(res.status).toBe(403);
  });

  it('should return 403 for a panelist', async () => {
    const { agent } = await createAuthenticatedUserWithRole('panelist', {
      email: 'pan-list-teams@test.com',
    });

    const res = await agent.get('/api/teams');
    expect(res.status).toBe(403);
  });

  it('should allow an instructor', async () => {
    const { agent } = await createAuthenticatedUserWithRole('instructor', {
      email: 'inst-list-teams@test.com',
    });

    const res = await agent.get('/api/teams');
    expect(res.status).toBe(200);
  });

  it('should allow an adviser', async () => {
    const { agent } = await createAuthenticatedUserWithRole('adviser', {
      email: 'adv-list-teams@test.com',
    });

    const res = await agent.get('/api/teams');
    expect(res.status).toBe(200);
  });
});

// ── Unauthenticated access to protected routes ──────────────────────────

describe('RBAC — Unauthenticated 401 on protected endpoints', () => {
  const protectedEndpoints = [
    { method: 'get', path: '/api/users/me' },
    { method: 'patch', path: '/api/users/me' },
    { method: 'get', path: '/api/users' },
    { method: 'post', path: '/api/teams' },
    { method: 'get', path: '/api/teams/me' },
    { method: 'get', path: '/api/teams' },
    { method: 'get', path: '/api/notifications' },
    { method: 'post', path: '/api/auth/logout' },
  ];

  protectedEndpoints.forEach(({ method, path }) => {
    it(`should return 401 for ${method.toUpperCase()} ${path}`, async () => {
      const res = await request[method](path).send({});
      expect(res.status).toBe(401);
    });
  });
});
