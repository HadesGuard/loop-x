import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/services/shelby.service', () => ({
  shelbyService: {
    uploadVideo: vi.fn(),
    downloadBlob: vi.fn(),
  },
}));

vi.mock('../../../src/queues/video-processing.queue', () => ({
  queueVideoProcessing: vi.fn(),
}));

vi.mock('../../../src/services/feed.service', () => ({
  feedService: {
    invalidateFeedCache: vi.fn(),
  },
}));

import { prisma } from '../../../src/config/database';
import { AppError } from '../../../src/middleware/error.middleware';
import { VideoService } from '../../../src/services/video.service';

const mockPrisma = vi.mocked(prisma);

const BASE_VIDEO = {
  id: 'v-1',
  userId: 'u-1',
  url: 'shelby://account/video_v-1.mp4',
  thumbnailUrl: null,
  title: 'Test',
  description: null,
  views: BigInt(0),
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  duration: null,
  fileSize: BigInt(1024),
  privacy: 'public',
  allowComments: true,
  allowDuet: true,
  allowStitch: true,
  duetsCount: 0,
  stitchesCount: 0,
  status: 'ready',
  createdAt: new Date(),
  updatedAt: new Date(),
  hlsManifestUrl: null,
  shelbyAccount: 'account',
  shelbyBlobName: 'video_v-1.mp4',
  shelbyMerkleRoot: 'abc',
  shelbyExpiration: null as bigint | null,
  shelbySize: BigInt(1024),
  shelbyChunksets: 1,
};

describe('VideoService.getVideoById — expiration handling', () => {
  let service: VideoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VideoService();
  });

  it('returns video normally when not expired', async () => {
    const futureExpiry = BigInt((Date.now() + 7 * 24 * 3600 * 1000) * 1000);
    const video = { ...BASE_VIDEO, shelbyExpiration: futureExpiry };
    mockPrisma.video.findUnique.mockResolvedValue(video as any);

    const result = await service.getVideoById('v-1');

    expect(result.status).toBe('ready');
    expect(mockPrisma.video.update).not.toHaveBeenCalled();
  });

  it('marks video as expired and returns expired status when expiration has passed', async () => {
    const pastExpiry = BigInt((Date.now() - 1000) * 1000);
    const video = { ...BASE_VIDEO, shelbyExpiration: pastExpiry };
    const expiredVideo = { ...video, status: 'expired' };

    mockPrisma.video.findUnique.mockResolvedValue(video as any);
    mockPrisma.video.update.mockResolvedValue(expiredVideo as any);

    const result = await service.getVideoById('v-1');

    expect(result.status).toBe('expired');
    expect(mockPrisma.video.update).toHaveBeenCalledWith({
      where: { id: 'v-1' },
      data: { status: 'expired' },
    });
  });

  it('does not re-check expiration when video is already expired', async () => {
    const pastExpiry = BigInt((Date.now() - 1000) * 1000);
    const video = { ...BASE_VIDEO, status: 'expired', shelbyExpiration: pastExpiry };
    mockPrisma.video.findUnique.mockResolvedValue(video as any);

    const result = await service.getVideoById('v-1');

    expect(result.status).toBe('expired');
    // No update call — status was already 'expired'
    expect(mockPrisma.video.update).not.toHaveBeenCalled();
  });

  it('returns video normally when shelbyExpiration is null', async () => {
    const video = { ...BASE_VIDEO, shelbyExpiration: null };
    mockPrisma.video.findUnique.mockResolvedValue(video as any);

    const result = await service.getVideoById('v-1');

    expect(result.status).toBe('ready');
    expect(mockPrisma.video.update).not.toHaveBeenCalled();
  });

  it('throws 404 when video not found', async () => {
    mockPrisma.video.findUnique.mockResolvedValue(null);

    await expect(service.getVideoById('nonexistent')).rejects.toThrow(AppError);
  });
});

describe('VideoService.streamVideo — expiration handling', () => {
  let service: VideoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VideoService();
  });

  it('throws 410 VIDEO_EXPIRED when video status is expired', async () => {
    const video = { ...BASE_VIDEO, status: 'expired' };
    mockPrisma.video.findUnique.mockResolvedValue(video as any);

    await expect(service.streamVideo('v-1')).rejects.toMatchObject({
      statusCode: 410,
      code: 'VIDEO_EXPIRED',
    });
  });
});
