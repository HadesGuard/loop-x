import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    follow: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    video: {
      count: vi.fn(),
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

vi.mock('../../../src/services/feed.service', () => ({
  feedService: {
    invalidateFeedCache: vi.fn(),
  },
}));

vi.mock('../../../src/services/notification.service', () => ({
  notificationService: {
    createNotification: vi.fn(),
  },
}));

import { UserService } from '../../../src/services/user.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'Hello world',
  website: 'https://example.com',
  isVerified: false,
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();
  });

  describe('getCurrentUser', () => {
    it('should return user with stats', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.follow.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrisma.video.count.mockResolvedValue(3);

      const result = await userService.getCurrentUser('user-1');

      expect(result).toEqual({
        ...user,
        followersCount: 10,
        followingCount: 5,
        videosCount: 3,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({ id: true, username: true }),
      });
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getCurrentUser('nonexistent')).rejects.toThrow(AppError);
      await expect(userService.getCurrentUser('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('getUserByUsername', () => {
    it('should return user with stats', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.follow.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrisma.video.count.mockResolvedValue(3);

      const result = await userService.getUserByUsername('testuser');

      expect(result).toEqual(
        expect.objectContaining({
          username: 'testuser',
          followersCount: 10,
          followingCount: 5,
          videosCount: 3,
          isFollowing: false,
        })
      );
    });

    it('should check isFollowing when currentUserId is provided', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.video.count.mockResolvedValue(0);
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' } as any);

      const result = await userService.getUserByUsername('testuser', 'other-user');

      expect(result.isFollowing).toBe(true);
      expect(mockPrisma.follow.findUnique).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId: 'other-user',
            followingId: 'user-1',
          },
        },
      });
    });

    it('should not check isFollowing when viewing own profile', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.video.count.mockResolvedValue(0);

      const result = await userService.getUserByUsername('testuser', 'user-1');

      expect(result.isFollowing).toBe(false);
      expect(mockPrisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserByUsername('nobody')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('should throw ACCOUNT_DEACTIVATED when user is inactive', async () => {
      const user = makeUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      await expect(userService.getUserByUsername('testuser')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const updatedUser = makeUser({ fullName: 'New Name', bio: 'New bio' });
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.video.count.mockResolvedValue(0);

      const result = await userService.updateProfile('user-1', {
        fullName: 'New Name',
        bio: 'New bio',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: 'New Name', bio: 'New bio' },
        select: expect.objectContaining({ id: true }),
      });
      expect(result.fullName).toBe('New Name');
    });

    it('should convert empty strings to null', async () => {
      const updatedUser = makeUser({ fullName: null, bio: null, website: null });
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.video.count.mockResolvedValue(0);

      await userService.updateProfile('user-1', {
        fullName: '',
        bio: '',
        website: '',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: null, bio: null, website: null },
        select: expect.any(Object),
      });
    });

    it('should only include provided fields in update', async () => {
      const updatedUser = makeUser();
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.video.count.mockResolvedValue(0);

      await userService.updateProfile('user-1', { bio: 'Only bio' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { bio: 'Only bio' },
        })
      );
    });
  });

  describe('followUser', () => {
    it('should create a follow relationship', async () => {
      const targetUser = makeUser({ id: 'user-2', username: 'target' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue({} as any);

      await userService.followUser('user-1', 'target');

      expect(mockPrisma.follow.create).toHaveBeenCalledWith({
        data: {
          followerId: 'user-1',
          followingId: 'user-2',
        },
      });
    });

    it('should throw CANNOT_FOLLOW_SELF when following yourself', async () => {
      const targetUser = makeUser({ id: 'user-1', username: 'myself' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);

      await expect(userService.followUser('user-1', 'myself')).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_FOLLOW_SELF',
      });
    });

    it('should throw ALREADY_FOLLOWING when duplicate follow', async () => {
      const targetUser = makeUser({ id: 'user-2', username: 'target' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'existing-follow' } as any);

      await expect(userService.followUser('user-1', 'target')).rejects.toMatchObject({
        statusCode: 400,
        code: 'ALREADY_FOLLOWING',
      });
    });

    it('should throw USER_NOT_FOUND when target does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.followUser('user-1', 'ghost')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('should throw ACCOUNT_DEACTIVATED when target is inactive', async () => {
      const targetUser = makeUser({ id: 'user-2', isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);

      await expect(userService.followUser('user-1', 'target')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
    });
  });

  describe('unfollowUser', () => {
    it('should delete the follow relationship', async () => {
      const targetUser = makeUser({ id: 'user-2', username: 'target' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' } as any);
      mockPrisma.follow.delete.mockResolvedValue({} as any);

      await userService.unfollowUser('user-1', 'target');

      expect(mockPrisma.follow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId: 'user-1',
            followingId: 'user-2',
          },
        },
      });
    });

    it('should throw NOT_FOLLOWING when not following the user', async () => {
      const targetUser = makeUser({ id: 'user-2', username: 'target' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser as any);
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      await expect(userService.unfollowUser('user-1', 'target')).rejects.toMatchObject({
        statusCode: 400,
        code: 'NOT_FOLLOWING',
      });
    });

    it('should throw USER_NOT_FOUND when target does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.unfollowUser('user-1', 'ghost')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('getUserVideos', () => {
    it('should return paginated videos', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.video.findMany.mockResolvedValue([
        { id: 'v1', title: 'Video 1', views: BigInt(100), createdAt: new Date() },
        { id: 'v2', title: 'Video 2', views: BigInt(200), createdAt: new Date() },
      ] as any);

      const result = await userService.getUserVideos('testuser', 20);

      expect(result.videos).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      // views should be converted from BigInt to Number
      expect(result.videos[0].views).toBe(100);
      expect(result.videos[1].views).toBe(200);
    });

    it('should return nextCursor when more results exist', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      // Return limit + 1 items to indicate more pages
      const videos = [
        { id: 'v1', title: 'Video 1', views: BigInt(10), createdAt: new Date() },
        { id: 'v2', title: 'Video 2', views: BigInt(20), createdAt: new Date() },
        { id: 'v3', title: 'Video 3', views: BigInt(30), createdAt: new Date() },
      ];
      mockPrisma.video.findMany.mockResolvedValue(videos as any);

      const result = await userService.getUserVideos('testuser', 2);

      expect(result.videos).toHaveLength(2);
      expect(result.nextCursor).toBe('v3');
    });

    it('should pass cursor to prisma when provided', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.video.findMany.mockResolvedValue([] as any);

      await userService.getUserVideos('testuser', 20, 'cursor-id');

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
        })
      );
    });

    it('should not pass cursor when not provided', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.video.findMany.mockResolvedValue([] as any);

      await userService.getUserVideos('testuser', 20);

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: undefined,
        })
      );
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserVideos('ghost')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });
});
