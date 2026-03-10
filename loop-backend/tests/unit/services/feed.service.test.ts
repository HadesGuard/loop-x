import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findMany: vi.fn(),
    },
    follow: {
      findMany: vi.fn(),
    },
  },
}));

// Mock redis
vi.mock('../../../src/config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
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

import { FeedService } from '../../../src/services/feed.service';
import { prisma } from '../../../src/config/database';
import { redis } from '../../../src/config/redis';

const mockPrisma = vi.mocked(prisma);
const mockRedis = vi.mocked(redis);

describe('FeedService', () => {
  let feedService: FeedService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    fullName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: false,
  };

  const now = new Date();

  function createMockVideo(overrides: Record<string, any> = {}) {
    return {
      id: overrides.id || 'video-1',
      userId: overrides.userId || 'user-1',
      url: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      title: overrides.title || 'Test Video',
      description: 'A test video',
      views: overrides.views ?? BigInt(100),
      likesCount: overrides.likesCount ?? 10,
      commentsCount: overrides.commentsCount ?? 5,
      sharesCount: overrides.sharesCount ?? 2,
      duration: 30,
      fileSize: BigInt(1024000),
      privacy: overrides.privacy || 'public',
      allowComments: true,
      allowDuet: true,
      allowStitch: true,
      status: 'ready',
      createdAt: overrides.createdAt || now,
      updatedAt: now,
      user: overrides.user || mockUser,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    feedService = new FeedService();
    // Default: no cache hit
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK' as any);
  });

  // ============================================
  // getForYouFeed()
  // ============================================
  describe('getForYouFeed()', () => {
    it('should return videos sorted by trending score', async () => {
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);

      // Video A: high engagement, recent -> highest trending score
      const videoA = createMockVideo({
        id: 'video-a',
        likesCount: 100,
        views: BigInt(1000),
        commentsCount: 50,
        createdAt: oneHourAgo,
      });
      // Video B: lower engagement, older -> lower trending score
      const videoB = createMockVideo({
        id: 'video-b',
        likesCount: 10,
        views: BigInt(100),
        commentsCount: 5,
        createdAt: tenHoursAgo,
      });

      mockPrisma.video.findMany.mockResolvedValue([videoA, videoB] as any);

      const result = await feedService.getForYouFeed('user-1', {});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('video-a');
      expect(result.items[1].id).toBe('video-b');
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle pagination with cursor and limit', async () => {
      // Return limit + 1 videos to signal there are more
      const videos = Array.from({ length: 3 }, (_, i) =>
        createMockVideo({
          id: `video-${i}`,
          likesCount: 10 - i,
          createdAt: new Date(now.getTime() - i * 60 * 60 * 1000),
        })
      );

      mockPrisma.video.findMany.mockResolvedValue(videos as any);

      const result = await feedService.getForYouFeed('user-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('video-2');
    });

    it('should pass cursor to prisma when provided', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getForYouFeed('user-1', { cursor: 'cursor-id', limit: 10 });

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
          take: 11, // limit + 1
        })
      );
    });

    it('should cap limit at MAX_LIMIT (50)', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getForYouFeed('user-1', { limit: 100 });

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // MAX_LIMIT + 1
        })
      );
    });

    it('should use DEFAULT_LIMIT (20) when no limit provided', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getForYouFeed('user-1', {});

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 21, // DEFAULT_LIMIT + 1
        })
      );
    });

    it('should only query public ready videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getForYouFeed('user-1', {});

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'ready',
            privacy: 'public',
          },
        })
      );
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        items: [{ id: 'cached-video' }],
        nextCursor: null,
        hasMore: false,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await feedService.getForYouFeed('user-1', {});

      expect(result).toEqual(cachedResponse);
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
    });

    it('should cache the response after fetching from database', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getForYouFeed('user-1', {});

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('feed:foryou:user-1:'),
        300,
        expect.any(String)
      );
    });

    it('should return empty feed when no videos exist', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await feedService.getForYouFeed('user-1', {});

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should gracefully handle redis get error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));
      mockPrisma.video.findMany.mockResolvedValue([]);

      // Should not throw, should fall through to database query
      const result = await feedService.getForYouFeed('user-1', {});

      expect(result.items).toEqual([]);
      expect(mockPrisma.video.findMany).toHaveBeenCalled();
    });

    it('should gracefully handle redis setex error', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis connection error'));
      mockPrisma.video.findMany.mockResolvedValue([createMockVideo()] as any);

      // Should not throw
      const result = await feedService.getForYouFeed('user-1', {});

      expect(result.items).toHaveLength(1);
    });

    it('should map video fields to FeedItem format correctly', async () => {
      const video = createMockVideo({
        id: 'video-mapped',
        views: BigInt(500),
      });
      mockPrisma.video.findMany.mockResolvedValue([video] as any);

      const result = await feedService.getForYouFeed('user-1', {});

      const item = result.items[0];
      expect(item.id).toBe('video-mapped');
      expect(item.views).toBe(500); // BigInt converted to number
      expect(item.fileSize).toBe(1024000); // BigInt converted to number
      expect(item.user).toEqual(mockUser);
      expect(item.shelbyAccount).toBeNull();
      expect(item.shelbyBlobName).toBeNull();
      expect(item.shelbyMerkleRoot).toBeNull();
      expect(item.shelbyExpiration).toBeNull();
      expect(item.shelbySize).toBeNull();
      expect(item.shelbyChunksets).toBeNull();
    });

    it('should handle null fileSize', async () => {
      const video = createMockVideo({ id: 'video-null-size' });
      video.fileSize = null;
      mockPrisma.video.findMany.mockResolvedValue([video] as any);

      const result = await feedService.getForYouFeed('user-1', {});

      expect(result.items[0].fileSize).toBeNull();
    });
  });

  // ============================================
  // getFollowingFeed()
  // ============================================
  describe('getFollowingFeed()', () => {
    it('should return videos from followed users ordered by recency', async () => {
      const followedUsers = [
        { followingId: 'user-2' },
        { followingId: 'user-3' },
      ];
      mockPrisma.follow.findMany.mockResolvedValue(followedUsers as any);

      const video1 = createMockVideo({ id: 'vid-1', userId: 'user-2' });
      const video2 = createMockVideo({ id: 'vid-2', userId: 'user-3' });
      mockPrisma.video.findMany.mockResolvedValue([video1, video2] as any);

      const result = await feedService.getFollowingFeed('user-1', {});

      expect(result.items).toHaveLength(2);
      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: 'user-1' },
        select: { followingId: true },
      });
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: { in: ['user-2', 'user-3'] },
            status: 'ready',
            privacy: { in: ['public', 'friends'] },
          },
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should return empty feed when user follows nobody', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([]);

      const result = await feedService.getFollowingFeed('user-1', {});

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      // Should not query videos at all
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);

      const videos = Array.from({ length: 3 }, (_, i) =>
        createMockVideo({ id: `vid-${i}`, userId: 'user-2' })
      );
      mockPrisma.video.findMany.mockResolvedValue(videos as any);

      const result = await feedService.getFollowingFeed('user-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('vid-2');
    });

    it('should pass cursor to prisma when provided', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getFollowingFeed('user-1', { cursor: 'cursor-id', limit: 5 });

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
          take: 6, // limit + 1
        })
      );
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        items: [{ id: 'cached-following-video' }],
        nextCursor: null,
        hasMore: false,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await feedService.getFollowingFeed('user-1', {});

      expect(result).toEqual(cachedResponse);
      expect(mockPrisma.follow.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
    });

    it('should cache the response after fetching', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getFollowingFeed('user-1', {});

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('feed:following:user-1:'),
        300,
        expect.any(String)
      );
    });

    it('should not cache when user follows nobody (empty result)', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([]);

      await feedService.getFollowingFeed('user-1', {});

      // Early return path does not cache
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should cap limit at MAX_LIMIT (50)', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getFollowingFeed('user-1', { limit: 100 });

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51,
        })
      );
    });

    it('should include public and friends privacy levels', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);

      await feedService.getFollowingFeed('user-1', {});

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            privacy: { in: ['public', 'friends'] },
          }),
        })
      );
    });

    it('should gracefully handle redis errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await feedService.getFollowingFeed('user-1', {});

      expect(result.items).toEqual([]);
      expect(mockPrisma.follow.findMany).toHaveBeenCalled();
    });

    it('should map video fields to FeedItem format correctly', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }] as any);
      const video = createMockVideo({
        id: 'vid-mapped',
        userId: 'user-2',
        views: BigInt(250),
      });
      mockPrisma.video.findMany.mockResolvedValue([video] as any);

      const result = await feedService.getFollowingFeed('user-1', {});

      const item = result.items[0];
      expect(item.views).toBe(250);
      expect(item.shelbyAccount).toBeNull();
      expect(item.user).toEqual(mockUser);
    });
  });

  // ============================================
  // invalidateFeedCache()
  // ============================================
  describe('invalidateFeedCache()', () => {
    it('should delete all cache keys matching the user pattern', async () => {
      const keys = [
        'feed:foryou:user-1:first:20',
        'feed:following:user-1:first:20',
        'feed:foryou:user-1:cursor-abc:10',
      ];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(3 as any);

      await feedService.invalidateFeedCache('user-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('feed:*:user-1:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should not call del when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await feedService.invalidateFeedCache('user-no-cache');

      expect(mockRedis.keys).toHaveBeenCalledWith('feed:*:user-no-cache:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should gracefully handle redis errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis down'));

      // Should not throw
      await expect(feedService.invalidateFeedCache('user-1')).resolves.toBeUndefined();
    });

    it('should handle del failure gracefully', async () => {
      mockRedis.keys.mockResolvedValue(['feed:foryou:user-1:first:20']);
      mockRedis.del.mockRejectedValue(new Error('Redis del error'));

      // The error is inside the try/catch, but del is called within the if block
      // which is inside the try block, so it should be caught
      await expect(feedService.invalidateFeedCache('user-1')).resolves.toBeUndefined();
    });
  });
});
