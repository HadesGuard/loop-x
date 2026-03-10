import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

// Mock video processing service
vi.mock('../../../src/services/video-processing.service', () => ({
  videoProcessingService: {
    downloadVideoForProcessing: vi.fn().mockResolvedValue(Buffer.from('test video')),
    processVideo: vi.fn().mockResolvedValue({
      thumbnailUrl: 'shelby://account/thumbnail.jpg',
      duration: 120,
    }),
  },
}));

// Mock feed service
vi.mock('../../../src/services/feed.service', () => ({
  feedService: {
    invalidateFeedCache: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock BullMQ — use vi.hoisted so mocks are available when vi.mock is hoisted
const { mockAdd, mockGetJob } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: 'test-job-id' }),
  mockGetJob: vi.fn().mockResolvedValue({
    id: 'test-job-id',
    getState: vi.fn().mockResolvedValue('completed'),
    progress: 100,
    returnvalue: { success: true },
    failedReason: null,
  }),
}));

vi.mock('bullmq', () => {
  class MockQueue {
    add = mockAdd;
    getJob = mockGetJob;
  }
  class MockWorker {
    on = vi.fn();
    constructor(_name: string, _processor: any, _opts: any) {}
  }
  return { Queue: MockQueue, Worker: MockWorker };
});

import { queueVideoProcessing, getVideoProcessingStatus } from '../../../src/queues/video-processing.queue';

describe('Video Processing Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queueVideoProcessing', () => {
    it('should queue video processing job', async () => {
      await queueVideoProcessing('test-video-id', false);

      expect(mockAdd).toHaveBeenCalledWith(
        'process-video',
        { videoId: 'test-video-id', transcode: false },
        { jobId: 'video-test-video-id', priority: 10 }
      );
    });

    it('should queue video processing job with transcoding (lower priority)', async () => {
      await queueVideoProcessing('test-video-id', true);

      expect(mockAdd).toHaveBeenCalledWith(
        'process-video',
        { videoId: 'test-video-id', transcode: true },
        { jobId: 'video-test-video-id', priority: 5 }
      );
    });
  });

  describe('getVideoProcessingStatus', () => {
    it('should get video processing job status', async () => {
      const status = await getVideoProcessingStatus('test-video-id');

      expect(status).toEqual({
        videoId: 'test-video-id',
        state: 'completed',
        progress: 100,
        returnValue: { success: true },
        failedReason: null,
      });
    });

    it('should return null if job not found', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const status = await getVideoProcessingStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });
});
