import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { toPublicMediaUrl } from '../utils/cdn.util';

/**
 * Format large numbers (e.g., 2400000 -> "2.4M")
 */
function formatCount(count: number | bigint): string {
  const num = typeof count === 'bigint' ? Number(count) : count;
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export class SearchService {
  /**
   * Search for users, videos, and hashtags
   */
  async search(
    query: string,
    type: 'all' | 'users' | 'videos' | 'hashtags' = 'all',
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 20 } = options;
    const searchQuery = query.trim().toLowerCase();

    if (!searchQuery || searchQuery.length < 1) {
      throw new AppError('Search query is required', 400, 'INVALID_QUERY');
    }

    const results: {
      users: any[];
      videos: any[];
      hashtags: any[];
    } = {
      users: [],
      videos: [],
      hashtags: [],
    };

    // Search users (by username, fullName)
    if (type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            {
              username: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              fullName: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          _count: {
            select: { followers: true },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const usersWithStats = users.map((user) => ({
        id: user.id,
        username: `@${user.username}`,
        avatar: user.avatarUrl || null,
        followers: formatCount(user._count.followers),
        isVerified: user.isVerified,
      }));

      results.users = usersWithStats;
    }

    // Search videos (by title, description)
    if (type === 'all' || type === 'videos') {
      const videos = await prisma.video.findMany({
        where: {
          status: 'ready',
          privacy: 'public',
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [
          {
            likesCount: 'desc',
          },
          {
            views: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      results.videos = videos.map((video) => ({
        id: video.id,
        thumbnail: toPublicMediaUrl(video.thumbnailUrl),
        caption: video.title || video.description || '',
        username: `@${video.user.username}`,
        views: formatCount(video.views),
      }));
    }

    // Search hashtags
    if (type === 'all' || type === 'hashtags') {
      const hashtags = await prisma.hashtag.findMany({
        where: {
          tag: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [
          {
            views: 'desc',
          },
          {
            videosCount: 'desc',
          },
        ],
      });

      results.hashtags = hashtags.map((hashtag) => ({
        tag: hashtag.tag,
        views: formatCount(hashtag.views),
      }));
    }

    // Calculate total for pagination
    const totalResults =
      (type === 'all' || type === 'users' ? results.users.length : 0) +
      (type === 'all' || type === 'videos' ? results.videos.length : 0) +
      (type === 'all' || type === 'hashtags' ? results.hashtags.length : 0);

    return {
      ...results,
      pagination: {
        page,
        limit,
        hasMore: totalResults >= limit,
      },
    };
  }
}

export const searchService = new SearchService();
