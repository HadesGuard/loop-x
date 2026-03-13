import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { shelbyService } from './shelby.service';
import { prisma } from '../config/database';

export interface VideoProcessingResult {
  thumbnailUrl: string;
  duration: number;
  hlsManifestUrl?: string;
  qualities?: {
    quality: string;
    url: string;
  }[];
}

export class VideoProcessingService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'loop-video-processing');
    // Ensure temp directory exists
    fs.mkdir(this.tempDir, { recursive: true }).catch((err) => {
      logger.warn('Failed to create temp directory:', err);
    });
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'], // Take screenshot at 1 second
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720', // 16:9 aspect ratio
        })
        .on('end', () => {
          logger.info(`Thumbnail generated: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          logger.error('Thumbnail generation error:', err);
          reject(new AppError('Failed to generate thumbnail', 500, 'THUMBNAIL_GENERATION_ERROR'));
        });
    });
  }

  /**
   * Get video duration in seconds
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error('Failed to get video duration:', err);
          reject(new AppError('Failed to get video duration', 500, 'DURATION_ERROR'));
          return;
        }

        const duration = metadata.format.duration;
        if (!duration) {
          reject(new AppError('Video duration not found', 500, 'DURATION_NOT_FOUND'));
          return;
        }

        resolve(Math.floor(duration));
      });
    });
  }

  /**
   * Transcode video to different qualities
   */
  async transcodeVideo(
    inputPath: string,
    outputDir: string,
    videoId: string
  ): Promise<{ quality: string; path: string }[]> {
    const qualities = [
      { name: '720p', width: 1280, height: 720, bitrate: '2M' },
      { name: '1080p', width: 1920, height: 1080, bitrate: '5M' },
    ];

    const results: { quality: string; path: string }[] = [];

    for (const quality of qualities) {
      const outputPath = path.join(outputDir, `${videoId}-${quality.name}.mp4`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${quality.width}x${quality.height}`)
          .videoBitrate(quality.bitrate)
          .outputOptions([
            '-preset fast',
            '-crf 23',
            '-movflags +faststart', // Optimize for streaming
          ])
          .output(outputPath)
          .on('end', () => {
            logger.info(`Video transcoded to ${quality.name}: ${outputPath}`);
            results.push({ quality: quality.name, path: outputPath });
            resolve();
          })
          .on('error', (err) => {
            logger.error(`Transcoding error for ${quality.name}:`, err);
            reject(new AppError(`Failed to transcode to ${quality.name}`, 500, 'TRANSCODE_ERROR'));
          })
          .run();
      });
    }

    return results;
  }

  /**
   * Process video: generate thumbnail, get duration, and optionally transcode
   */
  async processVideo(
    videoId: string,
    videoBuffer: Buffer,
    transcode: boolean = false
  ): Promise<VideoProcessingResult> {
    const videoPath = path.join(this.tempDir, `${videoId}-original.mp4`);
    const thumbnailPath = path.join(this.tempDir, `${videoId}-thumbnail.jpg`);

    try {
      // Write video buffer to temp file
      await fs.writeFile(videoPath, videoBuffer);
      logger.info(`Video written to temp file: ${videoPath}`);

      // Get duration
      const duration = await this.getVideoDuration(videoPath);
      logger.info(`Video duration: ${duration} seconds`);

      // Generate thumbnail
      await this.generateThumbnail(videoPath, thumbnailPath);

      // Read thumbnail buffer
      const thumbnailBuffer = await fs.readFile(thumbnailPath);

      // Upload thumbnail to Shelby
      logger.info(`Uploading thumbnail for video ${videoId} to Shelby`);
      const thumbnailBlobName = `${videoId}-thumbnail.jpg`;
      await shelbyService.uploadBlob(thumbnailBuffer, thumbnailBlobName);
      
      const serviceAccount = shelbyService.getServiceAccountAddress();
      if (!serviceAccount) {
        throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
      }
      
      const thumbnailUrl = `shelby://${serviceAccount}/${thumbnailBlobName}`;

      // Transcode if requested
      let qualities: { quality: string; url: string }[] | undefined;
      let hlsManifestUrl: string | undefined;
      if (transcode) {
        const transcodedVideos = await this.transcodeVideo(videoPath, this.tempDir, videoId);

        // Upload transcoded videos to Shelby
        qualities = [];
        const serviceAccount = shelbyService.getServiceAccountAddress();
        if (!serviceAccount) {
          throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
        }

        for (const transcoded of transcodedVideos) {
          const transcodedBuffer = await fs.readFile(transcoded.path);
          const transcodedBlobName = `${videoId}-${transcoded.quality}.mp4`;

          await shelbyService.uploadBlob(transcodedBuffer, transcodedBlobName);

          qualities.push({
            quality: transcoded.quality,
            url: `shelby://${serviceAccount}/${transcodedBlobName}`,
          });

          // Clean up transcoded file
          await fs.unlink(transcoded.path).catch(() => {});
        }

        // Generate HLS adaptive streaming
        try {
          const hlsResult = await this.generateHLS(videoPath, this.tempDir, videoId);
          const hlsDir = path.dirname(hlsResult.masterPlaylistPath);
          hlsManifestUrl = await this.uploadHLSToShelby(hlsDir, videoId);

          // Clean up HLS temp directory
          await fs.rm(hlsDir, { recursive: true, force: true }).catch(() => {});
        } catch (err) {
          logger.error(`HLS generation failed for video ${videoId}, continuing without HLS:`, err);
          // HLS is non-critical; continue without it
        }
      }

      // Clean up temp files
      await this.cleanupTempFiles([videoPath, thumbnailPath]);

      return {
        thumbnailUrl,
        duration,
        hlsManifestUrl,
        qualities,
      };
    } catch (error) {
      // Clean up on error
      await this.cleanupTempFiles([videoPath, thumbnailPath]).catch(() => {});
      throw error;
    }
  }

  /**
   * Generate HLS adaptive streaming variants (720p and 1080p)
   */
  async generateHLS(
    inputPath: string,
    outputDir: string,
    videoId: string
  ): Promise<{ masterPlaylistPath: string; variantDirs: string[] }> {
    const hlsDir = path.join(outputDir, `${videoId}-hls`);
    const dir720p = path.join(hlsDir, '720p');
    const dir1080p = path.join(hlsDir, '1080p');

    await fs.mkdir(dir720p, { recursive: true });
    await fs.mkdir(dir1080p, { recursive: true });

    const variants = [
      {
        name: '720p',
        dir: dir720p,
        scale: '-2:720',
        audioBitrate: '128k',
      },
      {
        name: '1080p',
        dir: dir1080p,
        scale: '-2:1080',
        audioBitrate: '192k',
      },
    ];

    // Generate each variant
    for (const variant of variants) {
      const segmentPattern = path.join(variant.dir, 'segment_%03d.ts');
      const playlistPath = path.join(variant.dir, 'playlist.m3u8');

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .audioBitrate(variant.audioBitrate)
          .videoFilter(`scale=${variant.scale}`)
          .outputOptions([
            '-preset fast',
            '-hls_time 6',
            '-hls_list_size 0',
            `-hls_segment_filename ${segmentPattern}`,
            '-f hls',
          ])
          .output(playlistPath)
          .on('end', () => {
            logger.info(`HLS ${variant.name} variant generated for video ${videoId}`);
            resolve();
          })
          .on('error', (err) => {
            logger.error(`HLS ${variant.name} generation error:`, err);
            reject(new AppError(`Failed to generate HLS ${variant.name}`, 500, 'HLS_GENERATION_ERROR'));
          })
          .run();
      });
    }

    // Write master playlist
    const masterPlaylistPath = path.join(hlsDir, 'master.m3u8');
    const masterContent = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720',
      '720p/playlist.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080',
      '1080p/playlist.m3u8',
      '',
    ].join('\n');

    await fs.writeFile(masterPlaylistPath, masterContent);
    logger.info(`HLS master playlist generated for video ${videoId}`);

    return {
      masterPlaylistPath,
      variantDirs: [dir720p, dir1080p],
    };
  }

  /**
   * Upload all HLS files (segments + playlists) to Shelby
   */
  async uploadHLSToShelby(
    hlsDir: string,
    videoId: string
  ): Promise<string> {
    const serviceAccount = shelbyService.getServiceAccountAddress();
    if (!serviceAccount) {
      throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
    }

    const expirationDays = 30;

    // Collect all files to upload
    const filesToUpload: { localPath: string; blobName: string }[] = [];

    // Master playlist
    filesToUpload.push({
      localPath: path.join(hlsDir, 'master.m3u8'),
      blobName: `${videoId}/hls/master.m3u8`,
    });

    // Variant directories
    const variantNames = ['720p', '1080p'];
    for (const variant of variantNames) {
      const variantDir = path.join(hlsDir, variant);
      const files = await fs.readdir(variantDir);

      for (const file of files) {
        filesToUpload.push({
          localPath: path.join(variantDir, file),
          blobName: `${videoId}/hls/${variant}/${file}`,
        });
      }
    }

    // Upload each file
    for (const fileInfo of filesToUpload) {
      const fileBuffer = await fs.readFile(fileInfo.localPath);
      await shelbyService.uploadBlob(fileBuffer, fileInfo.blobName, expirationDays);
      logger.debug(`Uploaded HLS file: ${fileInfo.blobName}`);
    }

    const hlsManifestUrl = `shelby://${serviceAccount}/${videoId}/hls/master.m3u8`;
    logger.info(`HLS upload complete for video ${videoId}: ${hlsManifestUrl}`);

    return hlsManifestUrl;
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug(`Cleaned up temp file: ${filePath}`);
      } catch (err) {
        // Ignore errors (file might not exist)
        logger.debug(`Failed to cleanup ${filePath}:`, err);
      }
    }
  }

  /**
   * Download video from Shelby for processing
   */
  async downloadVideoForProcessing(videoId: string): Promise<Buffer> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        shelbyAccount: true,
        shelbyBlobName: true,
        status: true,
      },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (!video.shelbyAccount || !video.shelbyBlobName) {
      throw new AppError('Video not uploaded to Shelby', 400, 'VIDEO_NOT_ON_SHELBY');
    }

    if (video.status !== 'uploading' && video.status !== 'processing') {
      throw new AppError('Video is not in uploading or processing status', 400, 'INVALID_STATUS');
    }

    // Download from Shelby
    const stream = await shelbyService.downloadBlob(video.shelbyAccount, video.shelbyBlobName);
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks);
  }
}

export const videoProcessingService = new VideoProcessingService();

