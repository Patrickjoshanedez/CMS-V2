import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../modules/users/user.model.js';

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

const buildUniqueEmail = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

/**
 * Register a user, verify their OTP, and return the user document.
 * Bypasses email by reading the OTP directly from the in-memory DB.
 *
 * @param {Object} overrides - Override default user fields
 * @returns {Promise<Object>} The created & verified user document
 */
export async function createVerifiedUser(overrides = {}) {
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    email: buildUniqueEmail('test-user'),
    password: 'Password123',
    confirmPassword: 'Password123',
    isVerified: true,
    ...overrides,
  };

  return User.create({
    firstName: userData.firstName,
    middleName: userData.middleName,
    lastName: userData.lastName,
    email: userData.email,
    password: userData.password,
    authProvider: userData.authProvider,
    role: userData.role,
    isVerified: userData.isVerified,
    isActive: userData.isActive,
    teamId: userData.teamId,
    sectionId: userData.sectionId,
    instructorId: userData.instructorId,
    profilePicture: userData.profilePicture,
    lastLoginAt: userData.lastLoginAt,
  });
}

/**
 * Create a verified user and log them in, returning the agent with auth cookies.
 *
 * @param {Object} overrides - Override default user fields
 * @returns {Promise<{ agent: supertest.SuperAgentTest, user: Object, cookies: string[] }>}
 */
export async function createAuthenticatedAgent(overrides = {}) {
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    email: buildUniqueEmail('test-user'),
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };

  const user = await createVerifiedUser(userData);

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
  const email = overrides.email || buildUniqueEmail(role);
  const userData = {
    firstName: 'Test',
    lastName: role.charAt(0).toUpperCase() + role.slice(1),
    email,
    password: 'Password123',
    confirmPassword: 'Password123',
    role,
    isVerified: true,
    ...overrides,
  };

  const user = await createVerifiedUser(userData);

  // Login
  const agent = createAgent();
  await agent.post('/api/auth/login').send({
    email: userData.email,
    password: userData.password,
  });

  return { agent, user };
}

import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import Team from '../modules/teams/team.model.js';

export async function createCourseAndSection(userId) {
  const course = await Course.create({
    name: 'Auto Generated Test Course',
    code: 'AUTO' + Date.now().toString().slice(-4),
    createdBy: userId,
  });
  const section = await Section.create({
    name: 'Auto Section A',
    code: 'SEC' + Date.now().toString().slice(-4),
    courseId: course._id,
    academicYear: '2024-2025',
    createdBy: userId,
  });
  return { course, section };
}

export function createValidProjectPayload(teamId, courseId, sectionId, members = []) {
  const leaderId = members[0] || new mongoose.Types.ObjectId();
  const title = 'Capstone Management System with Plagiarism Checker';
  const buildProposal = (proposalTitle, index) => ({
    title: proposalTitle,
    description: `Detailed description for proposal ${index + 1} focusing on scope, objectives, and implementation approach.`,
    capstoneType: 'Web Application',
    sdgTags: ['SDG 4: Quality Education'],
  });

  const proposalTitles = [
    title,
    'Capstone Management System with Plagiarism Checker 1',
    'Capstone Management System with Plagiarism Checker 2',
    'Capstone Management System with Plagiarism Checker 3',
    'Capstone Management System with Plagiarism Checker 4',
    'Capstone Management System with Plagiarism Checker 5',
  ];

  return {
    teamId,
    courseId,
    sectionId,
    title,
    titleProposals: proposalTitles.map(buildProposal),
    abstract: 'A web-based system for managing capstone projects.',
    keywords: ['capstone', 'plagiarism', 'management'],
    sdgTags: ['SDG 4: Quality Education'],
    academicYear: '2024-2025',
    memberRoleAssignments: members.map((mId, i) => ({
      userId: mId,
      professionalTitle: i === 0 ? 'Lead Developer' : 'Technical Lead / Analyst',
      traditionalRole: i === 0 ? 'Programmer' : 'Documentor',
      responsibilities: i === 0 ? 'System Logic' : 'Research',
    })),
  };
}
