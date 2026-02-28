import supertest from 'supertest';
import app from '../app.js';
import User from '../modules/users/user.model.js';
import OTP from '../modules/auth/otp.model.js';
import bcrypt from 'bcrypt';

/**
 * Test helpers for server integration / e2e tests.
 *
 * Provides utility functions to quickly create users, generate access tokens,
 * and bypass OTP verification for faster test flows.
 */

/** Pre-configured supertest agent that preserves cookies across requests */
export const createAgent = () => supertest.agent(app);

/** Simple request helper (no cookie persistence) */
export const request = supertest(app);

/**
 * Register a user, verify their OTP, and return the user document.
 * Bypasses email by reading the OTP directly from the in-memory DB.
 *
 * @param {Object} overrides - Override default user fields
 * @returns {Promise<Object>} The created & verified user document
 */
export async function createVerifiedUser(overrides = {}) {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };

  // Register via API
  await request.post('/api/auth/register').send(userData);

  // Read the plaintext OTP — we need to grab it before hashing.
  // Since the OTP is hashed on save, we intercept by finding the record and
  // using bcrypt to verify a brute-force of 6-digit codes. Instead, we'll
  // directly verify the user in the DB (faster and more reliable for tests).
  await User.findOneAndUpdate({ email: userData.email }, { isVerified: true });

  const user = await User.findOne({ email: userData.email });
  // Clean up OTPs
  await OTP.deleteMany({ email: userData.email });

  return user;
}

/**
 * Create a verified user and log them in, returning the agent with auth cookies.
 *
 * @param {Object} overrides - Override default user fields
 * @returns {Promise<{ agent: supertest.SuperAgentTest, user: Object, cookies: string[] }>}
 */
export async function createAuthenticatedAgent(overrides = {}) {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };

  const user = await createVerifiedUser(overrides);

  const agent = createAgent();

  const loginRes = await agent.post('/api/auth/login').send({
    email: userData.email,
    password: userData.password,
  });

  return {
    agent,
    user,
    loginResponse: loginRes,
    cookies: loginRes.headers['set-cookie'] || [],
  };
}

/**
 * Create a user with a specific role, verified and authenticated.
 *
 * @param {'student'|'adviser'|'panelist'|'instructor'} role
 * @param {Object} overrides
 * @returns {Promise<{ agent: supertest.SuperAgentTest, user: Object }>}
 */
export async function createAuthenticatedUserWithRole(role, overrides = {}) {
  const email = `${role}@example.com`;
  const userData = {
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    email,
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };

  // Register and verify
  await request.post('/api/auth/register').send(userData);
  await User.findOneAndUpdate({ email: userData.email }, { isVerified: true, role });
  await OTP.deleteMany({ email: userData.email });

  // Login
  const agent = createAgent();
  await agent.post('/api/auth/login').send({
    email: userData.email,
    password: userData.password,
  });

  const user = await User.findOne({ email: userData.email });
  return { agent, user };
}
