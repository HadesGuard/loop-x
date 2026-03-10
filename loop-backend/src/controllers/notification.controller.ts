import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { notificationService } from '../services/notification.service';
import { NotificationType } from '../services/notification.service';

/**
 * GET /notifications
 * Get user notifications
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { page, limit, type } = req.query;

  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 20;
  const typeFilter = type ? (type as NotificationType) : undefined;

  const result = await notificationService.getNotifications(userId, {
    page: pageNum,
    limit: limitNum,
    type: typeFilter,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: notificationId } = req.params;

  await notificationService.markAsRead(userId, notificationId);

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
};

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await notificationService.markAllAsRead(userId);

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
};
