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
  const { team } = await teamService.getMyTeam(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { team },
  });
});

/** POST /api/teams/:id/invite — Invite a student to the team (Leader only) */
export const inviteMember = catchAsync(async (req, res) => {
  const { invite } = await teamService.inviteMember(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Invitation sent successfully.',
    data: { invite },
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

/** PATCH /api/teams/:id/lock — Lock a team (Leader or Instructor) */
export const lockTeam = catchAsync(async (req, res) => {
  const { team } = await teamService.lockTeam(req.params.id, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Team locked successfully.',
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
