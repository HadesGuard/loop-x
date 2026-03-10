import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { shelbyService } from './shelby.service';
import { UploadVideoInput, VideoResponse } from '../types/video.types';
import { randomUUID } from 'crypto';
import { queueVideoProcessing } from '../queues/video-processing.queue';

export class VideoService {
  /**
   * Upload video to Shelby and store in database
   */
  async uploadVideo(
    userId: string,
    videoData: Buffer,
    metadata: UploadVideoInput,
    fileSize: number
  ): Promise<VideoResponse> {
    // Validate file size
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (fileSize > maxSize) {
      throw new AppError('Video file too large. Maximum size is 500MB', 400, 'FILE_TOO_LARGE');
    }

    // Generate video ID
    const videoId = randomUUID();

    // Create video record with "uploading" status
    await prisma.video.create({
      data: {
        id: videoId,
        userId,
        url: '', // Will be set after upload
        title: metadata.title,
        description: metadata.description,
        privacy: metadata.privacy || 'public',
        allowComments: metadata.allowComments !== false,
        allowDuet: metadata.allowDuet !== false,
        allowStitch: metadata.allowStitch !== false,
        status: 'uploading',
        fileSize: BigInt(fileSize),
      },
    });

    try {
      // Upload to Shelby
      logger.info(`Uploading video ${videoId} to Shelby for user ${userId}`);
      const shelbyResult = await shelbyService.uploadVideo(videoData, videoId, 30); // 30 days expiration

      // Update video with Shelby metadata (status remains 'uploading' until processing completes)
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          url: `shelby://${shelbyResult.account}/${shelbyResult.blobName}`,
          status: 'uploading', // Will be updated to 'processing' then 'ready' by worker
          shelbyAccount: shelbyResult.account,
          shelbyBlobName: shelbyResult.blobName,
          shelbyMerkleRoot: shelbyResult.merkleRoot,
          shelbyExpiration: shelbyResult.expirationMicros,
          shelbySize: BigInt(shelbyResult.size),
          shelbyChunksets: shelbyResult.chunksets,
        },
      });

      logger.info(`Video ${videoId} uploaded successfully to Shelby, queuing processing job`);

      // Queue video processing job (thumbnail, duration, transcoding)
      await queueVideoProcessing(videoId, false); // Set to true if you want transcoding

      return this.mapVideoToResponse(updatedVideo);
    } catch (error) {
      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      });

      logger.error(`Failed to upload video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get video by ID
   */
  async getVideoById(videoId: string, userId?: string): Promise<VideoResponse> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Check privacy
    if (video.privacy === 'private' && video.userId !== userId) {
      throw new AppError('Video is private', 403, 'VIDEO_PRIVATE');
    }

    return this.mapVideoToResponse(video);
  }

  /**
   * Stream video from Shelby
   */
  async streamVideo(videoId: string, userId?: string): Promise<{
    stream: ReadableStream;
    contentType: string;
    contentLength?: number;
  }> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Check privacy
    if (video.privacy === 'private' && video.userId !== userId) {
      throw new AppError('Video is private', 403, 'VIDEO_PRIVATE');
    }

    if (!video.shelbyAccount || !video.shelbyBlobName) {
      throw new AppError('Video not available on Shelby', 404, 'VIDEO_NOT_ON_SHELBY');
    }

    if (video.status !== 'ready') {
      throw new AppError('Video is not ready', 400, 'VIDEO_NOT_READY');
    }

    // Download from Shelby
    const stream = await shelbyService.downloadBlob(video.shelbyAccount, video.shelbyBlobName);

    return {
      stream,
      contentType: 'video/mp4',
      contentLength: video.shelbySize ? Number(video.shelbySize) : undefined,
    };
  }

  /**
   * Update video metadata (only owner can update)
   */
  async updateVideo(
    videoId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      privacy?: string;
      allowComments?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
    }
  ): Promise<VideoResponse> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (video.userId !== userId) {
      throw new AppError('You are not authorized to update this video', 403, 'FORBIDDEN');
    }

    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data,
    });

    return this.mapVideoToResponse(updatedVideo);
  }

  /**
   * Delete video (soft delete by setting status to 'deleted', only owner can delete)
   */
  async deleteVideo(videoId: string, userId: string): Promise<void> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (video.userId !== userId) {
      throw new AppError('You are not authorized to delete this video', 403, 'FORBIDDEN');
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'deleted' },
    });

    logger.info(`Video ${videoId} soft-deleted by user ${userId}`);
  }

  /**
   * Map Prisma video to response format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapVideoToResponse(video: any): VideoResponse {
    return {
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
    };
  }
}

export const videoService = new VideoService();

