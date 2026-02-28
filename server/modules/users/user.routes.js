import { Router } from 'express';
import * as userController from './user.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changeRoleSchema,
  listUsersQuerySchema,
} from './user.validation.js';

const router = Router();

/**
 * User routes — /api/users
 * All routes require authentication.
 * Management routes (CRUD on other users) are Instructor-only.
 */

// All routes below require authentication
router.use(authenticate);

// --- Self-service profile routes (any authenticated user) ---
router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);

// --- Instructor-only user management routes ---
router.get(
  '/',
  authorize(ROLES.INSTRUCTOR),
  validate(listUsersQuerySchema, 'query'),
  userController.listUsers,
);

router.post(
  '/',
  authorize(ROLES.INSTRUCTOR),
  validate(createUserSchema),
  userController.createUser,
);

router.patch(
  '/:id',
  authorize(ROLES.INSTRUCTOR),
  validate(updateUserSchema),
  userController.updateUser,
);

router.patch(
  '/:id/role',
  authorize(ROLES.INSTRUCTOR),
  validate(changeRoleSchema),
  userController.changeRole,
);

router.delete(
  '/:id',
  authorize(ROLES.INSTRUCTOR),
  userController.deleteUser,
);

export default router;
