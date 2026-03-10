import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { FeedItem, FeedResponse, FeedQuery } from '../types/feed.types';

const CACHE_TTL = 300; // 5 minutes
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class FeedService {
  /**
   * Get "For You" feed - Algorithm: trending videos (based on likes, views, recency)
   */
  async getForYouFeed(userId: string, query: FeedQuery): Promise<FeedResponse> {
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const cacheKey = `feed:foryou:${userId}:${query.cursor || 'first'}:${limit}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Feed cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache error (non-fatal):', error);
    }

    // Calculate trending score: (likes * 2 + views * 0.1 + comments * 1.5) / age_in_hours
    // More recent videos get higher scores
    const videos = await prisma.video.findMany({
      where: {
        status: 'ready',
        privacy: 'public',
      },
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: [
        {
          // Order by trending score (calculated in SQL)
          // Formula: (likes_count * 2 + views * 0.1 + comments_count * 1.5) / GREATEST(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600, 1)
          createdAt: 'desc', // Fallback to recent first
        },
      ],
      select: {
        id: true,
        userId: true,
        url: true,
        thumbnailUrl: true,
        title: true,
        description: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        duration: true,
        fileSize: true,
        privacy: true,
        allowComments: true,
        allowDuet: true,
        allowStitch: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Calculate trending score and sort
    const videosWithScore = videos.map((video) => {
      const ageInHours = Math.max(
        (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60),
        1
      );
      const trendingScore =
        (video.likesCount * 2 + Number(video.views) * 0.1 + video.commentsCount * 1.5) /
        ageInHours;
      return { ...video, trendingScore };
    });

    // Sort by trending score (descending)
    videosWithScore.sort((a, b) => b.trendingScore - a.trendingScore);

    // Check if there are more videos
    let nextCursor: string | null = null;
    let hasMore = false;
    if (videosWithScore.length > limit) {
      hasMore = true;
      nextCursor = videosWithScore[limit].id;
      videosWithScore.pop();
    }

    // Map to FeedItem format
    const items: FeedItem[] = videosWithScore.map((video) => ({
      id: video.id,
      userId: video.userId,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      description: video.description,
      views: Number(video.views),
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      duration: video.duration,
      fileSize: video.fileSize ? Number(video.fileSize) : null,
      privacy: video.privacy,
      allowComments: video.allowComments,
      allowDuet: video.allowDuet,
      allowStitch: video.allowStitch,
      status: video.status,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      shelbyAccount: null,
      shelbyBlobName: null,
      shelbyMerkleRoot: null,
      shelbyExpiration: null,
      shelbySize: null,
      shelbyChunksets: null,
      user: {
        id: video.user.id,
        username: video.user.username,
        fullName: video.user.fullName,
        avatarUrl: video.user.avatarUrl,
        isVerified: video.user.isVerified,
      },
    }));

    const response: FeedResponse = {
      items,
      nextCursor,
      hasMore,
    };

    // Cache the response
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (error) {
      logger.warn('Redis cache set error (non-fatal):', error);
    }

    return response;
  }

  /**
   * Get "Following" feed - Videos from users that the current user follows
   */
  async getFollowingFeed(userId: string, query: FeedQuery): Promise<FeedResponse> {
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const cacheKey = `feed:following:${userId}:${query.cursor || 'first'}:${limit}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Feed cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache error (non-fatal):', error);
    }

    // Get list of users that the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // If user doesn't follow anyone, return empty feed
    if (followingIds.length === 0) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Get videos from followed users
    const videos = await prisma.video.findMany({
      where: {
        userId: { in: followingIds },
        status: 'ready',
        privacy: { in: ['public', 'friends'] }, // Include friends-only videos
      },
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        url: true,
        thumbnailUrl: true,
        title: true,
        description: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        duration: true,
        fileSize: true,
        privacy: true,
        allowComments: true,
        allowDuet: true,
        allowStitch: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Check if there are more videos
    let nextCursor: string | null = null;
    let hasMore = false;
    if (videos.length > limit) {
      hasMore = true;
      nextCursor = videos[limit].id;
      videos.pop();
    }

    // Map to FeedItem format
    const items: FeedItem[] = videos.map((video) => ({
      id: video.id,
      userId: video.userId,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      description: video.description,
      views: Number(video.views),
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      duration: video.duration,
      fileSize: video.fileSize ? Number(video.fileSize) : null,
      privacy: video.privacy,
      allowComments: video.allowComments,
      allowDuet: video.allowDuet,
      allowStitch: video.allowStitch,
      status: video.status,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      shelbyAccount: null,
      shelbyBlobName: null,
      shelbyMerkleRoot: null,
      shelbyExpiration: null,
      shelbySize: null,
      shelbyChunksets: null,
      user: {
        id: video.user.id,
        username: video.user.username,
        fullName: video.user.fullName,
        avatarUrl: video.user.avatarUrl,
        isVerified: video.user.isVerified,
      },
    }));

    const response: FeedResponse = {
      items,
      nextCursor,
      hasMore,
    };

    // Cache the response
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (error) {
      logger.warn('Redis cache set error (non-fatal):', error);
    }

    return response;
  }

  /**
   * Invalidate feed cache for a user (call when user follows/unfollows or uploads video)
   */
  async invalidateFeedCache(userId: string): Promise<void> {
    try {
      const pattern = `feed:*:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Invalidated ${keys.length} feed cache entries for user ${userId}`);
      }
    } catch (error) {
      logger.warn('Feed cache invalidation error (non-fatal):', error);
    }
  }
}

export const feedService = new FeedService();



