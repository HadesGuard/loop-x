import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    follow: {
      findMany: vi.fn(),
    },
    videoLike: {
      findMany: vi.fn(),
    },
    videoSave: {
      findMany: vi.fn(),
    },
    refreshToken: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
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

vi.mock('../../../src/utils/password', () => ({
  comparePassword: vi.fn(),
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

vi.mock('../../../src/services/shelby.service', () => ({
  shelbyService: {
    uploadBlob: vi.fn(),
    getServiceAccountAddress: vi.fn(),
  },
}));

import { AppError } from '../../../src/middleware/error.middleware';
import { prisma } from '../../../src/config/database';
import { comparePassword } from '../../../src/utils/password';
import { UserService } from '../../../src/services/user.service';
import { shelbyService } from '../../../src/services/shelby.service';

const mockPrisma = vi.mocked(prisma);
const mockComparePassword = vi.mocked(comparePassword);
const mockShelbyService = vi.mocked(shelbyService);

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  fullName: 'Tester',
  avatarUrl: null,
  bio: null,
  website: null,
  isVerified: false,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('UserService account and lists', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();
  });

  describe('getUserFollowers', () => {
    it('returns followers with pagination cursor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser() as any);
      mockPrisma.follow.findMany.mockResolvedValue([
        { id: 'f1', follower: { id: 'u2', username: 'a' } },
        { id: 'f2', follower: { id: 'u3', username: 'b' } },
        { id: 'f3', follower: { id: 'u4', username: 'c' } },
      ] as any);

      const result = await userService.getUserFollowers('tester', 2);

      expect(result.users).toHaveLength(2);
      expect(result.nextCursor).toBe('f3');
      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followingId: 'user-1' },
          take: 3,
        })
      );
    });

    it('throws USER_NOT_FOUND when username does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserFollowers('missing')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('getUserFollowing', () => {
    it('throws ACCOUNT_DEACTIVATED for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }) as any);

      await expect(userService.getUserFollowing('tester')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
    });

    it('returns following users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser() as any);
      mockPrisma.follow.findMany.mockResolvedValue([
        { id: 'f1', following: { id: 'u2', username: 'creator' } },
      ] as any);

      const result = await userService.getUserFollowing('tester', 20, 'cursor-1');

      expect(result).toEqual({
        users: [{ id: 'u2', username: 'creator' }],
        nextCursor: null,
      });
      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-1' },
          where: { followerId: 'user-1' },
        })
      );
    });
  });

  describe('getUserLikedVideos', () => {
    it('maps liked videos and converts BigInt views', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser() as any);
      mockPrisma.videoLike.findMany.mockResolvedValue([
        {
          id: 'like-1',
          video: {
            id: 'v1',
            title: 't1',
            description: null,
            thumbnailUrl: null,
            views: BigInt(77),
            likesCount: 2,
            commentsCount: 1,
            duration: 10,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        },
      ] as any);

      const result = await userService.getUserLikedVideos('tester');

      expect(result.videos[0].views).toBe(77);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('getUserSavedVideos', () => {
    it('returns saved videos and forwards cursor', async () => {
      mockPrisma.videoSave.findMany.mockResolvedValue([
        {
          id: 'save-1',
          video: {
            id: 'v1',
            title: 'Saved',
            description: null,
            thumbnailUrl: null,
            views: BigInt(12),
            likesCount: 0,
            commentsCount: 0,
            duration: 3,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
          },
        },
      ] as any);

      const result = await userService.getUserSavedVideos('user-1', 10, 'save-cursor');

      expect(result).toEqual({
        videos: [
          expect.objectContaining({
            id: 'v1',
            views: 12,
          }),
        ],
        nextCursor: null,
      });
      expect(mockPrisma.videoSave.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'save-cursor' },
          where: { userId: 'user-1', video: { status: 'ready' } },
        })
      );
    });
  });

  describe('updateAvatar', () => {
    it('updates avatar URL for user', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      await userService.updateAvatar('user-1', 'https://cdn/avatar.jpg');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarUrl: 'https://cdn/avatar.jpg' },
      });
    });
  });

  describe('uploadAvatarFile', () => {
    it('uploads avatar to shelby and stores shelby:// URL', async () => {
      mockShelbyService.uploadBlob.mockResolvedValue(undefined);
      mockShelbyService.getServiceAccountAddress.mockReturnValue('acc123');
      mockPrisma.user.update.mockResolvedValue({} as any);

      const url = await userService.uploadAvatarFile('user-1', Buffer.from('avatar'));

      expect(url).toMatch(/^shelby:\/\/acc123\/user-1-avatar-\d+\.jpg$/);
      expect(mockShelbyService.uploadBlob).toHaveBeenCalledWith(
        Buffer.from('avatar'),
        expect.stringMatching(/^user-1-avatar-\d+\.jpg$/),
        365
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarUrl: url },
      });
    });

    it('throws SHELBY_NOT_CONFIGURED when service account missing', async () => {
      mockShelbyService.uploadBlob.mockResolvedValue(undefined);
      mockShelbyService.getServiceAccountAddress.mockReturnValue('');

      await expect(userService.uploadAvatarFile('user-1', Buffer.from('avatar'))).rejects.toMatchObject({
        statusCode: 500,
        code: 'SHELBY_NOT_CONFIGURED',
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('throws NO_PASSWORD for users without password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: null,
        isActive: true,
      } as any);

      await expect(userService.deleteAccount('user-1', 'pw')).rejects.toMatchObject({
        statusCode: 400,
        code: 'NO_PASSWORD',
      });
    });

    it('throws INVALID_PASSWORD when password check fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
        isActive: true,
      } as any);
      mockComparePassword.mockResolvedValue(false);

      await expect(userService.deleteAccount('user-1', 'wrong')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_PASSWORD',
      });
    });

    it('soft-deletes account and revokes refresh tokens on valid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
        isActive: true,
      } as any);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.$transaction.mockResolvedValue([] as any);

      await userService.deleteAccount('user-1', 'correct');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const txArgs = mockPrisma.$transaction.mock.calls[0][0] as any[];
      expect(txArgs).toHaveLength(2);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            isActive: false,
            username: 'deleted-user-1',
          }),
        })
      );
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  it('uses AppError class in thrown errors', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(userService.getUserLikedVideos('missing')).rejects.toBeInstanceOf(AppError);
  });
});
