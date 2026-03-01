import { Router } from 'express';
import * as userController from './user.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import auditLog from '../../middleware/auditLog.js';
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
  auditLog('user.created', 'User', {
    getTargetId: (_req, body) => body?.data?._id,
    getDescription: (req) => `Created user ${req.body.email} with role ${req.body.role}`,
    getMetadata: (req) => ({ email: req.body.email, role: req.body.role }),
  }),
  userController.createUser,
);

router.patch(
  '/:id',
  authorize(ROLES.INSTRUCTOR),
  validate(updateUserSchema),
  auditLog('user.updated', 'User', {
    getDescription: (req) => `Updated user ${req.params.id}`,
  }),
  userController.updateUser,
);

router.patch(
  '/:id/role',
  authorize(ROLES.INSTRUCTOR),
  validate(changeRoleSchema),
  auditLog('user.role_changed', 'User', {
    getDescription: (req) => `Changed role for user ${req.params.id} to ${req.body.role}`,
    getMetadata: (req) => ({ newRole: req.body.role }),
  }),
  userController.changeRole,
);

router.delete(
  '/:id',
  authorize(ROLES.INSTRUCTOR),
  auditLog('user.deactivated', 'User', {
    getDescription: (req) => `Deactivated user ${req.params.id}`,
  }),
  userController.deleteUser,
);

export default router;
