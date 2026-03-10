import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    videoLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    videoSave: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    commentLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
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

// Mock notification service
vi.mock('../../../src/services/notification.service', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock analytics service
vi.mock('../../../src/services/analytics.service', () => ({
  analyticsService: {
    updateAnalytics: vi.fn().mockResolvedValue(undefined),
  },
}));

import { InteractionService } from '../../../src/services/interaction.service';
import { prisma } from '../../../src/config/database';
import { notificationService } from '../../../src/services/notification.service';
import { analyticsService } from '../../../src/services/analytics.service';

const mockPrisma = vi.mocked(prisma);

describe('InteractionService', () => {
  let service: InteractionService;

  const userId = 'user-1';
  const otherUserId = 'user-2';
  const videoId = 'video-1';
  const commentId = 'comment-1';

  const mockVideo = {
    id: videoId,
    userId: otherUserId,
    title: 'Test Video',
    url: 'https://example.com/video.mp4',
    status: 'ready',
    privacy: 'public',
    likesCount: 10,
    sharesCount: 5,
    commentsCount: 3,
    allowComments: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InteractionService();
  });

  // ─── toggleLikeVideo ───────────────────────────────────────────────

  describe('toggleLikeVideo', () => {
    it('should like a video when not already liked', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any) // exists check
        .mockResolvedValueOnce({ likesCount: 11, userId: otherUserId } as any); // after like
      mockPrisma.videoLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeVideo(userId, videoId);

      expect(result).toEqual({ liked: true, likesCount: 11 });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should unlike a video when already liked', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any) // exists check
        .mockResolvedValueOnce({ likesCount: 9 } as any); // after unlike
      mockPrisma.videoLike.findUnique.mockResolvedValue({ userId, videoId } as any);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeVideo(userId, videoId);

      expect(result).toEqual({ liked: false, likesCount: 9 });
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.toggleLikeVideo(userId, videoId)).rejects.toThrow(AppError);
      await expect(service.toggleLikeVideo(userId, videoId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'VIDEO_NOT_FOUND',
      });
    });

    it('should create a notification when liking another user video', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any)
        .mockResolvedValueOnce({ likesCount: 11, userId: otherUserId } as any);
      mockPrisma.videoLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      await service.toggleLikeVideo(userId, videoId);

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        type: 'like',
        actorId: userId,
        videoId,
      });
    });

    it('should NOT create a notification when liking own video', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any)
        .mockResolvedValueOnce({ likesCount: 11, userId } as any); // same user
      mockPrisma.videoLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      await service.toggleLikeVideo(userId, videoId);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should call analyticsService.updateAnalytics when liking', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any)
        .mockResolvedValueOnce({ likesCount: 11, userId: otherUserId } as any);
      mockPrisma.videoLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      await service.toggleLikeVideo(userId, videoId);

      expect(analyticsService.updateAnalytics).toHaveBeenCalledWith(videoId, 'like', true);
    });

    it('should NOT call analyticsService when unliking', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any)
        .mockResolvedValueOnce({ likesCount: 9 } as any);
      mockPrisma.videoLike.findUnique.mockResolvedValue({ userId, videoId } as any);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      await service.toggleLikeVideo(userId, videoId);

      expect(analyticsService.updateAnalytics).not.toHaveBeenCalled();
    });

    it('should return 0 likesCount when updated video is null', async () => {
      mockPrisma.video.findUnique
        .mockResolvedValueOnce(mockVideo as any)
        .mockResolvedValueOnce(null); // updated video null
      mockPrisma.videoLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeVideo(userId, videoId);

      expect(result).toEqual({ liked: true, likesCount: 0 });
    });
  });

  // ─── toggleSaveVideo ───────────────────────────────────────────────

  describe('toggleSaveVideo', () => {
    it('should save a video when not already saved', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.videoSave.findUnique.mockResolvedValue(null);
      mockPrisma.videoSave.create.mockResolvedValue({ userId, videoId } as any);

      const result = await service.toggleSaveVideo(userId, videoId);

      expect(result).toEqual({ saved: true });
      expect(mockPrisma.videoSave.create).toHaveBeenCalledWith({
        data: { userId, videoId },
      });
    });

    it('should unsave a video when already saved', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.videoSave.findUnique.mockResolvedValue({ userId, videoId } as any);
      mockPrisma.videoSave.delete.mockResolvedValue({ userId, videoId } as any);

      const result = await service.toggleSaveVideo(userId, videoId);

      expect(result).toEqual({ saved: false });
      expect(mockPrisma.videoSave.delete).toHaveBeenCalledWith({
        where: { userId_videoId: { userId, videoId } },
      });
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.toggleSaveVideo(userId, videoId)).rejects.toThrow(AppError);
      await expect(service.toggleSaveVideo(userId, videoId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'VIDEO_NOT_FOUND',
      });
    });
  });

  // ─── shareVideo ────────────────────────────────────────────────────

  describe('shareVideo', () => {
    it('should increment share count and return share URL', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.video.update.mockResolvedValue({ id: videoId, sharesCount: 6 } as any);

      const result = await service.shareVideo(userId, videoId);

      expect(result.sharesCount).toBe(6);
      expect(result.shareUrl).toContain(`/video/${videoId}`);
      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: videoId },
        data: { sharesCount: { increment: 1 } },
        select: { id: true, sharesCount: true },
      });
    });

    it('should accept an optional platform parameter', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.video.update.mockResolvedValue({ id: videoId, sharesCount: 6 } as any);

      const result = await service.shareVideo(userId, videoId, 'twitter');

      expect(result.sharesCount).toBe(6);
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.shareVideo(userId, videoId)).rejects.toThrow(AppError);
      await expect(service.shareVideo(userId, videoId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'VIDEO_NOT_FOUND',
      });
    });
  });

  // ─── getComments ───────────────────────────────────────────────────

  describe('getComments', () => {
    const mockComment = {
      id: commentId,
      videoId,
      userId: otherUserId,
      text: 'Great video!',
      likesCount: 5,
      repliesCount: 2,
      parentId: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      user: { id: otherUserId, username: 'commenter', avatarUrl: null },
      replies: [],
      commentLikes: [],
    };

    it('should return paginated comments for a video', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.comment.findMany.mockResolvedValue([mockComment] as any);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await service.getComments(videoId);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe(commentId);
      expect(result.comments[0].username).toBe('@commenter');
      expect(result.comments[0].text).toBe('Great video!');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should support pagination options', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.comment.count.mockResolvedValue(50);

      const result = await service.getComments(videoId, undefined, {
        page: 2,
        limit: 10,
        sort: 'oldest',
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.getComments(videoId)).rejects.toThrow(AppError);
      await expect(service.getComments(videoId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'VIDEO_NOT_FOUND',
      });
    });

    it('should show isLiked when userId is provided', async () => {
      const commentWithLike = {
        ...mockComment,
        commentLikes: [{ userId, commentId }],
      };
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.comment.findMany.mockResolvedValue([commentWithLike] as any);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await service.getComments(videoId, userId);

      expect(result.comments[0].isLiked).toBe(true);
    });
  });

  // ─── addComment ────────────────────────────────────────────────────

  describe('addComment', () => {
    const createdComment = {
      id: 'new-comment-id',
      videoId,
      userId,
      text: 'Nice!',
      likesCount: 0,
      repliesCount: 0,
      parentId: null,
      createdAt: new Date('2025-06-01'),
      updatedAt: new Date('2025-06-01'),
      user: { id: userId, username: 'testuser', avatarUrl: null },
    };

    it('should add a top-level comment to a video', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { create: vi.fn().mockResolvedValue(createdComment), update: vi.fn() },
          video: { update: vi.fn() },
        });
      });

      const result = await service.addComment(userId, videoId, 'Nice!');

      expect(result.id).toBe('new-comment-id');
      expect(result.username).toBe('@testuser');
      expect(result.text).toBe('Nice!');
      expect(result.likes).toBe(0);
      expect(result.timestamp).toBe('Just now');
    });

    it('should throw VIDEO_NOT_FOUND when video does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.addComment(userId, videoId, 'Hello')).rejects.toThrow(AppError);
      await expect(service.addComment(userId, videoId, 'Hello')).rejects.toMatchObject({
        statusCode: 404,
        code: 'VIDEO_NOT_FOUND',
      });
    });

    it('should throw COMMENTS_DISABLED when comments are not allowed', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        ...mockVideo,
        allowComments: false,
      } as any);

      await expect(service.addComment(userId, videoId, 'Hello')).rejects.toThrow(AppError);
      await expect(service.addComment(userId, videoId, 'Hello')).rejects.toMatchObject({
        statusCode: 403,
        code: 'COMMENTS_DISABLED',
      });
    });

    it('should throw PARENT_COMMENT_NOT_FOUND when parentId does not exist', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment(userId, videoId, 'Reply', 'nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PARENT_COMMENT_NOT_FOUND',
      });
    });

    it('should throw INVALID_PARENT when parent comment belongs to different video', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'parent-id',
        videoId: 'different-video',
      } as any);

      await expect(
        service.addComment(userId, videoId, 'Reply', 'parent-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_PARENT',
      });
    });

    it('should create a reply and notify the parent comment owner', async () => {
      const parentComment = {
        id: 'parent-id',
        videoId,
        userId: otherUserId,
      };
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      // First findUnique for parent validation, second for notification
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce(parentComment as any)
        .mockResolvedValueOnce({ userId: otherUserId } as any);

      const replyComment = {
        ...createdComment,
        id: 'reply-id',
        parentId: 'parent-id',
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: {
            create: vi.fn().mockResolvedValue(replyComment),
            update: vi.fn(),
          },
          video: { update: vi.fn() },
        });
      });

      await service.addComment(userId, videoId, 'Great reply!', 'parent-id');

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        type: 'reply',
        actorId: userId,
        videoId,
        commentId: 'parent-id',
      });
    });

    it('should notify video owner when commenting on their video', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { create: vi.fn().mockResolvedValue(createdComment), update: vi.fn() },
          video: { update: vi.fn() },
        });
      });

      await service.addComment(userId, videoId, 'Nice!');

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        type: 'comment',
        actorId: userId,
        videoId,
        commentId: 'new-comment-id',
      });
    });

    it('should NOT notify when commenting on own video', async () => {
      const ownVideo = { ...mockVideo, userId };
      mockPrisma.video.findUnique.mockResolvedValue(ownVideo as any);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { create: vi.fn().mockResolvedValue(createdComment), update: vi.fn() },
          video: { update: vi.fn() },
        });
      });

      await service.addComment(userId, videoId, 'My own comment');

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  // ─── toggleLikeComment ─────────────────────────────────────────────

  describe('toggleLikeComment', () => {
    const mockComment = {
      id: commentId,
      videoId,
      userId: otherUserId,
      text: 'A comment',
      likesCount: 3,
    };

    it('should like a comment when not already liked', async () => {
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce(mockComment as any) // exists check
        .mockResolvedValueOnce({ likesCount: 4 } as any); // after like
      mockPrisma.commentLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeComment(userId, commentId);

      expect(result).toEqual({ liked: true, likes: 4 });
    });

    it('should unlike a comment when already liked', async () => {
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce(mockComment as any) // exists check
        .mockResolvedValueOnce({ likesCount: 2 } as any); // after unlike
      mockPrisma.commentLike.findUnique.mockResolvedValue({ userId, commentId } as any);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeComment(userId, commentId);

      expect(result).toEqual({ liked: false, likes: 2 });
    });

    it('should throw COMMENT_NOT_FOUND when comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.toggleLikeComment(userId, commentId)).rejects.toThrow(AppError);
      await expect(service.toggleLikeComment(userId, commentId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'COMMENT_NOT_FOUND',
      });
    });

    it('should return 0 likes when updated comment is null', async () => {
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce(mockComment as any)
        .mockResolvedValueOnce(null); // updated comment null
      mockPrisma.commentLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue(undefined as any);

      const result = await service.toggleLikeComment(userId, commentId);

      expect(result).toEqual({ liked: true, likes: 0 });
    });
  });

  // ─── deleteComment ─────────────────────────────────────────────────

  describe('deleteComment', () => {
    const mockCommentWithVideo = {
      id: commentId,
      videoId,
      userId,
      parentId: null,
      text: 'My comment',
      video: { userId: otherUserId },
    };

    it('should delete a comment owned by the user', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockCommentWithVideo as any);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { delete: vi.fn(), update: vi.fn() },
          video: { update: vi.fn() },
        });
      });

      await expect(service.deleteComment(userId, commentId)).resolves.toBeUndefined();
    });

    it('should allow video owner to delete any comment on their video', async () => {
      const commentByOther = {
        ...mockCommentWithVideo,
        userId: 'someone-else',
        video: { userId }, // current user owns the video
      };
      mockPrisma.comment.findUnique.mockResolvedValue(commentByOther as any);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { delete: vi.fn(), update: vi.fn() },
          video: { update: vi.fn() },
        });
      });

      await expect(service.deleteComment(userId, commentId)).resolves.toBeUndefined();
    });

    it('should throw UNAUTHORIZED when user is neither comment nor video owner', async () => {
      const commentByOther = {
        ...mockCommentWithVideo,
        userId: 'someone-else',
        video: { userId: otherUserId },
      };
      mockPrisma.comment.findUnique.mockResolvedValue(commentByOther as any);

      await expect(service.deleteComment(userId, commentId)).rejects.toThrow(AppError);
      await expect(service.deleteComment(userId, commentId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED',
      });
    });

    it('should throw COMMENT_NOT_FOUND when comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.deleteComment(userId, commentId)).rejects.toThrow(AppError);
      await expect(service.deleteComment(userId, commentId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'COMMENT_NOT_FOUND',
      });
    });

    it('should decrement parent repliesCount when deleting a reply', async () => {
      const replyComment = {
        ...mockCommentWithVideo,
        parentId: 'parent-id',
      };
      mockPrisma.comment.findUnique.mockResolvedValue(replyComment as any);

      const mockCommentUpdate = vi.fn();
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          comment: { delete: vi.fn(), update: mockCommentUpdate },
          video: { update: vi.fn() },
        });
      });

      await service.deleteComment(userId, commentId);

      expect(mockCommentUpdate).toHaveBeenCalledWith({
        where: { id: 'parent-id' },
        data: { repliesCount: { decrement: 1 } },
      });
    });
  });
});
