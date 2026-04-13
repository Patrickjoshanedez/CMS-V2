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
  const { invite, invitedUser } = await teamService.inviteMember(
    req.params.id,
    req.user._id,
    req.body,
  );
  const invitedUserName = invitedUser?.fullName || invitedUser?.email || 'the user';

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: `You have successfully invited ${invitedUserName} to the team.`,
    data: { invite, invitedUser },
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
