import { prisma } from '../config/database';
import { FeedItem } from '../types/feed.types';
import { formatCount } from '../utils/format';

export class DiscoveryService {
  /**
   * Get trending videos
   */
  async getTrendingVideos(
    options: {
      page?: number;
      limit?: number;
      timeframe?: 'day' | 'week' | 'month';
    } = {}
  ) {
    const { page = 1, limit = 20, timeframe = 'week' } = options;

    // Calculate date threshold based on timeframe
    const now = new Date();
    let dateThreshold: Date;
    switch (timeframe) {
      case 'day':
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get trending videos (based on likes, views, comments, recency)
    const videos = await prisma.video.findMany({
      where: {
        status: 'ready',
        privacy: 'public',
        createdAt: {
          gte: dateThreshold,
        },
      },
      include: {
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
      orderBy: [
        {
          likesCount: 'desc',
        },
        {
          views: 'desc',
        },
        {
          commentsCount: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit + 1,
      skip: (page - 1) * limit,
    });

    const hasMore = videos.length > limit;
    const videosToReturn = videos.slice(0, limit);

    // Format videos
    const formattedVideos: FeedItem[] = videosToReturn.map((video) => ({
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
      shelbyAccount: video.shelbyAccount,
      shelbyBlobName: video.shelbyBlobName,
      shelbyMerkleRoot: video.shelbyMerkleRoot,
      shelbyExpiration: video.shelbyExpiration ? video.shelbyExpiration.toString() : null,
      shelbySize: video.shelbySize ? Number(video.shelbySize) : null,
      shelbyChunksets: video.shelbyChunksets,
      user: {
        id: video.user.id,
        username: video.user.username,
        fullName: video.user.fullName,
        avatarUrl: video.user.avatarUrl,
        isVerified: video.user.isVerified,
      },
    }));

    return {
      videos: formattedVideos,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Get top creators
   */
  async getTopCreators(
    options: {
      limit?: number;
      category?: string;
    } = {}
  ) {
    const { limit = 20 } = options;

    // Get users with most followers and videos
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
      },
      take: limit * 2, // Get more to calculate stats
    });

    // Get stats for each user
    const creatorsWithStats = await Promise.all(
      users.map(async (user) => {
        const [followersCount, videosCount] = await Promise.all([
          prisma.follow.count({
            where: { followingId: user.id },
          }),
          prisma.video.count({
            where: { userId: user.id, status: 'ready' },
          }),
        ]);

        return {
          id: user.id,
          username: `@${user.username}`,
          avatar: user.avatarUrl || null,
          followers: formatCount(followersCount),
          isVerified: user.isVerified,
          bio: user.bio || null,
          followersCount,
          videosCount,
        };
      })
    );

    // Sort by followers count and take top N
    const topCreators = creatorsWithStats
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, limit)
      .map((creator, index) => ({
        ...creator,
        rank: index + 1,
      }));

    return {
      creators: topCreators,
    };
  }

  /**
   * Get trending hashtags (alias for hashtag service)
   */
  async getTrendingHashtags(limit: number = 20) {
    const hashtags = await prisma.hashtag.findMany({
      orderBy: [
        {
          views: 'desc',
        },
        {
          videosCount: 'desc',
        },
      ],
      take: limit,
    });

    const formattedHashtags = hashtags.map((hashtag) => ({
      tag: hashtag.tag,
      views: formatCount(hashtag.views),
      growth: '+0%', // Placeholder — requires historical data comparison
      videosCount: hashtag.videosCount,
    }));

    return {
      hashtags: formattedHashtags,
    };
  }
}

export const discoveryService = new DiscoveryService();

