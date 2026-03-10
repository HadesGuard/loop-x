import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { formatDistanceToNow } from 'date-fns';

export class WatchHistoryService {
  /**
   * Add or update video in watch history
   */
  async addToHistory(userId: string, videoId: string, watchedDuration: number) {
    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Upsert watch history
    await prisma.watchHistory.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        watchedDuration: watchedDuration,
        createdAt: new Date(), // Update timestamp on rewatch
      },
      create: {
        userId,
        videoId,
        watchedDuration: watchedDuration,
      },
    });

    logger.debug(`Watch history updated: user ${userId}, video ${videoId}, duration ${watchedDuration}s`);
  }

  /**
   * Get watch history for a user
   */
  async getHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 50 } = options;

    const history = await prisma.watchHistory.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      skip: (page - 1) * limit,
    });

    const hasMore = history.length > limit;
    const historyToReturn = history.slice(0, limit);

    // Format history
    const formattedHistory = historyToReturn.map((item) => ({
      id: item.id,
      video: {
        id: item.video.id,
        thumbnail: item.video.thumbnailUrl || null,
        title: item.video.title,
        description: item.video.description,
        duration: item.video.duration,
        views: Number(item.video.views),
        likesCount: item.video.likesCount,
        user: {
          id: item.video.user.id,
          username: `@${item.video.user.username}`,
          avatar: item.video.user.avatarUrl || null,
          isVerified: item.video.user.isVerified,
        },
      },
      watchedDuration: item.watchedDuration,
      watchedAt: formatDistanceToNow(item.createdAt, { addSuffix: true }),
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      history: formattedHistory,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Clear watch history for a user
   */
  async clearHistory(userId: string) {
    await prisma.watchHistory.deleteMany({
      where: { userId },
    });

    logger.info(`Watch history cleared for user ${userId}`);
  }

  /**
   * Remove a video from watch history
   */
  async removeFromHistory(userId: string, videoId: string) {
    await prisma.watchHistory.deleteMany({
      where: {
        userId,
        videoId,
      },
    });

    logger.info(`Video ${videoId} removed from watch history for user ${userId}`);
  }
}

export const watchHistoryService = new WatchHistoryService();



