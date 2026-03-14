import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    follow: {
      count: vi.fn(),
    },
    hashtag: {
      findMany: vi.fn(),
    },
  },
}));

import { DiscoveryService } from '../../../src/services/discovery.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    discoveryService = new DiscoveryService();
  });

  describe('getTrendingVideos', () => {
    function createMockVideo(id: string, userId: string, views: bigint) {
      const now = new Date('2026-03-13T12:00:00.000Z');
      return {
        id,
        userId,
        url: `https://example.com/${id}.mp4`,
        thumbnailUrl: `https://example.com/${id}.jpg`,
        title: `title-${id}`,
        description: `desc-${id}`,
        views,
        likesCount: 10,
        commentsCount: 2,
        sharesCount: 1,
        duration: 20,
        fileSize: BigInt(1024),
        privacy: 'public',
        allowComments: true,
        allowDuet: true,
        allowStitch: true,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
        shelbyAccount: null,
        shelbyBlobName: null,
        shelbyMerkleRoot: null,
        shelbyExpiration: null,
        shelbySize: null,
        shelbyChunksets: null,
        user: {
          id: userId,
          username: `user-${userId}`,
          fullName: `User ${userId}`,
          avatarUrl: null,
          isVerified: false,
        },
      };
    }

    it('should return formatted trending videos with pagination', async () => {
      mockPrisma.video.findMany.mockResolvedValue([
        createMockVideo('v1', 'u1', BigInt(200)),
        createMockVideo('v2', 'u2', BigInt(100)),
        createMockVideo('v3', 'u3', BigInt(50)),
      ] as any);

      const result = await discoveryService.getTrendingVideos({
        page: 1,
        limit: 2,
        timeframe: 'day',
      });

      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].id).toBe('v1');
      expect(result.videos[0].views).toBe(200);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        hasMore: true,
      });

      const args = mockPrisma.video.findMany.mock.calls[0][0] as any;
      expect(args.skip).toBe(0);
      expect(args.take).toBe(3);
      expect(args.where.status).toBe('ready');
      expect(args.where.privacy).toBe('public');
      const threshold = args.where.createdAt.gte as Date;
      const expected = Date.now() - 24 * 60 * 60 * 1000;
      expect(Math.abs(threshold.getTime() - expected)).toBeLessThan(5000);
    });

    it('should apply defaults for page/limit/timeframe', async () => {
      mockPrisma.video.findMany.mockResolvedValue([] as any);

      await discoveryService.getTrendingVideos();

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 21,
        }),
      );
    });
  });

  describe('getTopCreators', () => {
    it('should sort creators by follower count and assign rank', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          username: 'small',
          avatarUrl: null,
          bio: null,
          isVerified: false,
        },
        {
          id: 'u2',
          username: 'large',
          avatarUrl: 'a2.jpg',
          bio: 'bio2',
          isVerified: true,
        },
      ] as any);

      mockPrisma.follow.count
        .mockResolvedValueOnce(10 as any)
        .mockResolvedValueOnce(120 as any);

      mockPrisma.video.count
        .mockResolvedValueOnce(3 as any)
        .mockResolvedValueOnce(8 as any);

      const result = await discoveryService.getTopCreators({ limit: 2 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 4,
        }),
      );
      expect(result.creators).toHaveLength(2);
      expect(result.creators[0]).toEqual(
        expect.objectContaining({
          id: 'u2',
          username: '@large',
          rank: 1,
          followers: '120',
        }),
      );
      expect(result.creators[1]).toEqual(
        expect.objectContaining({
          id: 'u1',
          username: '@small',
          rank: 2,
        }),
      );
    });
  });

  describe('getTrendingHashtags', () => {
    it('should format hashtag stats and respect limit', async () => {
      mockPrisma.hashtag.findMany.mockResolvedValue([
        {
          tag: 'fun',
          views: 1200,
          videosCount: 50,
        },
      ] as any);

      const result = await discoveryService.getTrendingHashtags(1);

      expect(mockPrisma.hashtag.findMany).toHaveBeenCalledWith({
        orderBy: [{ views: 'desc' }, { videosCount: 'desc' }],
        take: 1,
      });
      expect(result.hashtags).toEqual([
        {
          tag: 'fun',
          views: '1.2K',
          growth: '+0%',
          videosCount: 50,
        },
      ]);
    });
  });
});
