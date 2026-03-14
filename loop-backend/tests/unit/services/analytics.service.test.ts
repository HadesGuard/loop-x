import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      aggregate: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    follow: {
      count: vi.fn(),
    },
    watchHistory: {
      aggregate: vi.fn(),
      upsert: vi.fn(),
    },
    videoAnalytics: {
      upsert: vi.fn(),
      findMany: vi.fn(),
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

import { prisma } from '../../../src/config/database';
import { AnalyticsService } from '../../../src/services/analytics.service';

const mockPrisma = vi.mocked(prisma);

const analyticsService = new AnalyticsService();

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getOverview ────────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('returns aggregated stats for a user', async () => {
      mockPrisma.video.aggregate.mockResolvedValue({
        _sum: { views: BigInt(1000), likesCount: 50, commentsCount: 20, sharesCount: 10 },
        _count: { id: 5 },
      } as any);
      mockPrisma.follow.count.mockResolvedValue(200);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: 7200 },
      } as any);
      // Two calls for weekly growth
      mockPrisma.videoAnalytics.findMany
        .mockResolvedValueOnce([{ views: 100 }, { views: 50 }] as any) // last week
        .mockResolvedValueOnce([{ views: 80 }, { views: 40 }] as any); // previous week

      const result = await analyticsService.getOverview('user-1');

      expect(result.totalViews).toBe(1000);
      expect(result.totalFollowers).toBe(200);
      expect(result.totalLikes).toBe(50);
      expect(result.totalComments).toBe(20);
      expect(result.totalShares).toBe(10);
      expect(result.totalVideos).toBe(5);
      expect(result.watchHours).toBe(2); // 7200s / 3600 = 2h
      expect(typeof result.avgEngagement).toBe('number');
      expect(typeof result.weeklyGrowth).toBe('number');
    });

    it('handles zero views gracefully (no division by zero)', async () => {
      mockPrisma.video.aggregate.mockResolvedValue({
        _sum: { views: BigInt(0), likesCount: 0, commentsCount: 0, sharesCount: 0 },
        _count: { id: 0 },
      } as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: null },
      } as any);
      mockPrisma.videoAnalytics.findMany.mockResolvedValue([] as any);

      const result = await analyticsService.getOverview('user-1');

      expect(result.avgEngagement).toBe(0);
      expect(result.weeklyGrowth).toBe(0);
      expect(result.watchHours).toBe(0);
    });

    it('shows 100% growth when previous week had no views but this week does', async () => {
      mockPrisma.video.aggregate.mockResolvedValue({
        _sum: { views: BigInt(500), likesCount: 0, commentsCount: 0, sharesCount: 0 },
        _count: { id: 1 },
      } as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: null },
      } as any);
      mockPrisma.videoAnalytics.findMany
        .mockResolvedValueOnce([{ views: 50 }] as any) // last week has views
        .mockResolvedValueOnce([] as any);              // previous week is empty

      const result = await analyticsService.getOverview('user-1');

      expect(result.weeklyGrowth).toBe(100);
    });
  });

  // ─── getVideoAnalytics ───────────────────────────────────────────────────────

  describe('getVideoAnalytics', () => {
    it('returns analytics for a video owned by the user', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        id: 'video-1',
        userId: 'user-1',
        views: 500,
        likesCount: 20,
        commentsCount: 5,
        sharesCount: 3,
        duration: 60,
      } as any);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: 3000 },
        _count: { id: 10 },
      } as any);
      mockPrisma.videoAnalytics.findMany.mockResolvedValue([
        { date: new Date('2026-03-01'), views: 100 },
        { date: new Date('2026-03-02'), views: 150 },
      ] as any);

      const result = await analyticsService.getVideoAnalytics('user-1', 'video-1');

      expect(result.id).toBe('video-1');
      expect(result.views).toBe(500);
      expect(result.likes).toBe(20);
      expect(result.comments).toBe(5);
      expect(result.shares).toBe(3);
      expect(result.watchTime).toBe(3000);
      expect(result.engagementRate).toBeTypeOf('number');
      expect(result.viewsByDay).toHaveLength(2);
    });

    it('throws 404 when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      const err = await analyticsService.getVideoAnalytics('user-1', 'missing').catch((e) => e);
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('VIDEO_NOT_FOUND');
    });

    it('throws 403 when video belongs to another user', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        id: 'video-1',
        userId: 'other-user',
        views: 0,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        duration: null,
      } as any);

      const err = await analyticsService.getVideoAnalytics('user-1', 'video-1').catch((e) => e);
      expect(err.statusCode).toBe(403);
    });

    it('handles video with no watch history', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        id: 'video-1',
        userId: 'user-1',
        views: 100,
        likesCount: 5,
        commentsCount: 2,
        sharesCount: 1,
        duration: null,
      } as any);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: null },
        _count: { id: 0 },
      } as any);
      mockPrisma.videoAnalytics.findMany.mockResolvedValue([] as any);

      const result = await analyticsService.getVideoAnalytics('user-1', 'video-1');

      expect(result.watchTime).toBe(0);
      expect(result.avgWatchPercentage).toBe(0);
      expect(result.viewsByDay).toHaveLength(0);
    });
  });

  // ─── trackView ──────────────────────────────────────────────────────────────

  describe('trackView', () => {
    it('increments video view count', async () => {
      mockPrisma.video.update.mockResolvedValue({} as any);
      mockPrisma.videoAnalytics.upsert.mockResolvedValue({} as any);

      await analyticsService.trackView('video-1');

      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: 'video-1' },
        data: { views: { increment: 1 } },
      });
    });

    it('records watch history when userId and duration are provided', async () => {
      mockPrisma.video.update.mockResolvedValue({} as any);
      mockPrisma.videoAnalytics.upsert.mockResolvedValue({} as any);
      mockPrisma.watchHistory.upsert.mockResolvedValue({} as any);

      await analyticsService.trackView('video-1', 'user-1', 45);

      expect(mockPrisma.watchHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_videoId: { userId: 'user-1', videoId: 'video-1' } },
          create: expect.objectContaining({ watchedDuration: 45 }),
        })
      );
    });

    it('does not throw on database error (non-critical)', async () => {
      mockPrisma.video.update.mockRejectedValue(new Error('DB error'));

      await expect(analyticsService.trackView('video-1')).resolves.toBeUndefined();
    });
  });

  // ─── updateAnalytics ────────────────────────────────────────────────────────

  describe('updateAnalytics', () => {
    it('upserts daily analytics for a like', async () => {
      mockPrisma.videoAnalytics.upsert.mockResolvedValue({} as any);

      await analyticsService.updateAnalytics('video-1', 'like', true);

      expect(mockPrisma.videoAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { likes: { increment: 1 } },
        })
      );
    });

    it('decrements when increment=false', async () => {
      mockPrisma.videoAnalytics.upsert.mockResolvedValue({} as any);

      await analyticsService.updateAnalytics('video-1', 'like', false);

      expect(mockPrisma.videoAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { likes: { increment: -1 } },
        })
      );
    });

    it('does not throw on database error (non-critical)', async () => {
      mockPrisma.videoAnalytics.upsert.mockRejectedValue(new Error('DB error'));

      await expect(analyticsService.updateAnalytics('video-1', 'comment')).resolves.toBeUndefined();
    });
  });

  // ─── getCreatorDashboard ─────────────────────────────────────────────────────

  describe('getCreatorDashboard', () => {
    it('returns overview plus topVideos and viewsByDay', async () => {
      // getOverview calls
      mockPrisma.video.aggregate.mockResolvedValue({
        _sum: { views: BigInt(200), likesCount: 10, commentsCount: 3, sharesCount: 2 },
        _count: { id: 2 },
      } as any);
      mockPrisma.follow.count.mockResolvedValue(50);
      mockPrisma.watchHistory.aggregate.mockResolvedValue({
        _sum: { watchedDuration: 3600 },
      } as any);
      mockPrisma.videoAnalytics.findMany
        .mockResolvedValueOnce([{ views: 20 }] as any)  // weekly growth — last week
        .mockResolvedValueOnce([{ views: 10 }] as any)  // weekly growth — prev week
        .mockResolvedValueOnce([                        // viewsByDay for chart
          { date: new Date('2026-03-01'), views: 50 },
          { date: new Date('2026-03-02'), views: 60 },
        ] as any);
      mockPrisma.video.findMany.mockResolvedValue([
        { id: 'v1', title: 'Top Video', thumbnailUrl: null, views: 200, likesCount: 10, commentsCount: 3, sharesCount: 2, duration: 30, createdAt: new Date() },
      ] as any);

      const result = await analyticsService.getCreatorDashboard('user-1');

      expect(result.totalViews).toBe(200);
      expect(result.topVideos).toHaveLength(1);
      expect(result.topVideos[0].id).toBe('v1');
      expect(result.viewsByDay).toHaveLength(2);
    });
  });
});
