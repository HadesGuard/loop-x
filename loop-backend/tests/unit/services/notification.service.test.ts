import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock websocket service
vi.mock('../../../src/services/websocket.service', () => ({
  getWebSocketService: vi.fn().mockReturnValue(null),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('2 hours ago'),
}));

import { NotificationService } from '../../../src/services/notification.service';
import { prisma } from '../../../src/config/database';
import { getWebSocketService } from '../../../src/services/websocket.service';

const mockPrisma = vi.mocked(prisma);
const notificationService = new NotificationService();

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'like',
  actorId: 'actor-1',
  videoId: 'video-1',
  commentId: null,
  message: null,
  read: false,
  createdAt: new Date('2024-01-01'),
  actor: {
    id: 'actor-1',
    username: 'actor_user',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  video: {
    id: 'video-1',
    thumbnailUrl: 'https://example.com/thumb.jpg',
  },
  comment: null,
};

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification as any);

      const result = await notificationService.createNotification({
        userId: 'user-1',
        type: 'like',
        actorId: 'actor-1',
        videoId: 'video-1',
      });

      expect(result).toBeTruthy();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'like',
            actorId: 'actor-1',
            videoId: 'video-1',
          }),
        })
      );
    });

    it('should not create notification when actor is the user', async () => {
      const result = await notificationService.createNotification({
        userId: 'user-1',
        type: 'like',
        actorId: 'user-1',
        videoId: 'video-1',
      });

      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should emit WebSocket notification when service available', async () => {
      const mockEmit = vi.fn();
      vi.mocked(getWebSocketService).mockReturnValue({
        emitNotification: mockEmit,
      } as any);

      mockPrisma.notification.create.mockResolvedValue(mockNotification as any);

      await notificationService.createNotification({
        userId: 'user-1',
        type: 'like',
        actorId: 'actor-1',
        videoId: 'video-1',
      });

      expect(mockEmit).toHaveBeenCalledWith('user-1', expect.objectContaining({
        id: 'notif-1',
        type: 'like',
      }));
    });

    it('should return null on error (non-critical)', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      const result = await notificationService.createNotification({
        userId: 'user-1',
        type: 'like',
        actorId: 'actor-1',
      });

      expect(result).toBeNull();
    });

    it('should create notification with comment', async () => {
      const notifWithComment = {
        ...mockNotification,
        type: 'comment',
        commentId: 'comment-1',
        comment: { id: 'comment-1', text: 'Nice video!' },
      };
      mockPrisma.notification.create.mockResolvedValue(notifWithComment as any);

      const result = await notificationService.createNotification({
        userId: 'user-1',
        type: 'comment',
        actorId: 'actor-1',
        videoId: 'video-1',
        commentId: 'comment-1',
      });

      expect(result).toBeTruthy();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commentId: 'comment-1',
          }),
        })
      );
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification] as any);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await notificationService.getNotifications('user-1');

      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20, hasMore: false });
    });

    it('should filter by type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await notificationService.getNotifications('user-1', { type: 'follow' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', type: 'follow' }),
        })
      );
    });

    it('should handle pagination with hasMore', async () => {
      // Return limit+1 items to indicate hasMore
      const manyNotifs = Array.from({ length: 21 }, (_, i) => ({
        ...mockNotification,
        id: `notif-${i}`,
      }));
      mockPrisma.notification.findMany.mockResolvedValue(manyNotifs as any);
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await notificationService.getNotifications('user-1', { page: 1, limit: 20 });

      expect(result.notifications).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should format action text for each notification type', async () => {
      const types = ['like', 'comment', 'follow', 'reply', 'mention'];
      const expectedActions = [
        'liked your video',
        'commented on your video',
        'started following you',
        'replied to your comment',
        'mentioned you',
      ];

      for (let i = 0; i < types.length; i++) {
        mockPrisma.notification.findMany.mockResolvedValue([
          { ...mockNotification, type: types[i] },
        ] as any);
        mockPrisma.notification.count.mockResolvedValue(0);

        const result = await notificationService.getNotifications('user-1');
        expect(result.notifications[0].action).toBe(expectedActions[i]);
      }
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        read: false,
      } as any);
      mockPrisma.notification.update.mockResolvedValue({} as any);

      await notificationService.markAsRead('user-1', 'notif-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      });
    });

    it('should throw if notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead('user-1', 'non-existent')
      ).rejects.toThrow(AppError);
    });

    it('should throw if notification belongs to another user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
        read: false,
      } as any);

      await expect(
        notificationService.markAsRead('user-1', 'notif-1')
      ).rejects.toThrow(AppError);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 } as any);

      await notificationService.markAllAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
    });
  });
});
