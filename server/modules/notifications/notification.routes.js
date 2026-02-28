import { Router } from 'express';
import * as notificationController from './notification.controller.js';
import authenticate from '../../middleware/authenticate.js';

const router = Router();

/**
 * Notification routes — /api/notifications
 * All routes require authentication.
 */
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.clearAll);

export default router;
