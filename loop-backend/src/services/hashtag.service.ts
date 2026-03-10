import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { FeedItem } from '../types/feed.types';
import { formatCount } from '../utils/format';

export class HashtagService {
  /**
   * Get hashtag page with videos
   */
  async getHashtagPage(
    tag: string,
    options: {
      sort?: 'trending' | 'recent';
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { sort = 'trending', page = 1, limit = 20 } = options;
    const normalizedTag = tag.toLowerCase().replace(/^#/, ''); // Remove # if present

    // Get or create hashtag
    let hashtag = await prisma.hashtag.findUnique({
      where: { tag: normalizedTag },
    });

    if (!hashtag) {
      throw new AppError('Hashtag not found', 404, 'HASHTAG_NOT_FOUND');
    }

    // Build orderBy based on sort
    let orderBy: any = {};
    if (sort === 'trending') {
      // Trending: combination of views, likes, recency
      orderBy = [
        {
          likesCount: 'desc',
        },
        {
          views: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];
    } else {
      // Recent: newest first
      orderBy = {
        createdAt: 'desc',
      };
    }

    // Get videos with this hashtag
    const videoHashtags = await prisma.videoHashtag.findMany({
      where: {
        hashtag: normalizedTag,
        video: {
          status: 'ready',
          privacy: 'public',
        },
      },
      include: {
        video: {
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
        },
      },
      orderBy: {
        video: orderBy,
      },
      take: limit + 1,
      skip: (page - 1) * limit,
    });

    const hasMore = videoHashtags.length > limit;
    const videos = videoHashtags.slice(0, limit);

    // Format videos
    const formattedVideos: FeedItem[] = videos.map((vh) => ({
      id: vh.video.id,
      userId: vh.video.userId,
      url: vh.video.url,
      thumbnailUrl: vh.video.thumbnailUrl,
      title: vh.video.title,
      description: vh.video.description,
      views: Number(vh.video.views),
      likesCount: vh.video.likesCount,
      commentsCount: vh.video.commentsCount,
      sharesCount: vh.video.sharesCount,
      duration: vh.video.duration,
      fileSize: vh.video.fileSize ? Number(vh.video.fileSize) : null,
      privacy: vh.video.privacy,
      allowComments: vh.video.allowComments,
      allowDuet: vh.video.allowDuet,
      allowStitch: vh.video.allowStitch,
      status: vh.video.status,
      createdAt: vh.video.createdAt,
      updatedAt: vh.video.updatedAt,
      shelbyAccount: vh.video.shelbyAccount,
      shelbyBlobName: vh.video.shelbyBlobName,
      shelbyMerkleRoot: vh.video.shelbyMerkleRoot,
      shelbyExpiration: vh.video.shelbyExpiration ? vh.video.shelbyExpiration.toString() : null,
      shelbySize: vh.video.shelbySize ? Number(vh.video.shelbySize) : null,
      shelbyChunksets: vh.video.shelbyChunksets,
      user: {
        id: vh.video.user.id,
        username: vh.video.user.username,
        fullName: vh.video.user.fullName,
        avatarUrl: vh.video.user.avatarUrl,
        isVerified: vh.video.user.isVerified,
      },
    }));

    return {
      tag: normalizedTag,
      totalVideos: hashtag.videosCount,
      totalViews: formatCount(hashtag.views),
      videos: formattedVideos,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Get trending hashtags
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

    // Calculate growth (simplified - in production, compare with previous period)
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

export const hashtagService = new HashtagService();

