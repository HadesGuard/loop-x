import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from './notification.service';
import { analyticsService } from './analytics.service';

export class InteractionService {
  /**
   * Like or unlike a video
   */
  async toggleLikeVideo(userId: string, videoId: string): Promise<{
    liked: boolean;
    likesCount: number;
  }> {
    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Check if already liked
    const existingLike = await prisma.videoLike.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (existingLike) {
      // Unlike: delete like and decrement count
      await prisma.$transaction([
        prisma.videoLike.delete({
          where: {
            userId_videoId: {
              userId,
              videoId,
            },
          },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updatedVideo = await prisma.video.findUnique({
        where: { id: videoId },
        select: { likesCount: true },
      });

      return {
        liked: false,
        likesCount: updatedVideo?.likesCount || 0,
      };
    } else {
      // Like: create like and increment count
      await prisma.$transaction([
        prisma.videoLike.create({
          data: {
            userId,
            videoId,
          },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      const updatedVideo = await prisma.video.findUnique({
        where: { id: videoId },
        select: { likesCount: true, userId: true },
      });

      // Create notification for video owner
      if (updatedVideo && updatedVideo.userId !== userId) {
        await notificationService.createNotification({
          userId: updatedVideo.userId,
          type: 'like',
          actorId: userId,
          videoId,
        });

        // Emit real-time WebSocket event to video owner
        try {
          const { getWebSocketService } = await import('./websocket.service');
          const wsService = getWebSocketService();
          if (wsService) {
            wsService.emitToUser(updatedVideo.userId, 'video:like', { videoId, userId });
          }
        } catch {}
      }

      // Update analytics
      analyticsService.updateAnalytics(videoId, 'like', true).catch((error) => {
        logger.error('Error updating analytics for like:', error);
      });

      return {
        liked: true,
        likesCount: updatedVideo?.likesCount || 0,
      };
    }
  }

  /**
   * Save or unsave a video
   */
  async toggleSaveVideo(userId: string, videoId: string): Promise<{
    saved: boolean;
  }> {
    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Check if already saved
    const existingSave = await prisma.videoSave.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (existingSave) {
      // Unsave
      await prisma.videoSave.delete({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      return { saved: false };
    } else {
      // Save
      await prisma.videoSave.create({
        data: {
          userId,
          videoId,
        },
      });

      return { saved: true };
    }
  }

  /**
   * Share a video (increment share count)
   */
  async shareVideo(
    userId: string,
    videoId: string,
    platform?: string
  ): Promise<{
    shareUrl: string;
    sharesCount: number;
  }> {
    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Increment share count
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        sharesCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        sharesCount: true,
      },
    });

    // Generate share URL (in production, use actual domain)
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/video/${videoId}`;

    logger.info(`Video ${videoId} shared by user ${userId} on platform ${platform || 'unknown'}`);

    return {
      shareUrl,
      sharesCount: updatedVideo.sharesCount,
    };
  }

  /**
   * Get comments for a video
   */
  async getComments(
    videoId: string,
    userId?: string,
    options: {
      page?: number;
      limit?: number;
      sort?: 'newest' | 'oldest' | 'popular';
    } = {}
  ) {
    const { page = 1, limit = 20, sort = 'newest' } = options;

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Build orderBy based on sort
    let orderBy: any = {};
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'popular') {
      orderBy = { likesCount: 'desc' };
    }

    // Get top-level comments (no parent)
    const comments = await prisma.comment.findMany({
      where: {
        videoId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        replies: {
          take: 3, // Show top 3 replies
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        ...(userId && {
          commentLikes: {
            where: {
              userId,
            },
          },
        }),
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.comment.count({
      where: {
        videoId,
        parentId: null,
      },
    });

    // Format comments
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      username: `@${comment.user.username}`,
      user: {
        id: comment.user.id,
        username: `@${comment.user.username}`,
        avatar: comment.user.avatarUrl || null,
      },
      text: comment.text,
      likes: comment.likesCount,
      isLiked: userId ? (comment as any).commentLikes?.length > 0 : false,
      timestamp: formatDistanceToNow(comment.createdAt, { addSuffix: true }),
      createdAt: comment.createdAt.toISOString(),
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        username: `@${reply.user.username}`,
        text: reply.text,
        likes: reply.likesCount,
        timestamp: formatDistanceToNow(reply.createdAt, { addSuffix: true }),
        createdAt: reply.createdAt.toISOString(),
      })),
      repliesCount: comment.repliesCount,
    }));

    return {
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: page * limit < totalCount,
      },
    };
  }

  /**
   * Add a comment to a video
   */
  async addComment(
    userId: string,
    videoId: string,
    text: string,
    parentId?: string
  ) {
    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Check if comments are allowed
    if (!video.allowComments) {
      throw new AppError('Comments are disabled for this video', 403, 'COMMENTS_DISABLED');
    }

    // If parentId is provided, verify it exists and belongs to the same video
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new AppError('Parent comment not found', 404, 'PARENT_COMMENT_NOT_FOUND');
      }

      if (parentComment.videoId !== videoId) {
        throw new AppError('Parent comment does not belong to this video', 400, 'INVALID_PARENT');
      }
    }

    // Create comment
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          videoId,
          userId,
          parentId: parentId || null,
          text,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Update video comments count
      await tx.video.update({
        where: { id: videoId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      });

      // If it's a reply, update parent comment replies count
      if (parentId) {
        await tx.comment.update({
          where: { id: parentId },
          data: {
            repliesCount: {
              increment: 1,
            },
          },
        });
      }

      return newComment;
    });

    // Create notifications
    if (parentId) {
      // Reply to comment - notify comment owner
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parentComment && parentComment.userId !== userId) {
        await notificationService.createNotification({
          userId: parentComment.userId,
          type: 'reply',
          actorId: userId,
          videoId,
          commentId: parentId,
        });
      }
    } else {
      // Comment on video - notify video owner
      if (video.userId !== userId) {
        await notificationService.createNotification({
          userId: video.userId,
          type: 'comment',
          actorId: userId,
          videoId,
          commentId: comment.id,
        });

        // Emit real-time WebSocket event to video owner
        try {
          const { getWebSocketService } = await import('./websocket.service');
          const wsService = getWebSocketService();
          if (wsService) {
            wsService.emitToUser(video.userId, 'video:comment', {
              videoId,
              userId,
              commentId: comment.id,
            });
          }
        } catch {}
      }

      // Update analytics for comment
      analyticsService.updateAnalytics(videoId, 'comment', true).catch((error) => {
        logger.error('Error updating analytics for comment:', error);
      });
    }

    return {
      id: comment.id,
      username: `@${comment.user.username}`,
      text: comment.text,
      likes: 0,
      timestamp: 'Just now',
      createdAt: comment.createdAt.toISOString(),
      replies: [],
    };
  }

  /**
   * Like or unlike a comment
   */
  async toggleLikeComment(userId: string, commentId: string): Promise<{
    liked: boolean;
    likes: number;
  }> {
    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.commentLike.delete({
          where: {
            userId_commentId: {
              userId,
              commentId,
            },
          },
        }),
        prisma.comment.update({
          where: { id: commentId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return {
        liked: false,
        likes: updatedComment?.likesCount || 0,
      };
    } else {
      // Like
      await prisma.$transaction([
        prisma.commentLike.create({
          data: {
            userId,
            commentId,
          },
        }),
        prisma.comment.update({
          where: { id: commentId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return {
        liked: true,
        likes: updatedComment?.likesCount || 0,
      };
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(userId: string, commentId: string): Promise<void> {
    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        video: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    // Check if user is the comment owner or video owner
    if (comment.userId !== userId && comment.video.userId !== userId) {
      throw new AppError('Not authorized to delete this comment', 403, 'UNAUTHORIZED');
    }

    // Delete comment and update counts
    await prisma.$transaction(async (tx) => {
      // Delete the comment (cascade will delete replies and likes)
      await tx.comment.delete({
        where: { id: commentId },
      });

      // Update video comments count
      await tx.video.update({
        where: { id: comment.videoId },
        data: {
          commentsCount: {
            decrement: 1,
          },
        },
      });

      // If it's a reply, update parent comment replies count
      if (comment.parentId) {
        await tx.comment.update({
          where: { id: comment.parentId },
          data: {
            repliesCount: {
              decrement: 1,
            },
          },
        });
      }
    });

    logger.info(`Comment ${commentId} deleted by user ${userId}`);
  }
}

export const interactionService = new InteractionService();
