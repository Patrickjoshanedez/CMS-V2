import userService from './user.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/**
 * UserController — Thin handlers that delegate to UserService.
 */

/** GET /api/users/me — Get current user's profile */
export const getMe = catchAsync(async (req, res) => {
  const { user } = await userService.getMe(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user },
  });
});

/** PATCH /api/users/me — Update current user's profile */
export const updateMe = catchAsync(async (req, res) => {
  const { user } = await userService.updateMe(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully.',
    data: { user },
  });
});

/** GET /api/users — List all users (Instructor only) */
export const listUsers = catchAsync(async (req, res) => {
  const { users, pagination } = await userService.listUsers(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { users, pagination },
  });
});

/** POST /api/users — Create a new user (Instructor only) */
export const createUser = catchAsync(async (req, res) => {
  const { user } = await userService.createUser(req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'User created successfully.',
    data: { user },
  });
});

/** PATCH /api/users/:id — Update a user (Instructor only) */
export const updateUser = catchAsync(async (req, res) => {
  const { user } = await userService.updateUser(req.params.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User updated successfully.',
    data: { user },
  });
});

/** PATCH /api/users/:id/role — Change a user's role (Instructor only) */
export const changeRole = catchAsync(async (req, res) => {
  const { user } = await userService.changeRole(req.params.id, req.body.role);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `User role updated to ${user.role}.`,
    data: { user },
  });
});

/** DELETE /api/users/:id — Soft-delete a user (Instructor only) */
export const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User deactivated successfully.',
  });
});
