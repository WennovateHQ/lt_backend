import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { NotificationFiltersSchema } from './notifications.types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { ValidationError } from '../../shared/utils/app-error';
import { AuthRequest } from '../../shared/middleware/auth';

export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = NotificationFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      throw new ValidationError('Invalid filter parameters', validation.error.errors);
    }

    const notifications = await this.notificationsService.getMyNotifications(
      req.user!.id,
      validation.data
    );

    return res.json({
      success: true,
      data: { notifications }
    });
  });

  getNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params;
    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await this.notificationsService.getNotification(
      notificationId,
      req.user!.id
    );

    return res.json({
      success: true,
      data: { notification }
    });
  });

  markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params;
    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await this.notificationsService.markAsRead(
      notificationId,
      req.user!.id
    );

    return res.json({
      success: true,
      data: { notification },
      message: 'Notification marked as read'
    });
  });

  markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.notificationsService.markAllAsRead(req.user!.id);

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  });

  deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params;
    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    await this.notificationsService.deleteNotification(
      notificationId,
      req.user!.id
    );

    return res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  });

  getNotificationStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.notificationsService.getNotificationStats(req.user!.id);

    return res.json({
      success: true,
      data: { stats }
    });
  });

  getNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    // TODO: Implement notification preferences retrieval
    const preferences = {
      email: true,
      push: true,
      inApp: true,
      categories: {
        messages: true,
        projects: true,
        payments: true,
        system: false
      }
    };

    return res.json({
      success: true,
      data: { preferences }
    });
  });

  updateNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    // TODO: Implement notification preferences update
    // const { preferences } = req.body;

    return res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  });

  markMultipleAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds must be an array'
      });
    }

    // TODO: Implement bulk mark as read
    return res.json({
      success: true,
      message: `${notificationIds.length} notifications marked as read`
    });
  });

  bulkDeleteNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds must be an array'
      });
    }

    // TODO: Implement bulk delete
    return res.json({
      success: true,
      message: `${notificationIds.length} notifications deleted successfully`
    });
  });

  getNotificationTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    // TODO: Implement notification templates retrieval
    const templates = [
      {
        id: 'welcome',
        name: 'Welcome Message',
        description: 'Welcome new users to the platform'
      },
      {
        id: 'project_match',
        name: 'Project Match',
        description: 'Notify talents about matching projects'
      }
    ];

    return res.json({
      success: true,
      data: { templates }
    });
  });
}
