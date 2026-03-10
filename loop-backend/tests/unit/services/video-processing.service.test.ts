import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock FFmpeg
vi.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = (videoPath: string) => {
    const instance = {
      screenshots: vi.fn().mockReturnThis(),
      videoCodec: vi.fn().mockReturnThis(),
      audioCodec: vi.fn().mockReturnThis(),
      size: vi.fn().mockReturnThis(),
      videoBitrate: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      on: vi.fn((event: string, callback: (...args: any[]) => void) => {
        if (event === 'end') {
          setTimeout(callback, 10);
        }
        return instance;
      }),
      run: vi.fn(),
    };
    return instance;
  };

  mockFfmpeg.ffprobe = vi.fn((_path: string, callback: (err: any, metadata: any) => void) => {
    callback(null, {
      format: {
        duration: 120.5,
      },
    });
  });

  return { default: mockFfmpeg, ffprobe: mockFfmpeg.ffprobe };
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return {
    ...original,
    promises: {
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('test data')),
      unlink: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock shelbyService
vi.mock('../../../src/services/shelby.service', () => ({
  shelbyService: {
    downloadBlob: vi.fn().mockResolvedValue({
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }),
    }),
    encodeFile: vi.fn().mockResolvedValue({
      blobMerkleRoot: 'mock-merkle-root',
      rawDataSize: BigInt(1024),
      chunksets: 1,
    }),
    registerBlob: vi.fn().mockResolvedValue(undefined),
    uploadBlob: vi.fn().mockResolvedValue(undefined),
    getServiceAccountAddress: vi.fn().mockReturnValue('0xServiceAccount'),
  },
}));

import { videoProcessingService } from '../../../src/services/video-processing.service';
import { shelbyService } from '../../../src/services/shelby.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);

describe('VideoProcessingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVideoDuration', () => {
    it('should get video duration in seconds', async () => {
      const duration = await videoProcessingService.getVideoDuration('/path/to/video.mp4');
      expect(duration).toBe(120); // Math.floor(120.5)
    });

    it('should throw error if video duration not found', async () => {
      const ffmpeg = await import('fluent-ffmpeg');
      vi.mocked(ffmpeg.ffprobe).mockImplementationOnce((_path: any, callback: any) => {
        callback(null, { format: {} });
      });

      await expect(
        videoProcessingService.getVideoDuration('/path/to/video.mp4')
      ).rejects.toThrow(AppError);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail from video', async () => {
      await expect(
        videoProcessingService.generateThumbnail('/path/to/video.mp4', '/path/to/thumbnail.jpg')
      ).resolves.not.toThrow();
    });
  });

  describe('downloadVideoForProcessing', () => {
    const testVideoId = 'test-video-id';

    it('should download video from Shelby', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        shelbyAccount: '0x1234567890abcdef',
        shelbyBlobName: 'test-video.mp4',
        status: 'uploading',
      } as any);

      const buffer = await videoProcessingService.downloadVideoForProcessing(testVideoId);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(shelbyService.downloadBlob).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'test-video.mp4'
      );
    });

    it('should throw error if video not found', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(
        videoProcessingService.downloadVideoForProcessing('non-existent-id')
      ).rejects.toThrow(AppError);
    });

    it('should throw error if video not on Shelby', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        shelbyAccount: null,
        shelbyBlobName: null,
        status: 'uploading',
      } as any);

      await expect(
        videoProcessingService.downloadVideoForProcessing(testVideoId)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if video not in uploading status', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        shelbyAccount: '0x1234567890abcdef',
        shelbyBlobName: 'test-video.mp4',
        status: 'ready',
      } as any);

      await expect(
        videoProcessingService.downloadVideoForProcessing(testVideoId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('processVideo', () => {
    it('should process video without transcoding', async () => {
      const videoBuffer = Buffer.from('test video data');

      const result = await videoProcessingService.processVideo(
        'test-video-id',
        videoBuffer,
        false
      );

      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('duration');
      expect(result.duration).toBe(120);
      expect(result.qualities).toBeUndefined();
      expect(shelbyService.uploadBlob).toHaveBeenCalled();
    });

    it('should process video with transcoding', async () => {
      const videoBuffer = Buffer.from('test video data');

      const result = await videoProcessingService.processVideo(
        'test-video-id',
        videoBuffer,
        true
      );

      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('qualities');
      expect(result.qualities).toHaveLength(2);
      expect(result.qualities?.[0]).toHaveProperty('quality');
      expect(result.qualities?.[0]).toHaveProperty('url');
    });
  });
});
