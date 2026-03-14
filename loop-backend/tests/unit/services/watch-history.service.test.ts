import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
    },
    watchHistory: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('3 minutes ago'),
}));

import { WatchHistoryService } from '../../../src/services/watch-history.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);

describe('WatchHistoryService', () => {
  let watchHistoryService: WatchHistoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    watchHistoryService = new WatchHistoryService();
  });

  describe('addToHistory', () => {
    it('should upsert watch history when video exists', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: 'video-1' } as any);
      mockPrisma.watchHistory.upsert.mockResolvedValue({} as any);

      await watchHistoryService.addToHistory('user-1', 'video-1', 45);

      expect(mockPrisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'video-1' },
      });
      expect(mockPrisma.watchHistory.upsert).toHaveBeenCalledWith({
        where: {
          userId_videoId: {
            userId: 'user-1',
            videoId: 'video-1',
          },
        },
        update: {
          watchedDuration: 45,
          createdAt: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          videoId: 'video-1',
          watchedDuration: 45,
        },
      });
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(
        watchHistoryService.addToHistory('user-1', 'missing-video', 10),
      ).rejects.toThrow(AppError);

      try {
        await watchHistoryService.addToHistory('user-1', 'missing-video', 10);
        expect.fail('Expected AppError');
      } catch (error: any) {
        expect(error.code).toBe('VIDEO_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }

      expect(mockPrisma.watchHistory.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return formatted watch history with pagination', async () => {
      const now = new Date('2026-03-13T12:00:00.000Z');
      const historyRecords = [
        {
          id: 'h1',
          watchedDuration: 30,
          createdAt: now,
          video: {
            id: 'v1',
            thumbnailUrl: 'thumb-1.jpg',
            title: 'Video 1',
            description: 'Desc 1',
            duration: 60,
            views: BigInt(100),
            likesCount: 10,
            user: {
              id: 'u2',
              username: 'creator1',
              avatarUrl: 'avatar-1.jpg',
              isVerified: true,
            },
          },
        },
        {
          id: 'h2',
          watchedDuration: 15,
          createdAt: now,
          video: {
            id: 'v2',
            thumbnailUrl: null,
            title: 'Video 2',
            description: 'Desc 2',
            duration: 22,
            views: BigInt(200),
            likesCount: 20,
            user: {
              id: 'u3',
              username: 'creator2',
              avatarUrl: null,
              isVerified: false,
            },
          },
        },
        {
          id: 'h3',
          watchedDuration: 50,
          createdAt: now,
          video: {
            id: 'v3',
            thumbnailUrl: 'thumb-3.jpg',
            title: 'Video 3',
            description: 'Desc 3',
            duration: 120,
            views: BigInt(300),
            likesCount: 30,
            user: {
              id: 'u4',
              username: 'creator3',
              avatarUrl: 'avatar-3.jpg',
              isVerified: true,
            },
          },
        },
      ];

      mockPrisma.watchHistory.findMany.mockResolvedValue(historyRecords as any);

      const result = await watchHistoryService.getHistory('user-1', { page: 1, limit: 2 });

      expect(mockPrisma.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 3,
        }),
      );

      expect(result.history).toHaveLength(2);
      expect(result.history[0]).toEqual(
        expect.objectContaining({
          id: 'h1',
          watchedDuration: 30,
          watchedAt: '3 minutes ago',
          createdAt: now.toISOString(),
          video: expect.objectContaining({
            id: 'v1',
            views: 100,
            user: expect.objectContaining({
              username: '@creator1',
            }),
          }),
        }),
      );
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        hasMore: true,
      });
    });
  });

  describe('history cleanup', () => {
    it('should clear all history for a user', async () => {
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 4 } as any);

      await watchHistoryService.clearHistory('user-1');

      expect(mockPrisma.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should remove one video from history', async () => {
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 1 } as any);

      await watchHistoryService.removeFromHistory('user-1', 'video-1');

      expect(mockPrisma.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          videoId: 'video-1',
        },
      });
    });
  });
});
