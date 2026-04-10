import { describe, it, expect } from 'vitest';
import { request, createAuthenticatedUserWithRole, createCourseAndSection } from '../helpers.js';
import User from '../../modules/users/user.model.js';
import Team from '../../modules/teams/team.model.js';
import TeamInvite from '../../modules/teams/teamInvite.model.js';

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

  // ----- INVITE ACCEPT / DECLINE -----

  describe('POST /api/teams/invites/:token/(accept|decline)', () => {
    it('TC-TEAM-003 should allow invited student to accept invite and join the team', async () => {
      const { agent: instructorAgent, user: instructor } = await createAuthenticatedUserWithRole(
        'instructor',
        {
          email: 'tc-team-003-instructor@example.com',
        },
      );

      const { section } = await createCourseAndSection(instructor._id);

      const { agent: leaderAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-003-leader@example.com',
      });

      const { agent: inviteeAgent, user: invitee } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'tc-team-003-invitee@example.com',
          sectionId: section._id,
          instructorId: instructor._id,
        },
      );

      const teamRes = await leaderAgent.post('/api/teams').send({
        name: 'TC Team 003',
        academicYear: '2025-2026',
      });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await leaderAgent.post(`/api/teams/${teamId}/invite`).send({
        email: 'tc-team-003-invitee@example.com',
      });

      expect(inviteRes.status).toBe(201);
      const inviteToken = inviteRes.body.data.invite.token;

      const acceptRes = await inviteeAgent.post(`/api/teams/invites/${inviteToken}/accept`).send({});

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.data.team._id.toString()).toBe(teamId.toString());

      const refreshedInvite = await TeamInvite.findById(inviteRes.body.data.invite._id);
      expect(refreshedInvite.status).toBe('accepted');

      const refreshedInvitee = await User.findById(invitee._id).select('teamId');
      expect(refreshedInvitee.teamId.toString()).toBe(teamId.toString());

      const refreshedTeam = await Team.findById(teamId).select('members');
      expect(refreshedTeam.members.map((memberId) => memberId.toString())).toContain(
        invitee._id.toString(),
      );

      // Keep linter quiet for intentionally created auth principal used as adviser reference.
      expect(instructorAgent).toBeDefined();
    });

    it('TC-TEAM-004 should allow invited student to decline invite without joining team', async () => {
      const { agent: leaderAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-004-leader@example.com',
      });

      const { agent: inviteeAgent, user: invitee } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'tc-team-004-invitee@example.com',
        },
      );

      const teamRes = await leaderAgent.post('/api/teams').send({
        name: 'TC Team 004',
        academicYear: '2025-2026',
      });
      const teamId = teamRes.body.data.team._id;

      const inviteRes = await leaderAgent.post(`/api/teams/${teamId}/invite`).send({
        email: 'tc-team-004-invitee@example.com',
      });

      expect(inviteRes.status).toBe(201);
      const inviteToken = inviteRes.body.data.invite.token;

      const declineRes = await inviteeAgent.post(`/api/teams/invites/${inviteToken}/decline`).send({});

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.success).toBe(true);

      const refreshedInvite = await TeamInvite.findById(inviteRes.body.data.invite._id);
      expect(refreshedInvite.status).toBe('declined');

      const refreshedInvitee = await User.findById(invitee._id).select('teamId');
      expect(refreshedInvitee.teamId).toBeNull();

      const refreshedTeam = await Team.findById(teamId).select('members');
      expect(refreshedTeam.members.map((memberId) => memberId.toString())).not.toContain(
        invitee._id.toString(),
      );
    });

    it('TC-TEAM-006 should transfer team leadership to a selected member and keep the old leader in the team', async () => {
      const { agent: instructorAgent, user: instructor } = await createAuthenticatedUserWithRole(
        'instructor',
        {
          email: 'tc-team-006-instructor@example.com',
        },
      );

      const { section } = await createCourseAndSection(instructor._id);

      const { agent: leaderAgent, user: leader } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'tc-team-006-leader@example.com',
          sectionId: section._id,
          instructorId: instructor._id,
        },
      );

      const { user: selectedMember } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-006-selected-member@example.com',
        sectionId: section._id,
        instructorId: instructor._id,
      });

      const teamRes = await leaderAgent.post('/api/teams').send({
        name: 'TC Team 006',
        academicYear: '2025-2026',
      });
      const teamId = teamRes.body.data.team._id;

      await Team.findByIdAndUpdate(teamId, { $addToSet: { members: selectedMember._id } });
      await User.findByIdAndUpdate(selectedMember._id, { teamId });

      const transferRes = await leaderAgent
        .patch(`/api/teams/${teamId}/members/${selectedMember._id}/leader`)
        .send({});

      expect(transferRes.status).toBe(200);
      expect(transferRes.body.success).toBe(true);
      expect(transferRes.body.data.team.leaderId._id.toString()).toBe(selectedMember._id.toString());

      const refreshedTeam = await Team.findById(teamId).select('leaderId members');
      const refreshedMemberIds = refreshedTeam.members.map((memberId) => memberId.toString());

      expect(refreshedTeam.leaderId.toString()).toBe(selectedMember._id.toString());
      expect(refreshedMemberIds).toContain(leader._id.toString());
      expect(refreshedMemberIds).toContain(selectedMember._id.toString());

      const refreshedLeader = await User.findById(leader._id).select('teamId');
      const refreshedSelectedMember = await User.findById(selectedMember._id).select('teamId');
      expect(refreshedLeader.teamId.toString()).toBe(teamId.toString());
      expect(refreshedSelectedMember.teamId.toString()).toBe(teamId.toString());

      expect(instructorAgent).toBeDefined();
    });

    it('TC-TEAM-010 should enforce one-team-per-student invariant when invitee already belongs to original team', async () => {
      const { user: instructor } = await createAuthenticatedUserWithRole('instructor', {
        email: 'tc-team-010-instructor@example.com',
      });

      const { section } = await createCourseAndSection(instructor._id);

      const { agent: occupiedAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-010-occupied@example.com',
        sectionId: section._id,
        instructorId: instructor._id,
      });

      const existingTeamRes = await occupiedAgent.post('/api/teams').send({
        name: 'TC Team 010 Existing',
        academicYear: '2025-2026',
      });
      const originalTeamId = existingTeamRes.body.data.team._id;

      const { agent: invitingLeaderAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-010-inviting-leader@example.com',
      });

      const invitingTeamRes = await invitingLeaderAgent.post('/api/teams').send({
        name: 'TC Team 010 Inviting',
        academicYear: '2025-2026',
      });

      const invitingTeamId = invitingTeamRes.body.data.team._id;
      const inviteRes = await invitingLeaderAgent.post(`/api/teams/${invitingTeamId}/invite`).send({
        email: 'tc-team-010-occupied@example.com',
      });
      expect(inviteRes.status).toBe(201);

      const inviteToken = inviteRes.body.data.invite.token;
      const acceptRes = await occupiedAgent.post(`/api/teams/invites/${inviteToken}/accept`).send({});

      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.success).toBe(false);
      expect(acceptRes.body.error.code).toBe('ALREADY_IN_TEAM');
      expect(acceptRes.body.error.message).toBe('You are already a member of a team');

      const refreshedOccupiedUser = await User.findOne({ email: 'tc-team-010-occupied@example.com' });
      expect(refreshedOccupiedUser.teamId.toString()).toBe(originalTeamId.toString());

      const refreshedOriginalTeam = await Team.findById(originalTeamId).select('members');
      expect(refreshedOriginalTeam.members.map((memberId) => memberId.toString())).toContain(
        refreshedOccupiedUser._id.toString(),
      );

      const refreshedInvitingTeam = await Team.findById(invitingTeamId).select('members');
      expect(refreshedInvitingTeam.members.map((memberId) => memberId.toString())).not.toContain(
        refreshedOccupiedUser._id.toString(),
      );
    });

    it('should reject invite acceptance when user.teamId is null but user exists in another team members', async () => {
      const { user: instructor } = await createAuthenticatedUserWithRole('instructor', {
        email: 'stale-membership-instructor@example.com',
      });

      const { section } = await createCourseAndSection(instructor._id);

      const { agent: sourceLeaderAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'stale-membership-source-leader@example.com',
      });

      const { agent: targetLeaderAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'stale-membership-target-leader@example.com',
      });

      const { agent: inviteeAgent, user: invitee } = await createAuthenticatedUserWithRole('student', {
        email: 'stale-membership-invitee@example.com',
        sectionId: section._id,
        instructorId: instructor._id,
      });

      const sourceTeamRes = await sourceLeaderAgent.post('/api/teams').send({
        name: 'Stale Membership Source',
        academicYear: '2025-2026',
      });
      const sourceTeamId = sourceTeamRes.body.data.team._id;

      await Team.findByIdAndUpdate(sourceTeamId, { $addToSet: { members: invitee._id } });
      await User.findByIdAndUpdate(invitee._id, { teamId: null });

      const targetTeamRes = await targetLeaderAgent.post('/api/teams').send({
        name: 'Stale Membership Target',
        academicYear: '2025-2026',
      });
      const targetTeamId = targetTeamRes.body.data.team._id;

      const inviteRes = await targetLeaderAgent.post(`/api/teams/${targetTeamId}/invite`).send({
        email: 'stale-membership-invitee@example.com',
      });
      expect(inviteRes.status).toBe(201);

      const inviteToken = inviteRes.body.data.invite.token;
      const acceptRes = await inviteeAgent.post(`/api/teams/invites/${inviteToken}/accept`).send({});

      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.success).toBe(false);
      expect(acceptRes.body.error.code).toBe('ALREADY_IN_TEAM');
      expect(acceptRes.body.error.message).toBe('You are already a member of a team');

      const refreshedInvitee = await User.findById(invitee._id).select('teamId');
      expect(refreshedInvitee.teamId).toBeNull();

      const refreshedTargetTeam = await Team.findById(targetTeamId).select('members');
      expect(refreshedTargetTeam.members.map((memberId) => memberId.toString())).not.toContain(
        invitee._id.toString(),
      );

      const refreshedSourceTeam = await Team.findById(sourceTeamId).select('members');
      expect(refreshedSourceTeam.members.map((memberId) => memberId.toString())).toContain(
        invitee._id.toString(),
      );
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

    it('TC-TEAM-009 should exclude same-section students who are already in a team', async () => {
      const { agent: leaderAgent, user: leaderUser } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'tc-team-009-leader@example.com',
        },
      );

      const { section } = await createCourseAndSection(leaderUser._id);
      await User.findByIdAndUpdate(leaderUser._id, { sectionId: section._id });

      await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-009-eligible@example.com',
        sectionId: section._id,
      });

      const { agent: occupiedAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'tc-team-009-occupied@example.com',
        sectionId: section._id,
      });

      const leaderTeamRes = await leaderAgent.post('/api/teams').send({
        name: 'TC Team 009 Leader',
        academicYear: '2025-2026',
      });

      await occupiedAgent.post('/api/teams').send({
        name: 'TC Team 009 Occupied',
        academicYear: '2025-2026',
      });

      const leaderTeamId = leaderTeamRes.body.data.team._id;
      const res = await leaderAgent.get(`/api/teams/${leaderTeamId}/invite-candidates`);

      expect(res.status).toBe(200);
      const candidateEmails = res.body.data.candidates.map((candidate) => candidate.email);
      expect(candidateEmails).toContain('tc-team-009-eligible@example.com');
      expect(candidateEmails).not.toContain('tc-team-009-occupied@example.com');
    });

    it('should enforce no-team invariant even when using search query', async () => {
      const { agent: leaderAgent, user: leaderUser } = await createAuthenticatedUserWithRole(
        'student',
        {
          email: 'search-invariant-leader@example.com',
        },
      );

      const { section } = await createCourseAndSection(leaderUser._id);
      await User.findByIdAndUpdate(leaderUser._id, { sectionId: section._id });

      await createAuthenticatedUserWithRole('student', {
        email: 'searchinvariant.eligible@example.com',
        firstName: 'SearchInvariant',
        sectionId: section._id,
      });

      const { agent: occupiedAgent } = await createAuthenticatedUserWithRole('student', {
        email: 'searchinvariant.occupied@example.com',
        firstName: 'SearchInvariant',
        sectionId: section._id,
      });

      const leaderTeamRes = await leaderAgent.post('/api/teams').send({
        name: 'Search Invariant Leader Team',
        academicYear: '2025-2026',
      });
      const leaderTeamId = leaderTeamRes.body.data.team._id;

      await occupiedAgent.post('/api/teams').send({
        name: 'Search Invariant Occupied Team',
        academicYear: '2025-2026',
      });

      const res = await leaderAgent.get(
        `/api/teams/${leaderTeamId}/invite-candidates?search=SearchInvariant`,
      );

      expect(res.status).toBe(200);
      const candidateEmails = res.body.data.candidates.map((candidate) => candidate.email);
      expect(candidateEmails).toContain('searchinvariant.eligible@example.com');
      expect(candidateEmails).not.toContain('searchinvariant.occupied@example.com');
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
