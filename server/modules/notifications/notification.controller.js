import notificationService from './notification.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/**
 * NotificationController — Thin handlers delegating to NotificationService.
 */

/** GET /api/notifications — Get paginated notifications */
export const getNotifications = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const { notifications, unreadCount, pagination } = await notificationService.getNotifications(
    req.user._id,
    { page, limit },
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { notifications, unreadCount, pagination },
  });
});

/** PATCH /api/notifications/:id/read — Mark a single notification as read */
export const markAsRead = catchAsync(async (req, res) => {
  const { notification } = await notificationService.markAsRead(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { notification },
  });
});

/** PATCH /api/notifications/read-all — Mark all notifications as read */
export const markAllAsRead = catchAsync(async (req, res) => {
  const { modifiedCount } = await notificationService.markAllAsRead(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `${modifiedCount} notification(s) marked as read.`,
  });
});

/** DELETE /api/notifications/:id — Delete a single notification */
export const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Notification deleted.',
  });
});

/** DELETE /api/notifications — Clear all notifications */
export const clearAll = catchAsync(async (req, res) => {
  const { deletedCount } = await notificationService.clearAll(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `${deletedCount} notification(s) deleted.`,
  });
});
