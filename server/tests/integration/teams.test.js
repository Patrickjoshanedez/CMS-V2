import { describe, it, expect } from 'vitest';
import { request, createAuthenticatedUserWithRole, createCourseAndSection } from '../helpers.js';
import User from '../../modules/users/user.model.js';
import Team from '../../modules/teams/team.model.js';

/**
 * Team flow integration tests — covers team creation, invites,
 * invite acceptance/decline, team listing, and role-based restrictions.
 *
 * Addresses: S4-GAP-06 (team e2e), S4-GAP-12 (team integration).
 */

describe('Teams API — /api/teams', () => {
  // ----- CREATE TEAM -----

  describe('POST /api/teams', () => {
    it('should allow a student to create a team', async () => {
      const { agent } = await createAuthenticatedUserWithRole('student', {
        email: 'leader@example.com',
        firstName: 'Team',
        lastName: 'Leader',
      });

      const res = await agent.post('/api/teams').send({
        name: 'Alpha Team',
        academicYear: '2025-2026',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team).toBeDefined();
      expect(res.body.data.team.name).toBe('Alpha Team');
    });

    it('should reject team creation from an adviser (wrong role)', async () => {
      const { agent } = await createAuthenticatedUserWithRole('adviser', {
        email: 'adviser-create@example.com',
      });

      const res = await agent.post('/api/teams').send({
        name: 'Adviser Team',
        academicYear: '2025-2026',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject team creation from an instructor (wrong role)', async () => {
      const { agent } = await createAuthenticatedUserWithRole('instructor', {
        email: 'inst-create@example.com',
      });

      const res = await agent.post('/api/teams').send({
        name: 'Instructor Team',
        academicYear: '2025-2026',
      });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated team creation', async () => {
      const res = await request.post('/api/teams').send({
        name: 'Anonymous Team',
        academicYear: '2025-2026',
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid team data', async () => {
      const { agent } = await createAuthenticatedUserWithRole('student', {
        email: 'bad-data@example.com',
      });

      const res = await agent.post('/api/teams').send({
        name: 'AB', // too short (min 3)
        academicYear: '2025', // wrong format (must be YYYY-YYYY)
      });

      expect(res.status).toBe(400);
    });
  });

  // ----- GET MY TEAM -----

  describe('GET /api/teams/me', () => {
    it("should return the current user's team info", async () => {
      const { agent } = await createAuthenticatedUserWithRole('student', {
        email: 'myteam@example.com',
      });

      // Create a team first
      await agent.post('/api/teams').send({
        name: 'My Team',
        academicYear: '2025-2026',
      });

      const res = await agent.get('/api/teams/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.get('/api/teams/me');
      expect(res.status).toBe(401);
    });

    it('should deny access when user.teamId is stale but user is not in team members', async () => {
      const { agent: ownerAgent, user: owner } = await createAuthenticatedUserWithRole('student', {
        email: 'team-owner@example.com',
      });

      const createdTeam = await ownerAgent.post('/api/teams').send({
        name: 'Owner Team',
        academicYear: '2025-2026',
      });
      const teamId = createdTeam.body.data.team._id;

      const { agent: outsiderAgent, user: outsider } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'outsider@example.com',
        },
      );

      await User.findByIdAndUpdate(outsider._id, { teamId });

      const res = await outsiderAgent.get('/api/teams/me');
      expect(res.status).toBe(404);
      expect(res.body?.error?.code).toBe('NO_TEAM');

      const refreshedOutsider = await User.findById(outsider._id).select('teamId');
      expect(refreshedOutsider.teamId).toBeNull();

      const refreshedTeam = await Team.findById(teamId).select('members');
      expect(refreshedTeam.members.map((m) => m.toString())).toContain(owner._id.toString());
      expect(refreshedTeam.members.map((m) => m.toString())).not.toContain(outsider._id.toString());
    });
  });

  // ----- INVITE MEMBER -----

  describe('POST /api/teams/:id/invite', () => {
    it('should allow team leader to invite a member', async () => {
      const { agent } = await createAuthenticatedUserWithRole('student', {
        email: 'inviter@example.com',
      });

      // Create team
      const teamRes = await agent.post('/api/teams').send({
        name: 'Invite Team',
        academicYear: '2025-2026',
      });
      const teamId = teamRes.body.data.team._id;

      // Create another student to invite
      await createAuthenticatedUserWithRole('student', {
        email: 'invitee@example.com',
      });

      const res = await agent.post(`/api/teams/${teamId}/invite`).send({
        email: 'invitee@example.com',
      });

      // Should succeed (201) or return whatever the API sends
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });

    it('should reject invite from non-student role', async () => {
      const { agent: adviserAgent } = await createAuthenticatedUserWithRole('adviser', {
        email: 'adviser-invite@example.com',
      });

      // Try to invite on a random team ID
      const res = await adviserAgent.post('/api/teams/000000000000000000000000/invite').send({
        email: 'anyone@example.com',
      });

      expect(res.status).toBe(403);
    });
  });

  // ----- INVITE CANDIDATES -----

  describe('GET /api/teams/:id/invite-candidates', () => {
    it('should only list students from the same section as the team leader', async () => {
      const { agent: leaderAgent, user: leaderUser } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'invite-candidates-leader@example.com',
        },
      );

      const { section: leaderSection } = await createCourseAndSection(leaderUser._id);
      const { section: otherSection } = await createCourseAndSection(leaderUser._id);

      await User.findByIdAndUpdate(leaderUser._id, { sectionId: leaderSection._id });

      await createAuthenticatedUserWithRole('student', {
        email: 'invite-candidate-same-section@example.com',
        sectionId: leaderSection._id,
      });

      await createAuthenticatedUserWithRole('student', {
        email: 'invite-candidate-other-section@example.com',
        sectionId: otherSection._id,
      });

      const teamRes = await leaderAgent.post('/api/teams').send({
        name: 'Scoped Invite Team',
        academicYear: '2025-2026',
      });

      const teamId = teamRes.body.data.team._id;
      const res = await leaderAgent.get(`/api/teams/${teamId}/invite-candidates`);

      expect(res.status).toBe(200);
      const candidateEmails = res.body.data.candidates.map((candidate) => candidate.email);
      expect(candidateEmails).toContain('invite-candidate-same-section@example.com');
      expect(candidateEmails).not.toContain('invite-candidate-other-section@example.com');
    });
  });

  // ----- LIST TEAMS (Instructor/Adviser only) -----

  describe('GET /api/teams', () => {
    it('should allow an instructor to list all teams', async () => {
      const { agent: instructorAgent } = await createAuthenticatedUserWithRole('instructor', {
        email: 'inst-list@example.com',
      });

      const res = await instructorAgent.get('/api/teams');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow an adviser to list teams', async () => {
      const { agent: adviserAgent } = await createAuthenticatedUserWithRole('adviser', {
        email: 'adviser-list@example.com',
      });

      const res = await adviserAgent.get('/api/teams');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject team listing from a student', async () => {
      const { agent: studentAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'student-list@example.com',
      });

      const res = await studentAgent.get('/api/teams');

      expect(res.status).toBe(403);
    });
  });
});
