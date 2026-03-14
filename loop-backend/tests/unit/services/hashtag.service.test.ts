import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    hashtag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    videoHashtag: {
      findMany: vi.fn(),
    },
  },
}));

import { HashtagService } from '../../../src/services/hashtag.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);

describe('HashtagService', () => {
  let hashtagService: HashtagService;

  beforeEach(() => {
    vi.clearAllMocks();
    hashtagService = new HashtagService();
  });

  function createVideoHashtag(id: string, views: bigint) {
    const now = new Date('2026-03-13T12:00:00.000Z');
    return {
      hashtag: 'dance',
      videoId: id,
      video: {
        id,
        userId: `user-${id}`,
        url: `https://example.com/${id}.mp4`,
        thumbnailUrl: `https://example.com/${id}.jpg`,
        title: `title-${id}`,
        description: `desc-${id}`,
        views,
        likesCount: 10,
        commentsCount: 1,
        sharesCount: 2,
        duration: 20,
        fileSize: BigInt(2048),
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
          id: `user-${id}`,
          username: `creator-${id}`,
          fullName: `Creator ${id}`,
          avatarUrl: null,
          isVerified: false,
        },
      },
    };
  }

  describe('getHashtagPage', () => {
    it('should throw HASHTAG_NOT_FOUND when hashtag does not exist', async () => {
      mockPrisma.hashtag.findUnique.mockResolvedValue(null);

      await expect(hashtagService.getHashtagPage('#missing')).rejects.toThrow(AppError);

      try {
        await hashtagService.getHashtagPage('#missing');
        expect.fail('Expected AppError');
      } catch (error: any) {
        expect(error.code).toBe('HASHTAG_NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should normalize hashtag, paginate results, and format videos', async () => {
      mockPrisma.hashtag.findUnique.mockResolvedValue({
        tag: 'dance',
        videosCount: 34,
        views: 2500000,
      } as any);

      mockPrisma.videoHashtag.findMany.mockResolvedValue([
        createVideoHashtag('v1', BigInt(200)),
        createVideoHashtag('v2', BigInt(100)),
        createVideoHashtag('v3', BigInt(50)),
      ] as any);

      const result = await hashtagService.getHashtagPage('#Dance', {
        sort: 'trending',
        page: 1,
        limit: 2,
      });

      expect(mockPrisma.hashtag.findUnique).toHaveBeenCalledWith({
        where: { tag: 'dance' },
      });
      expect(mockPrisma.videoHashtag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hashtag: 'dance',
          }),
          take: 3,
          skip: 0,
        }),
      );

      expect(result.tag).toBe('dance');
      expect(result.totalViews).toBe('2.5M');
      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].views).toBe(200);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        hasMore: true,
      });
    });

    it('should use recent sorting when requested', async () => {
      mockPrisma.hashtag.findUnique.mockResolvedValue({
        tag: 'dance',
        videosCount: 0,
        views: 0,
      } as any);
      mockPrisma.videoHashtag.findMany.mockResolvedValue([] as any);

      await hashtagService.getHashtagPage('dance', { sort: 'recent', page: 2, limit: 5 });

      expect(mockPrisma.videoHashtag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            video: {
              createdAt: 'desc',
            },
          },
          skip: 5,
          take: 6,
        }),
      );
    });
  });

  describe('getTrendingHashtags', () => {
    it('should format hashtag list with views and growth', async () => {
      mockPrisma.hashtag.findMany.mockResolvedValue([
        { tag: 'dance', views: 34000, videosCount: 91 },
      ] as any);

      const result = await hashtagService.getTrendingHashtags(1);

      expect(mockPrisma.hashtag.findMany).toHaveBeenCalledWith({
        orderBy: [{ views: 'desc' }, { videosCount: 'desc' }],
        take: 1,
      });
      expect(result).toEqual({
        hashtags: [
          {
            tag: 'dance',
            views: '34.0K',
            growth: '+0%',
            videosCount: 91,
          },
        ],
      });
    });
  });
});
