import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { authenticate } from '../../shared/middleware/auth';
import { apiLimiter } from '../../shared/middleware/rate-limiter';
import { prisma } from '../../config/database';

const router = Router();

// Initialize service and controller
const notificationsService = new NotificationsService(prisma);
const notificationsController = new NotificationsController(notificationsService);

// Apply authentication to all routes
router.use(authenticate);

// Notification routes
router.get(
  '/my/notifications',
  apiLimiter,
  notificationsController.getMyNotifications
);

router.get(
  '/stats',
  apiLimiter,
  notificationsController.getNotificationStats
);

router.patch(
  '/mark-all-read',
  apiLimiter,
  notificationsController.markAllAsRead
);

router.get(
  '/:notificationId',
  apiLimiter,
  notificationsController.getNotification
);

router.patch(
  '/:notificationId/read',
  apiLimiter,
  notificationsController.markAsRead
);

router.delete(
  '/:notificationId',
  apiLimiter,
  notificationsController.deleteNotification
);

// Notification Preferences
router.get(
  '/preferences',
  apiLimiter,
  notificationsController.getNotificationPreferences
);

router.put(
  '/preferences',
  apiLimiter,
  notificationsController.updateNotificationPreferences
);

// Bulk Operations
router.post(
  '/mark-read',
  apiLimiter,
  notificationsController.markMultipleAsRead
);

router.delete(
  '/bulk-delete',
  apiLimiter,
  notificationsController.bulkDeleteNotifications
);

// Notification Templates (Admin)
router.get(
  '/templates',
  apiLimiter,
  notificationsController.getNotificationTemplates
);

export default router;
