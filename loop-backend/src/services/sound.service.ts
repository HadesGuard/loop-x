import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { toPublicMediaUrl } from '../utils/cdn.util';

export class SoundService {
  /**
   * Get list of sounds
   */
  async getSounds(params: {
    page?: number;
    limit?: number;
    sort?: 'trending' | 'recent' | 'popular' | 'alphabetical';
    genre?: string;
    duration?: string;
    search?: string;
    userId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (params.genre) {
      where.genre = params.genre;
    }

    if (params.duration) {
      const [min, max] = params.duration.split('-').map(Number);
      where.duration = {
        gte: min || 0,
        lte: max || 999999,
      };
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { artist: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'trending') {
      orderBy = { totalVideos: 'desc' };
    } else if (params.sort === 'popular') {
      orderBy = { totalViews: 'desc' };
    } else if (params.sort === 'alphabetical') {
      orderBy = { title: 'asc' };
    }

    const [sounds, total] = await Promise.all([
      prisma.sound.findMany({
        where,
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.sound.count({ where }),
    ]);

    // Check if user has favorited each sound
    const soundIds = sounds.map((s) => s.id);
    const favorites = params.userId
      ? await prisma.soundFavorite.findMany({
          where: {
            userId: params.userId,
            soundId: { in: soundIds },
          },
        })
      : [];

    const favoriteSet = new Set(favorites.map((f) => f.soundId));

    return {
      sounds: sounds.map((sound) => ({
        id: sound.id,
        title: sound.title,
        artist: sound.artist || `@${sound.user.username}`,
        artistId: sound.userId,
        artistInfo: {
          id: sound.user.id,
          username: sound.user.username,
          avatar: sound.user.avatarUrl,
          isVerified: sound.user.isVerified,
        },
        duration: sound.duration,
        url: toPublicMediaUrl(sound.url) || sound.url,
        thumbnail: toPublicMediaUrl(sound.thumbnailUrl),
        genre: sound.genre,
        totalVideos: sound.totalVideos,
        totalViews: sound.totalViews.toString(),
        isFavorited: favoriteSet.has(sound.id),
        isOriginal: sound.isOriginal,
        createdAt: sound.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    };
  }

  /**
   * Get sound details
   */
  async getSoundById(soundId: string, userId?: string) {
    const sound = await prisma.sound.findUnique({
      where: { id: soundId },
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
    });

    if (!sound || !sound.isActive) {
      throw new AppError('Sound not found', 404, 'SOUND_NOT_FOUND');
    }

    const isFavorited = userId
      ? !!(await prisma.soundFavorite.findUnique({
          where: {
            userId_soundId: {
              userId,
              soundId,
            },
          },
        }))
      : false;

    return {
      id: sound.id,
      title: sound.title,
      artist: sound.artist || `@${sound.user.username}`,
      artistId: sound.userId,
      artistInfo: {
        id: sound.user.id,
        username: sound.user.username,
        avatar: sound.user.avatarUrl,
        isVerified: sound.user.isVerified,
      },
      duration: sound.duration,
      url: toPublicMediaUrl(sound.url) || sound.url,
      thumbnail: toPublicMediaUrl(sound.thumbnailUrl),
      genre: sound.genre,
      tags: sound.tags,
      totalVideos: sound.totalVideos,
      totalViews: sound.totalViews.toString(),
      totalLikes: sound.totalLikes,
      isFavorited,
      isOriginal: sound.isOriginal,
      description: sound.description,
      createdAt: sound.createdAt,
      updatedAt: sound.updatedAt,
    };
  }

  /**
   * Get videos using a sound
   */
  async getSoundVideos(
    soundId: string,
    params: {
      page?: number;
      limit?: number;
      sort?: 'trending' | 'recent' | 'popular';
    }
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const sound = await prisma.sound.findUnique({
      where: { id: soundId },
      select: { id: true, title: true },
    });

    if (!sound) {
      throw new AppError('Sound not found', 404, 'SOUND_NOT_FOUND');
    }

    // Note: Currently using createdAt for sorting
    // In future, can add views/likesCount to VideoSound model for better sorting
    const [videoSounds, total] = await Promise.all([
      prisma.videoSound.findMany({
        where: { soundId },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.videoSound.count({ where: { soundId } }),
    ]);

    // Sort videos based on sort param
    const videos = videoSounds.map((vs) => vs.video);
    if (params.sort === 'trending') {
      videos.sort((a, b) => Number(b.views) - Number(a.views));
    } else if (params.sort === 'popular') {
      videos.sort((a, b) => b.likesCount - a.likesCount);
    }

    return {
      sound: {
        id: sound.id,
        title: sound.title,
      },
      videos: videos.map((video) => ({
        id: video.id,
        thumbnail: toPublicMediaUrl(video.thumbnailUrl),
        caption: video.title,
        username: video.user.username,
        views: video.views.toString(),
        likes: video.likesCount,
        duration: video.duration,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    };
  }

  /**
   * Toggle favorite sound
   */
  async toggleFavorite(userId: string, soundId: string): Promise<boolean> {
    const existing = await prisma.soundFavorite.findUnique({
      where: {
        userId_soundId: {
          userId,
          soundId,
        },
      },
    });

    if (existing) {
      await prisma.soundFavorite.delete({
        where: {
          userId_soundId: {
            userId,
            soundId,
          },
        },
      });
      return false;
    } else {
      await prisma.soundFavorite.create({
        data: {
          userId,
          soundId,
        },
      });
      return true;
    }
  }

  /**
   * Get user's favorite sounds
   */
  async getFavoriteSounds(userId: string, params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.soundFavorite.findMany({
        where: { userId },
        include: {
          sound: {
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.soundFavorite.count({ where: { userId } }),
    ]);

    return {
      sounds: favorites.map((fav) => ({
        id: fav.sound.id,
        title: fav.sound.title,
        artist: fav.sound.artist || `@${fav.sound.user.username}`,
        artistId: fav.sound.userId,
        duration: fav.sound.duration,
        url: toPublicMediaUrl(fav.sound.url) || fav.sound.url,
        thumbnail: toPublicMediaUrl(fav.sound.thumbnailUrl),
        genre: fav.sound.genre,
        totalVideos: fav.sound.totalVideos,
        totalViews: fav.sound.totalViews.toString(),
        isFavorited: true,
        isOriginal: fav.sound.isOriginal,
        createdAt: fav.sound.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    };
  }

  /**
   * Get trending sounds
   */
  async getTrendingSounds(params: {
    timeframe?: 'day' | 'week' | 'month';
    limit?: number;
    genre?: string;
  }) {
    const limit = Math.min(params.limit || 20, 50);
    const timeframe = params.timeframe || 'week';

    // Calculate date threshold
    const threshold = new Date();
    if (timeframe === 'day') {
      threshold.setDate(threshold.getDate() - 1);
    } else if (timeframe === 'week') {
      threshold.setDate(threshold.getDate() - 7);
    } else {
      threshold.setMonth(threshold.getMonth() - 1);
    }

    const where: any = {
      isActive: true,
      createdAt: { gte: threshold },
    };

    if (params.genre) {
      where.genre = params.genre;
    }

    const sounds = await prisma.sound.findMany({
      where,
      orderBy: { totalVideos: 'desc' },
      take: limit,
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
    });

    return {
      sounds: sounds.map((sound) => ({
        id: sound.id,
        title: sound.title,
        artist: sound.artist || `@${sound.user.username}`,
        duration: sound.duration,
        url: toPublicMediaUrl(sound.url) || sound.url,
        thumbnail: toPublicMediaUrl(sound.thumbnailUrl),
        genre: sound.genre,
        totalVideos: sound.totalVideos,
        totalViews: sound.totalViews.toString(),
        isOriginal: sound.isOriginal,
        createdAt: sound.createdAt,
      })),
      timeframe,
    };
  }

  /**
   * Get available genres
   */
  async getGenres() {
    const genres = await prisma.sound.groupBy({
      by: ['genre'],
      where: {
        isActive: true,
        genre: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    return genres.map((g) => ({
      id: g.genre!,
      name: g.genre!,
      soundCount: g._count.id,
    }));
  }

  /**
   * Search sounds
   */
  async searchSounds(params: {
    q: string;
    page?: number;
    limit?: number;
    genre?: string;
  }) {
    return this.getSounds({
      search: params.q,
      page: params.page,
      limit: params.limit,
      genre: params.genre,
    });
  }
}

export const soundService = new SoundService();

