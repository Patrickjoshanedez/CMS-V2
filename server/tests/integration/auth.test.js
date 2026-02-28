import { describe, it, expect } from 'vitest';
import {
  request,
  createAgent,
  createVerifiedUser,
  createAuthenticatedAgent,
} from '../helpers.js';
import User from '../../modules/users/user.model.js';

/**
 * Auth flow integration tests — covers registration, login, token refresh,
 * logout, and error-path validation.
 *
 * Addresses: S4-GAP-05 (auth e2e), S4-GAP-12 (auth integration).
 */

describe('Auth API — /api/auth', () => {
  // ----- REGISTRATION -----

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'Alice Doe',
        email: 'alice@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.isVerified).toBe(false);
      // Password must never be exposed in the response
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email with 409', async () => {
      await request.post('/api/auth/register').send({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      const res = await request.post('/api/auth/register').send({
        name: 'Bob Again',
        email: 'bob@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid input with 400', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'X', // too short (min 2)
        email: 'not-an-email',
        password: 'weak',
        confirmPassword: 'mismatch',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields with 400', async () => {
      const res = await request.post('/api/auth/register').send({});
      expect(res.status).toBe(400);
    });
  });

  // ----- LOGIN -----

  describe('POST /api/auth/login', () => {
    it('should login a verified user and set cookies', async () => {
      await createVerifiedUser({ email: 'login@example.com' });

      const res = await request.post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();

      // Should set accessToken and refreshToken cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('accessToken');
      expect(cookieStr).toContain('refreshToken');
    });

    it('should reject unverified user with 401', async () => {
      await request.post('/api/auth/register').send({
        name: 'Unverified',
        email: 'unverified@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      const res = await request.post('/api/auth/login').send({
        email: 'unverified@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject wrong password with 401', async () => {
      await createVerifiedUser({ email: 'wrongpw@example.com' });

      const res = await request.post('/api/auth/login').send({
        email: 'wrongpw@example.com',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent email with 401', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
    });
  });

  // ----- TOKEN REFRESH -----

  describe('POST /api/auth/refresh', () => {
    it('should issue a new access token with valid refresh token', async () => {
      const { agent } = await createAuthenticatedAgent({
        email: 'refresh@example.com',
      });

      const res = await agent.post('/api/auth/refresh');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // New cookies should be set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should reject when no refresh token is provided', async () => {
      const res = await request.post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ----- LOGOUT -----

  describe('POST /api/auth/logout', () => {
    it('should logout an authenticated user and clear cookies', async () => {
      const { agent } = await createAuthenticatedAgent({
        email: 'logout@example.com',
      });

      const res = await agent.post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // After logout, accessing a protected route should fail
      const protectedRes = await agent.get('/api/users/me');
      expect(protectedRes.status).toBe(401);
    });

    it('should reject unauthenticated logout with 401', async () => {
      const res = await request.post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  // ----- GET CURRENT USER -----

  describe('GET /api/users/me', () => {
    it('should return the current authenticated user', async () => {
      const { agent } = await createAuthenticatedAgent({
        email: 'me@example.com',
        name: 'Current User',
      });

      const res = await agent.get('/api/users/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@example.com');
      expect(res.body.data.user.name).toBe('Current User');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request.get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  // ----- HEALTH CHECK (sanity) -----

  describe('GET /api/health', () => {
    it('should return 200 with success message', async () => {
      const res = await request.get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/running/i);
    });
  });
});
