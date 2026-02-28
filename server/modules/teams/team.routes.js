import { Router } from 'express';
import * as teamController from './team.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  createTeamSchema,
  inviteMemberSchema,
  listTeamsQuerySchema,
} from './team.validation.js';

const router = Router();

/**
 * Team routes — /api/teams
 * All routes require authentication.
 */
router.use(authenticate);

// --- Student team routes ---
router.post(
  '/',
  authorize(ROLES.STUDENT),
  validate(createTeamSchema),
  teamController.createTeam,
);

router.get('/me', teamController.getMyTeam);

router.post(
  '/:id/invite',
  authorize(ROLES.STUDENT),
  validate(inviteMemberSchema),
  teamController.inviteMember,
);

// --- Invite response routes (any authenticated student) ---
router.post('/invites/:token/accept', teamController.acceptInvite);
router.post('/invites/:token/decline', teamController.declineInvite);

// --- Team lock route (Leader or Instructor) ---
router.patch('/:id/lock', teamController.lockTeam);

// --- Instructor/Adviser listing route ---
router.get(
  '/',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(listTeamsQuerySchema, 'query'),
  teamController.listTeams,
);

export default router;
