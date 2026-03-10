import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { videoService } from '../services/video.service';
import { analyticsService } from '../services/analytics.service';
import { prisma } from '../config/database';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

/**
 * POST /videos
 * Upload video
 */
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (!req.file) {
    throw new AppError('Video file is required', 400, 'VIDEO_FILE_REQUIRED');
  }

  const videoData = Buffer.from(req.file.buffer);
  const metadata = {
    title: req.body.title,
    description: req.body.description,
    privacy: req.body.privacy || 'public',
    allowComments: req.body.allowComments !== 'false',
    allowDuet: req.body.allowDuet !== 'false',
    allowStitch: req.body.allowStitch !== 'false',
  };

  const video = await videoService.uploadVideo(
    userId,
    videoData,
    metadata,
    req.file.size
  );

  res.status(201).json({
    success: true,
    message: 'Video uploaded successfully',
    data: { video },
  });
};

/**
 * GET /videos/:id
 * Get video by ID
 */
export const getVideo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const video = await videoService.getVideoById(id, userId);

  res.json({
    success: true,
    data: { video },
  });
};

/**
 * PUT /videos/:id
 * Update video metadata
 */
export const updateVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const video = await videoService.updateVideo(id, userId, req.body);

  res.json({
    success: true,
    message: 'Video updated successfully',
    data: { video },
  });
};

/**
 * DELETE /videos/:id
 * Delete video
 */
export const deleteVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await videoService.deleteVideo(id, userId);

  res.json({
    success: true,
    message: 'Video deleted successfully',
  });
};

/**
 * GET /videos/:id/stream
 * Stream video from Shelby
 */
export const streamVideo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const { stream, contentType, contentLength } = await videoService.streamVideo(id, userId);

  // Track view (async, non-blocking)
  analyticsService.trackView(id, userId).catch((error) => {
    logger.warn('Failed to track view:', error);
  });

  // Set headers
  res.setHeader('Content-Type', contentType);
  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }
  res.setHeader('Accept-Ranges', 'bytes');

  // Convert ReadableStream to Node.js Readable stream
  const reader = stream.getReader();
  const nodeStream = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });

  // Pipe to response
  nodeStream.pipe(res);
};

/**
 * GET /videos/:id/hls
 * Get HLS streaming info for a video
 */
export const streamHLS = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      hlsManifestUrl: true,
      status: true,
      shelbyAccount: true,
      shelbyBlobName: true,
    },
  });

  if (!video) {
    throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
  }

  if (video.status !== 'ready') {
    throw new AppError('Video is not ready for streaming', 400, 'VIDEO_NOT_READY');
  }

  if (video.hlsManifestUrl) {
    res.json({
      success: true,
      data: {
        hlsUrl: video.hlsManifestUrl,
        type: 'hls',
      },
    });
  } else {
    // Fall back to regular stream URL
    res.json({
      success: true,
      data: {
        streamUrl: `/api/videos/${id}/stream`,
        type: 'direct',
      },
    });
  }
};

