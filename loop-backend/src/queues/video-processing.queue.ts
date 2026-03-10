import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';
import { videoProcessingService } from '../services/video-processing.service';
import { prisma } from '../config/database';
import { feedService } from '../services/feed.service';

export interface VideoProcessingJobData {
  videoId: string;
  transcode?: boolean;
}

// Create queue
export const videoProcessingQueue = new Queue<VideoProcessingJobData>('video-processing', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Create worker
export const videoProcessingWorker = new Worker<VideoProcessingJobData>(
  'video-processing',
  async (job: Job<VideoProcessingJobData>) => {
    const { videoId, transcode = false } = job.data;

    logger.info(`Processing video ${videoId} (transcode: ${transcode})`);

    try {
      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'processing' },
      });

      // Emit downloading stage
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { userId: true },
      });
      const videoUserId = video?.userId;

      if (videoUserId) {
        try {
          const { getWebSocketService } = await import('../services/websocket.service');
          const ws = getWebSocketService();
          if (ws) ws.emitVideoProcessingUpdate(videoUserId, videoId, 'downloading', 10);
        } catch {}
      }

      // Download video from Shelby
      const videoBuffer = await videoProcessingService.downloadVideoForProcessing(videoId);

      if (videoUserId) {
        try {
          const { getWebSocketService } = await import('../services/websocket.service');
          const ws = getWebSocketService();
          if (ws) ws.emitVideoProcessingUpdate(videoUserId, videoId, 'processing', 30);
        } catch {}
      }

      // Process video (thumbnail, duration, transcoding)
      const result = await videoProcessingService.processVideo(videoId, videoBuffer, transcode);

      if (videoUserId) {
        try {
          const { getWebSocketService } = await import('../services/websocket.service');
          const ws = getWebSocketService();
          if (ws) ws.emitVideoProcessingUpdate(videoUserId, videoId, 'finalizing', 80);
        } catch {}
      }

      // Update video with processing results
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          hlsManifestUrl: result.hlsManifestUrl || null,
          status: 'ready',
        },
        select: { userId: true },
      });

      logger.info(`Video ${videoId} processed successfully`);

      // Invalidate feed cache for all users (new video available)
      // Note: In production, you might want to invalidate more selectively
      await feedService.invalidateFeedCache(updatedVideo.userId);

      // Emit processing complete
      if (updatedVideo.userId) {
        try {
          const { getWebSocketService } = await import('../services/websocket.service');
          const ws = getWebSocketService();
          if (ws) {
            ws.emitVideoProcessingComplete(updatedVideo.userId, videoId, {
              thumbnailUrl: result.thumbnailUrl,
              duration: result.duration,
            });
          }
        } catch {}
      }

      return {
        success: true,
        videoId,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
      };
    } catch (error) {
      logger.error(`Failed to process video ${videoId}:`, error);

      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      }).catch((err) => {
        logger.error(`Failed to update video status to failed:`, err);
      });

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute
    },
  }
);

// Worker event handlers
videoProcessingWorker.on('completed', (job) => {
  logger.info(`Video processing job ${job.id} completed for video ${job.data.videoId}`);
});

videoProcessingWorker.on('failed', (job, err) => {
  logger.error(`Video processing job ${job?.id} failed for video ${job?.data.videoId}:`, err);
});

videoProcessingWorker.on('error', (err) => {
  logger.error('Video processing worker error:', err);
});

/**
 * Add video processing job to queue
 */
export async function queueVideoProcessing(
  videoId: string,
  transcode: boolean = false
): Promise<void> {
  await videoProcessingQueue.add(
    'process-video',
    { videoId, transcode },
    {
      jobId: `video-${videoId}`, // Unique job ID to prevent duplicates
      priority: transcode ? 5 : 10, // Higher priority for non-transcode jobs
    }
  );

  logger.info(`Queued video processing job for video ${videoId}`);
}

/**
 * Get job status
 */
export async function getVideoProcessingStatus(videoId: string) {
  const job = await videoProcessingQueue.getJob(`video-${videoId}`);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const returnValue = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    videoId,
    state,
    progress,
    returnValue,
    failedReason,
  };
}

