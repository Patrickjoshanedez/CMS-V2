import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthenticatedUserWithRole, createAuthenticatedAgent } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import User from '../../modules/users/user.model.js';

/**
 * Dashboard API integration tests — validates role-aware statistics
 * for each of the four system roles (student, instructor, adviser, panelist).
 *
 * Sprint 7: Live Dashboard & Notification Integration.
 */

describe('Dashboard API — GET /api/dashboard/stats', () => {
  // ----- AUTH GUARD -----

  it('should reject unauthenticated requests with 401', async () => {
    const { default: supertest } = await import('supertest');
    const { default: app } = await import('../../app.js');
    const res = await supertest(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });

  // ----- STUDENT DASHBOARD -----

  describe('Student role', () => {
    it('should return student stats with null team/project when not in a team', async () => {
      const { agent } = await createAuthenticatedUserWithRole('student', {
        email: 'student-no-team@example.com',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('student');
      expect(res.body.data.team).toBeNull();
      expect(res.body.data.project).toBeNull();
      expect(res.body.data.chapterProgress).toEqual([]);
    });

    it('should return team and project info when student has a team', async () => {
      const { agent, user } = await createAuthenticatedUserWithRole('student', {
        email: 'student-team@example.com',
      });

      // Create a team with this student
      const team = await Team.create({
        name: 'Alpha Team',
        leaderId: user._id,
        members: [user._id],
        academicYear: '2024-2025',
        isLocked: false,
      });

      // Update user's teamId
      await User.findByIdAndUpdate(user._id, { teamId: team._id });

      // Create a project for the team
      const project = await Project.create({
        teamId: team._id,
        title: 'Dashboard Test Project Title',
        academicYear: '2024-2025',
        capstonePhase: 1,
      });

      // Create a submission for the project
      await Submission.create({
        projectId: project._id,
        chapter: 1,
        version: 1,
        fileName: 'chapter1.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'test/chapter1.pdf',
        submittedBy: user._id,
        status: 'approved',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('student');
      expect(res.body.data.team).toBeDefined();
      expect(res.body.data.team.name).toBe('Alpha Team');
      expect(res.body.data.team.memberCount).toBe(1);
      expect(res.body.data.project).toBeDefined();
      expect(res.body.data.project.title).toBe('Dashboard Test Project Title');
      // Chapter progress: Ch 1 should be approved, Ch 2-5 should be not_started
      expect(res.body.data.chapterProgress).toHaveLength(5);
      expect(res.body.data.chapterProgress[0].chapter).toBe(1);
      expect(res.body.data.chapterProgress[0].status).toBe('approved');
      expect(res.body.data.chapterProgress[1].status).toBe('not_started');
    });
  });

  // ----- INSTRUCTOR DASHBOARD -----

  describe('Instructor role', () => {
    it('should return system-wide counts and aggregations', async () => {
      const { agent } = await createAuthenticatedUserWithRole('instructor', {
        email: 'instructor-dash@example.com',
      });

      // Create some seed data
      const studentUser = await User.create({
        firstName: 'Seed',
        lastName: 'Student',
        email: 'seed-student@example.com',
        password: 'Password123',
        isVerified: true,
        role: 'student',
      });

      const team = await Team.create({
        name: 'Seed Team',
        leaderId: studentUser._id,
        members: [studentUser._id],
        academicYear: '2024-2025',
      });

      await Project.create({
        teamId: team._id,
        title: 'Seed Project For Instructor Stats',
        academicYear: '2024-2025',
        titleStatus: 'submitted',
        projectStatus: 'active',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('instructor');
      expect(res.body.data.counts).toBeDefined();
      expect(typeof res.body.data.counts.users).toBe('number');
      expect(typeof res.body.data.counts.teams).toBe('number');
      expect(typeof res.body.data.counts.projects).toBe('number');
      expect(res.body.data.counts.pendingTitles).toBeGreaterThanOrEqual(1);
      // Should include the pending title in the approvals list
      expect(res.body.data.pendingTitleApprovals.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.projectsByStatus).toBeDefined();
    });
  });

  // ----- ADVISER DASHBOARD -----

  describe('Adviser role', () => {
    it('should return assigned projects and pending reviews', async () => {
      const { agent, user: adviser } = await createAuthenticatedUserWithRole('adviser', {
        email: 'adviser-dash@example.com',
      });

      // Create a student + team + project assigned to this adviser
      const student = await User.create({
        firstName: 'Adv',
        lastName: 'Student',
        email: 'adv-student@example.com',
        password: 'Password123',
        isVerified: true,
        role: 'student',
      });

      const team = await Team.create({
        name: 'Adviser Test Team',
        leaderId: student._id,
        members: [student._id],
        academicYear: '2024-2025',
      });

      const project = await Project.create({
        teamId: team._id,
        title: 'Adviser Assigned Project Title',
        academicYear: '2024-2025',
        adviserId: adviser._id,
      });

      // Create a pending submission for this project
      await Submission.create({
        projectId: project._id,
        chapter: 2,
        version: 1,
        fileName: 'ch2.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        storageKey: 'test/ch2.pdf',
        submittedBy: student._id,
        status: 'pending',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('adviser');
      expect(res.body.data.counts.assignedProjects).toBe(1);
      expect(res.body.data.counts.pendingReviews).toBe(1);
      expect(res.body.data.assignedProjects).toHaveLength(1);
      expect(res.body.data.assignedProjects[0].title).toBe('Adviser Assigned Project Title');
      expect(res.body.data.pendingReviews).toHaveLength(1);
      expect(res.body.data.pendingReviews[0].chapter).toBe(2);
    });

    it('should return empty arrays when adviser has no assignments', async () => {
      const { agent } = await createAuthenticatedUserWithRole('adviser', {
        email: 'adviser-empty@example.com',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.counts.assignedProjects).toBe(0);
      expect(res.body.data.counts.pendingReviews).toBe(0);
      expect(res.body.data.assignedProjects).toEqual([]);
      expect(res.body.data.pendingReviews).toEqual([]);
    });
  });

  // ----- PANELIST DASHBOARD -----

  describe('Panelist role', () => {
    it('should return assigned projects for panelist', async () => {
      const { agent, user: panelist } = await createAuthenticatedUserWithRole('panelist', {
        email: 'panelist-dash@example.com',
      });

      const student = await User.create({
        firstName: 'Pan',
        lastName: 'Student',
        email: 'pan-student@example.com',
        password: 'Password123',
        isVerified: true,
        role: 'student',
      });

      const team = await Team.create({
        name: 'Panelist Test Team',
        leaderId: student._id,
        members: [student._id],
        academicYear: '2024-2025',
      });

      await Project.create({
        teamId: team._id,
        title: 'Panelist Review Project Title',
        academicYear: '2024-2025',
        panelistIds: [panelist._id],
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('panelist');
      expect(res.body.data.counts.assignedProjects).toBe(1);
      expect(res.body.data.assignedProjects).toHaveLength(1);
      expect(res.body.data.assignedProjects[0].teamName).toBe('Panelist Test Team');
    });

    it('should return empty when panelist has no assignments', async () => {
      const { agent } = await createAuthenticatedUserWithRole('panelist', {
        email: 'panelist-empty@example.com',
      });

      const res = await agent.get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.counts.assignedProjects).toBe(0);
      expect(res.body.data.assignedProjects).toEqual([]);
    });
  });
});

describe('Change Password API — POST /api/auth/change-password', () => {
  it('should reject unauthenticated requests with 401', async () => {
    const { default: supertest } = await import('supertest');
    const { default: app } = await import('../../app.js');
    const res = await supertest(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Password123', newPassword: 'NewPassword123' });
    expect(res.status).toBe(401);
  });

  it('should change password successfully with valid credentials', async () => {
    const { agent } = await createAuthenticatedAgent({
      email: 'changepw-ok@example.com',
    });

    const res = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password123',
      newPassword: 'NewPassword456',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject incorrect current password with 401', async () => {
    const { agent } = await createAuthenticatedAgent({
      email: 'changepw-wrong@example.com',
    });

    const res = await agent.post('/api/auth/change-password').send({
      currentPassword: 'WrongPassword999',
      newPassword: 'NewPassword456',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject reusing the current password with 400', async () => {
    const { agent } = await createAuthenticatedAgent({
      email: 'changepw-reuse@example.com',
    });

    const res = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password123',
      newPassword: 'Password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject weak new password with 400', async () => {
    const { agent } = await createAuthenticatedAgent({
      email: 'changepw-weak@example.com',
    });

    const res = await agent.post('/api/auth/change-password').send({
      currentPassword: 'Password123',
      newPassword: 'weak',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing fields with 400', async () => {
    const { agent } = await createAuthenticatedAgent({
      email: 'changepw-missing@example.com',
    });

    const res = await agent.post('/api/auth/change-password').send({});
    expect(res.status).toBe(400);
  });
});
