import Notification from './notification.model.js';
import AppError from '../../utils/AppError.js';

/**
 * NotificationService — Business logic for in-app notifications.
 * Handles listing, reading, and clearing notifications for authenticated users.
 */
class NotificationService {
  /**
   * Get paginated notifications for a user.
   * @param {string} userId
   * @param {Object} query - { page, limit }
   * @returns {Object} { notifications, unreadCount, pagination }
   */
  async getNotifications(userId, query) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read.
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Object} { notification }
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
    }

    return { notification };
  }

  /**
   * Mark all notifications as read for a user.
   * @param {string} userId
   * @returns {Object} { modifiedCount }
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete a single notification.
   * @param {string} notificationId
   * @param {string} userId
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
    }
  }

  /**
   * Clear all notifications for a user.
   * @param {string} userId
   * @returns {Object} { deletedCount }
   */
  async clearAll(userId) {
    const result = await Notification.deleteMany({ userId });
    return { deletedCount: result.deletedCount };
  }
}

export default new NotificationService();
