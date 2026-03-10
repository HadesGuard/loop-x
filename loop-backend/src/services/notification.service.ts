import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { formatDistanceToNow } from 'date-fns';
import { getWebSocketService } from './websocket.service';

export type NotificationType = 'like' | 'comment' | 'follow' | 'reply' | 'mention';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  actorId: string;
  videoId?: string;
  commentId?: string;
  message?: string;
}

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(input: CreateNotificationInput) {
    // Don't notify yourself
    if (input.userId === input.actorId) {
      return null;
    }

    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          actorId: input.actorId,
          videoId: input.videoId,
          commentId: input.commentId,
          message: input.message,
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          video: {
            select: {
              id: true,
              thumbnailUrl: true,
            },
          },
          comment: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      });

      logger.info(`Notification created: ${notification.id} for user ${input.userId}`);

      // Emit notification via WebSocket if available
      const wsService = getWebSocketService();
      if (wsService) {
        // Format notification for WebSocket
        const formattedNotification = {
          id: notification.id,
          type: notification.type,
          username: `@${notification.actor.username}`,
          user: {
            id: notification.actor.id,
            username: `@${notification.actor.username}`,
            avatar: notification.actor.avatarUrl || null,
          },
          action: this.getActionText(notification.type as NotificationType),
          comment: notification.comment
            ? {
                id: notification.comment.id,
                text: notification.comment.text,
              }
            : null,
          video: notification.video
            ? {
                id: notification.video.id,
                thumbnail: notification.video.thumbnailUrl || null,
              }
            : null,
          timestamp: formatDistanceToNow(notification.createdAt, { addSuffix: true }),
          read: notification.read,
          createdAt: notification.createdAt.toISOString(),
        };

        wsService.emitNotification(input.userId, formattedNotification);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      // Don't throw error - notifications are non-critical
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
    } = {}
  ) {
    const { page = 1, limit = 20, type } = options;

    const where: any = {
      userId,
    };

    if (type) {
      where.type = type;
    }

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        video: {
          select: {
            id: true,
            thumbnailUrl: true,
          },
        },
        comment: {
          select: {
            id: true,
            text: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      skip: (page - 1) * limit,
    });

    const hasMore = notifications.length > limit;
    const notificationsToReturn = notifications.slice(0, limit);

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    // Format notifications
    const formattedNotifications = notificationsToReturn.map((notification) => {
      // Build action text based on type
      let action = '';
      switch (notification.type) {
        case 'like':
          action = 'liked your video';
          break;
        case 'comment':
          action = 'commented on your video';
          break;
        case 'follow':
          action = 'started following you';
          break;
        case 'reply':
          action = 'replied to your comment';
          break;
        case 'mention':
          action = 'mentioned you';
          break;
        default:
          action = 'interacted with you';
      }

      return {
        id: notification.id,
        type: notification.type,
        username: `@${notification.actor.username}`,
        user: {
          id: notification.actor.id,
          username: `@${notification.actor.username}`,
          avatar: notification.actor.avatarUrl || null,
        },
        action,
        comment: notification.comment
          ? {
              id: notification.comment.id,
              text: notification.comment.text,
            }
          : null,
        video: notification.video
          ? {
              id: notification.video.id,
              thumbnail: notification.video.thumbnailUrl || null,
            }
          : null,
        timestamp: formatDistanceToNow(notification.createdAt, { addSuffix: true }),
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      };
    });

    return {
      notifications: formattedNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    if (notification.userId !== userId) {
      throw new AppError('Not authorized', 403, 'UNAUTHORIZED');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    logger.info(`All notifications marked as read for user ${userId}`);
  }

  /**
   * Get action text based on notification type
   */
  private getActionText(type: NotificationType): string {
    switch (type) {
      case 'like':
        return 'liked your video';
      case 'comment':
        return 'commented on your video';
      case 'follow':
        return 'started following you';
      case 'reply':
        return 'replied to your comment';
      case 'mention':
        return 'mentioned you';
      default:
        return 'interacted with you';
    }
  }
}

export const notificationService = new NotificationService();

