import teamService from './team.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/**
 * TeamController — Thin handlers delegating to TeamService.
 */

/** POST /api/teams — Create a new project team (Student only) */
export const createTeam = catchAsync(async (req, res) => {
  const { team } = await teamService.createTeam(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Team created successfully.',
    data: { team },
  });
});

/** GET /api/teams/me — Get current student's team */
export const getMyTeam = catchAsync(async (req, res) => {
  try {
    const { team } = await teamService.getMyTeam(req.user._id);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { team },
    });
  } catch (error) {
    if (error?.code === 'NO_TEAM' || error?.code === 'TEAM_NOT_FOUND') {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { team: null },
      });
    }

    throw error;
  }
});

/** POST /api/teams/:id/invite — Invite a student to the team (Leader only) */
export const inviteMember = catchAsync(async (req, res) => {
  const { invite, invitedUser, emailSent, reusedInvite } = await teamService.inviteMember(
    req.params.id,
    req.user._id,
    req.body,
  );
  const invitedUserName = invitedUser?.fullName || invitedUser?.email || 'the user';
  const statusCode = reusedInvite ? HTTP_STATUS.OK : HTTP_STATUS.CREATED;

  const message = emailSent
    ? reusedInvite
      ? `Existing invitation for ${invitedUserName} was re-sent.`
      : `You have successfully invited ${invitedUserName} to the team.`
    : reusedInvite
      ? `Existing invitation for ${invitedUserName} is active, but email delivery failed. The in-app notification was sent.`
      : `Invitation created for ${invitedUserName}, but email delivery failed. The in-app notification was sent.`;

  res.status(statusCode).json({
    success: true,
    message,
    data: { invite, invitedUser, emailSent, reusedInvite },
  });
});

/** POST /api/teams/:id/bulk-invite — Bulk invite students to the team (Leader only) */
export const bulkInviteMembers = catchAsync(async (req, res) => {
  const { results, summary } = await teamService.bulkInviteMembers(
    req.params.id,
    req.user._id,
    req.body,
  );

  const statusCode = summary.succeeded > 0 ? HTTP_STATUS.CREATED : HTTP_STATUS.BAD_REQUEST;
  const message =
    summary.failed === 0
      ? `Successfully sent ${summary.succeeded} invitation${summary.succeeded === 1 ? '' : 's'}.`
      : summary.succeeded === 0
        ? `Failed to send invitations. None of the ${summary.failed} invited student(s) could be invited.`
        : `Sent ${summary.succeeded} invitation${summary.succeeded === 1 ? '' : 's'}, but ${summary.failed} could not be completed.`;

  res.status(statusCode).json({
    success: summary.succeeded > 0,
    message,
    data: { results, summary },
  });
});

/** GET /api/teams/:id/invite-candidates — Search invite candidate students (Leader only) */
export const listInviteCandidates = catchAsync(async (req, res) => {
  const { candidates } = await teamService.listInviteCandidates(
    req.params.id,
    req.user._id,
    req.query,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { candidates },
  });
});

/** GET /api/teams/invite-candidates/preview — Search invite candidates before creating a team */
export const listCreateTeamInviteCandidates = catchAsync(async (req, res) => {
  const { candidates } = await teamService.listCreateTeamInviteCandidates(req.user._id, req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { candidates },
  });
});

/** POST /api/teams/invites/:token/accept — Accept a team invitation */
export const acceptInvite = catchAsync(async (req, res) => {
  const { team } = await teamService.acceptInvite(req.params.token, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'You have joined the team.',
    data: { team },
  });
});

/** POST /api/teams/invites/:token/decline — Decline a team invitation */
export const declineInvite = catchAsync(async (req, res) => {
  await teamService.declineInvite(req.params.token, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Invitation declined.',
  });
});

/** PATCH /api/teams/:id/members/:memberId/role — Assign role for a team member (Leader only) */
export const assignMemberRole = catchAsync(async (req, res) => {
  const { team } = await teamService.assignMemberRole(
    req.params.id,
    req.user._id,
    req.params.memberId,
    req.body.role || '',
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team member role updated successfully.',
    data: { team },
  });
});

/** PATCH /api/teams/:id/members/:memberId/leader — Transfer team leadership (Leader only) */
export const transferLeadership = catchAsync(async (req, res) => {
  const { team } = await teamService.transferLeadership(
    req.params.id,
    req.user._id,
    req.params.memberId,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team leadership transferred successfully.',
    data: { team },
  });
});

/** PATCH /api/teams/:id/google-doc-link — Attach or clear team Google Docs link (Leader only) */
export const updateGoogleDocLink = catchAsync(async (req, res) => {
  const { team } = await teamService.updateGoogleDocLink(
    req.params.id,
    req.user._id,
    req.body.googleDocUrl || '',
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team Google Docs link updated successfully.',
    data: { team },
  });
});

/** PATCH /api/teams/:id/github-link — Attach or clear team GitHub link (Leader only) */
export const updateGithubLink = catchAsync(async (req, res) => {
  const { team } = await teamService.updateGithubLink(
    req.params.id,
    req.user._id,
    req.body.githubUrl || '',
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team GitHub repository link updated successfully.',
    data: { team },
  });
});

/** PATCH /api/teams/:id/lock — Finalize a team (Leader only) */
export const lockTeam = catchAsync(async (req, res) => {
  const { team } = await teamService.lockTeam(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team finalized successfully.',
    data: { team },
  });
});

/** DELETE /api/teams/:id/members/me — Leave team (member only, not finalized) */
export const leaveTeam = catchAsync(async (req, res) => {
  const { team } = await teamService.leaveTeam(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'You have left the team successfully.',
    data: { team },
  });
});

/** GET /api/teams — List all teams (Instructor/Adviser) */
export const listTeams = catchAsync(async (req, res) => {
  const { teams, pagination } = await teamService.listTeams(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { teams, pagination },
  });
});

/** PUT /api/teams/:id/committee — Assign faculty committee (Instructor only) */
export const assignCommittee = catchAsync(async (req, res) => {
  const { team, message } = await teamService.assignCommittee(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data: { team },
  });
});

/** GET /api/teams/:id/manuscript-template — Get dynamic manuscript template with title defense gating */
export const getTeamManuscriptTemplate = catchAsync(async (req, res) => {
  const result = await teamService.getTeamManuscriptTemplate(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});

/** PUT /api/teams/manuscript-template — Update dynamic manuscript template (Instructor only) */
export const updateManuscriptTemplate = catchAsync(async (req, res) => {
  const template = await teamService.updateManuscriptTemplate(req.body, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Institutional manuscript template updated successfully.',
    data: { template },
  });
});
