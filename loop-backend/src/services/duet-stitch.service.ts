import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { videoService } from './video.service';
import { UploadVideoInput } from '../types/video.types';

export class DuetStitchService {
  /**
   * Create a duet video
   */
  async createDuet(
    userId: string,
    originalVideoId: string,
    videoData: Buffer,
    metadata: UploadVideoInput & {
      position: 'left' | 'right';
      alignment: 'top' | 'center' | 'bottom';
    },
    fileSize: number
  ) {
    // Check original video exists and allows duets
    const originalVideo = await prisma.video.findUnique({
      where: { id: originalVideoId },
    });

    if (!originalVideo) {
      throw new AppError('Original video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (originalVideo.privacy === 'private') {
      throw new AppError('Cannot duet private video', 403, 'PRIVATE_VIDEO');
    }

    if (!originalVideo.allowDuet) {
      throw new AppError('Duet not allowed for this video', 403, 'DUET_NOT_ALLOWED');
    }

    // Upload the new video
    const newVideo = await videoService.uploadVideo(userId, videoData, metadata, fileSize);

    // Create video relation
    await prisma.videoRelation.create({
      data: {
        videoId: newVideo.id,
        relatedVideoId: originalVideoId,
        relationType: 'duet',
        metadata: {
          position: metadata.position,
          alignment: metadata.alignment,
        },
      },
    });

    // Increment duets count on original video
    await prisma.video.update({
      where: { id: originalVideoId },
      data: {
        duetsCount: { increment: 1 },
      },
    });

    logger.info(`Duet created: ${newVideo.id} from ${originalVideoId}`);

    return {
      id: newVideo.id,
      originalVideoId,
      type: 'duet',
      position: metadata.position,
      status: newVideo.status,
      createdAt: newVideo.createdAt,
    };
  }

  /**
   * Create a stitch video
   */
  async createStitch(
    userId: string,
    originalVideoId: string,
    videoData: Buffer,
    metadata: UploadVideoInput & {
      clipStartTime: number;
      clipEndTime: number;
      clipDuration: number;
    },
    fileSize: number
  ) {
    // Check original video exists and allows stitches
    const originalVideo = await prisma.video.findUnique({
      where: { id: originalVideoId },
    });

    if (!originalVideo) {
      throw new AppError('Original video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (originalVideo.privacy === 'private') {
      throw new AppError('Cannot stitch private video', 403, 'PRIVATE_VIDEO');
    }

    if (!originalVideo.allowStitch) {
      throw new AppError('Stitch not allowed for this video', 403, 'STITCH_NOT_ALLOWED');
    }

    // Validate clip times
    if (metadata.clipStartTime < 0 || metadata.clipEndTime <= metadata.clipStartTime) {
      throw new AppError('Invalid clip times', 400, 'INVALID_CLIP_TIME');
    }

    if (metadata.clipDuration > 15) {
      throw new AppError('Clip duration exceeds limit (15 seconds)', 400, 'CLIP_TOO_LONG');
    }

    // Upload the new video
    const newVideo = await videoService.uploadVideo(userId, videoData, metadata, fileSize);

    // Create video relation
    await prisma.videoRelation.create({
      data: {
        videoId: newVideo.id,
        relatedVideoId: originalVideoId,
        relationType: 'stitch',
        metadata: {
          clipStartTime: metadata.clipStartTime,
          clipEndTime: metadata.clipEndTime,
          clipDuration: metadata.clipDuration,
        },
      },
    });

    // Increment stitches count on original video
    await prisma.video.update({
      where: { id: originalVideoId },
      data: {
        stitchesCount: { increment: 1 },
      },
    });

    logger.info(`Stitch created: ${newVideo.id} from ${originalVideoId}`);

    return {
      id: newVideo.id,
      originalVideoId,
      type: 'stitch',
      clipStartTime: metadata.clipStartTime,
      clipEndTime: metadata.clipEndTime,
      status: newVideo.status,
      createdAt: newVideo.createdAt,
    };
  }

  /**
   * Get duets for a video
   */
  async getDuets(
    videoId: string,
    params: {
      page?: number;
      limit?: number;
      sort?: 'recent' | 'popular' | 'trending';
    }
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const originalVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true },
    });

    if (!originalVideo) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'popular') {
      orderBy = { video: { likesCount: 'desc' } };
    } else if (params.sort === 'trending') {
      orderBy = { video: { views: 'desc' } };
    }

    const [relations, total] = await Promise.all([
      prisma.videoRelation.findMany({
        where: {
          relatedVideoId: videoId,
          relationType: 'duet',
        },
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.videoRelation.count({
        where: {
          relatedVideoId: videoId,
          relationType: 'duet',
        },
      }),
    ]);

    return {
      originalVideo: {
        id: originalVideo.id,
        title: originalVideo.title,
      },
      duets: relations.map((rel) => ({
        id: rel.video.id,
        thumbnail: rel.video.thumbnailUrl,
        username: rel.video.user.username,
        caption: rel.video.title,
        views: rel.video.views.toString(),
        likes: rel.video.likesCount,
        createdAt: rel.video.createdAt,
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
   * Get stitches for a video
   */
  async getStitches(
    videoId: string,
    params: {
      page?: number;
      limit?: number;
      sort?: 'recent' | 'popular' | 'trending';
    }
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const originalVideo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true },
    });

    if (!originalVideo) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'popular') {
      orderBy = { video: { likesCount: 'desc' } };
    } else if (params.sort === 'trending') {
      orderBy = { video: { views: 'desc' } };
    }

    const [relations, total] = await Promise.all([
      prisma.videoRelation.findMany({
        where: {
          relatedVideoId: videoId,
          relationType: 'stitch',
        },
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.videoRelation.count({
        where: {
          relatedVideoId: videoId,
          relationType: 'stitch',
        },
      }),
    ]);

    return {
      originalVideo: {
        id: originalVideo.id,
        title: originalVideo.title,
      },
      stitches: relations.map((rel) => ({
        id: rel.video.id,
        thumbnail: rel.video.thumbnailUrl,
        username: rel.video.user.username,
        caption: rel.video.title,
        views: rel.video.views.toString(),
        likes: rel.video.likesCount,
        clipInfo: rel.metadata as any,
        createdAt: rel.video.createdAt,
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
   * Get duet info for a video
   */
  async getDuetInfo(videoId: string) {
    const relation = await prisma.videoRelation.findFirst({
      where: {
        videoId,
        relationType: 'duet',
      },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        relatedVideo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!relation) {
      return {
        isDuet: false,
      };
    }

    const metadata = relation.metadata as any;

    return {
      isDuet: true,
      originalVideo: {
        id: relation.relatedVideo.id,
        title: relation.relatedVideo.title,
        username: relation.relatedVideo.user.username,
        thumbnail: relation.relatedVideo.thumbnailUrl,
      },
      duetVideo: {
        id: relation.video.id,
        title: relation.video.title,
        username: relation.video.user.username,
        thumbnail: relation.video.thumbnailUrl,
      },
      position: metadata.position,
      alignment: metadata.alignment,
    };
  }

  /**
   * Get stitch info for a video
   */
  async getStitchInfo(videoId: string) {
    const relation = await prisma.videoRelation.findFirst({
      where: {
        videoId,
        relationType: 'stitch',
      },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        relatedVideo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!relation) {
      return {
        isStitch: false,
      };
    }

    const metadata = relation.metadata as any;

    return {
      isStitch: true,
      originalVideo: {
        id: relation.relatedVideo.id,
        title: relation.relatedVideo.title,
        username: relation.relatedVideo.user.username,
        thumbnail: relation.relatedVideo.thumbnailUrl,
      },
      stitchVideo: {
        id: relation.video.id,
        title: relation.video.title,
        username: relation.video.user.username,
        thumbnail: relation.video.thumbnailUrl,
      },
      clipInfo: {
        startTime: metadata.clipStartTime,
        endTime: metadata.clipEndTime,
        duration: metadata.clipDuration,
      },
    };
  }
}

export const duetStitchService = new DuetStitchService();



