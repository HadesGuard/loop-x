import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    video: {
      findMany: vi.fn(),
    },
    hashtag: {
      findMany: vi.fn(),
    },
  },
}));

import { SearchService } from '../../../src/services/search.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);
const searchService = new SearchService();

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should throw for empty query', async () => {
      await expect(searchService.search('')).rejects.toThrow(AppError);
      await expect(searchService.search('   ')).rejects.toThrow(AppError);
    });

    it('should search all types by default', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', username: 'testuser', avatarUrl: null, isVerified: false, _count: { followers: 1500 } },
      ] as any);
      mockPrisma.video.findMany.mockResolvedValue([
        { id: 'v1', title: 'test vid', thumbnailUrl: null, views: 5000, user: { username: 'creator' } },
      ] as any);
      mockPrisma.hashtag.findMany.mockResolvedValue([
        { tag: 'test', views: 1000000, videosCount: 500 },
      ] as any);

      const result = await searchService.search('test');

      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('@testuser');
      expect(result.users[0].followers).toBe('1.5K');
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].views).toBe('5.0K');
      expect(result.hashtags).toHaveLength(1);
      expect(result.hashtags[0].views).toBe('1.0M');
    });

    it('should search only users when type is users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await searchService.search('test', 'users');

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.hashtag.findMany).not.toHaveBeenCalled();
    });

    it('should search only videos when type is videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await searchService.search('test', 'videos');

      expect(mockPrisma.video.findMany).toHaveBeenCalled();
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.hashtag.findMany).not.toHaveBeenCalled();
    });

    it('should search only hashtags when type is hashtags', async () => {
      mockPrisma.hashtag.findMany.mockResolvedValue([]);

      const result = await searchService.search('test', 'hashtags');

      expect(mockPrisma.hashtag.findMany).toHaveBeenCalled();
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.hashtag.findMany.mockResolvedValue([]);

      const result = await searchService.search('test', 'all', { page: 2, limit: 10 });

      expect(result.pagination).toEqual({ page: 2, limit: 10, hasMore: false });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it('should format large numbers correctly', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', username: 'big', avatarUrl: null, isVerified: true, _count: { followers: 2400000000 } },
      ] as any);
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.hashtag.findMany.mockResolvedValue([]);

      const result = await searchService.search('big');
      expect(result.users[0].followers).toBe('2.4B');
    });
  });
});
