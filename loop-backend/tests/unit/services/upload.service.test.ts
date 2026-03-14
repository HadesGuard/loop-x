import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: fsMocks,
}));

vi.mock('../../../src/config/database', () => ({
  prisma: {
    uploadSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/video.service', () => ({
  videoService: {
    uploadVideo: vi.fn(),
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

import { AppError } from '../../../src/middleware/error.middleware';
import { prisma } from '../../../src/config/database';
import { videoService } from '../../../src/services/video.service';
import { UploadService } from '../../../src/services/upload.service';

const mockPrisma = vi.mocked(prisma);
const mockVideoService = vi.mocked(videoService);

describe('UploadService', () => {
  let uploadService: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    uploadService = new UploadService();
  });

  describe('initiateUpload', () => {
    it('creates session with defaults and returns upload metadata', async () => {
      mockPrisma.uploadSession.create.mockResolvedValue({ id: 'up-1' } as any);
      fsMocks.mkdir.mockResolvedValue(undefined);

      const result = await uploadService.initiateUpload('user-1', {
        fileName: 'video.mp4',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'video/mp4',
        title: 'My video',
      });

      expect(result).toEqual({
        uploadId: 'up-1',
        chunkSize: 5 * 1024 * 1024,
        totalChunks: 2,
      });
      expect(mockPrisma.uploadSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            fileName: 'video.mp4',
            status: 'pending',
            metadata: expect.objectContaining({
              title: 'My video',
              privacy: 'public',
              allowComments: true,
              allowDuet: true,
              allowStitch: true,
            }),
          }),
        })
      );
      expect(fsMocks.mkdir).toHaveBeenCalledWith(expect.stringContaining('up-1'), { recursive: true });
    });
  });

  describe('uploadChunk', () => {
    it('throws UPLOAD_SESSION_NOT_FOUND for unknown session', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue(null);

      await expect(uploadService.uploadChunk('missing', 0, Buffer.from('x'), 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'UPLOAD_SESSION_NOT_FOUND',
      });
    });

    it('throws FORBIDDEN when user does not own session', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'other-user',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        totalChunks: 2,
      } as any);

      await expect(uploadService.uploadChunk('up-1', 0, Buffer.from('x'), 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('marks expired session and throws UPLOAD_SESSION_EXPIRED', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'pending',
        expiresAt: new Date(Date.now() - 60_000),
        totalChunks: 2,
      } as any);
      mockPrisma.uploadSession.update.mockResolvedValue({} as any);

      await expect(uploadService.uploadChunk('up-1', 0, Buffer.from('x'), 'user-1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'UPLOAD_SESSION_EXPIRED',
      });
      expect(mockPrisma.uploadSession.update).toHaveBeenCalledWith({
        where: { id: 'up-1' },
        data: { status: 'expired' },
      });
    });

    it('throws INVALID_CHUNK_INDEX when index is out of bounds', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        totalChunks: 2,
      } as any);

      await expect(uploadService.uploadChunk('up-1', 2, Buffer.from('x'), 'user-1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CHUNK_INDEX',
      });
    });

    it('stores chunk and updates uploaded chunk count', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        totalChunks: 3,
      } as any);
      fsMocks.writeFile.mockResolvedValue(undefined);
      fsMocks.readdir.mockResolvedValue(['chunk_0', 'chunk_1', 'meta.json'] as any);
      mockPrisma.uploadSession.update.mockResolvedValue({
        uploadedChunks: 2,
        totalChunks: 3,
      } as any);

      const result = await uploadService.uploadChunk('up-1', 1, Buffer.from('chunk'), 'user-1');

      expect(fsMocks.writeFile).toHaveBeenCalledWith(expect.stringContaining('chunk_1'), Buffer.from('chunk'));
      expect(result).toEqual({
        uploadedChunks: 2,
        totalChunks: 3,
      });
      expect(mockPrisma.uploadSession.update).toHaveBeenCalledWith({
        where: { id: 'up-1' },
        data: { uploadedChunks: 2, status: 'uploading' },
      });
    });
  });

  describe('completeUpload', () => {
    it('throws INCOMPLETE_UPLOAD when not all chunks are uploaded', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'uploading',
        uploadedChunks: 1,
        totalChunks: 2,
      } as any);

      await expect(uploadService.completeUpload('up-1', 'user-1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INCOMPLETE_UPLOAD',
      });
    });

    it('throws MISSING_CHUNK when a chunk file cannot be read', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'uploading',
        uploadedChunks: 2,
        totalChunks: 2,
      } as any);
      fsMocks.readFile
        .mockResolvedValueOnce(Buffer.from('part-1'))
        .mockRejectedValueOnce(new Error('missing'));

      await expect(uploadService.completeUpload('up-1', 'user-1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'MISSING_CHUNK',
      });
    });

    it('assembles chunks, uploads video, marks session complete and cleans files', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'uploading',
        uploadedChunks: 2,
        totalChunks: 2,
        fileSize: BigInt(6),
        metadata: {
          title: 'Chunked video',
          description: 'desc',
          privacy: 'friends',
          allowComments: true,
          allowDuet: false,
          allowStitch: true,
        },
      } as any);
      fsMocks.readFile
        .mockResolvedValueOnce(Buffer.from('abc'))
        .mockResolvedValueOnce(Buffer.from('def'));
      mockVideoService.uploadVideo.mockResolvedValue({ id: 'video-1' } as any);
      mockPrisma.uploadSession.update.mockResolvedValue({} as any);
      fsMocks.rm.mockResolvedValue(undefined);

      const result = await uploadService.completeUpload('up-1', 'user-1');

      expect(result).toEqual({ id: 'video-1' });
      expect(mockVideoService.uploadVideo).toHaveBeenCalledWith(
        'user-1',
        Buffer.from('abcdef'),
        {
          title: 'Chunked video',
          description: 'desc',
          privacy: 'friends',
          allowComments: true,
          allowDuet: false,
          allowStitch: true,
        },
        6
      );
      expect(mockPrisma.uploadSession.update).toHaveBeenCalledWith({
        where: { id: 'up-1' },
        data: { status: 'complete' },
      });
      expect(fsMocks.rm).toHaveBeenCalledWith(expect.stringContaining('up-1'), {
        recursive: true,
        force: true,
      });
    });
  });

  describe('getUploadStatus', () => {
    it('returns current status for session owner', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'user-1',
        status: 'uploading',
        uploadedChunks: 4,
        totalChunks: 10,
      } as any);

      const result = await uploadService.getUploadStatus('up-1', 'user-1');
      expect(result).toEqual({
        status: 'uploading',
        uploadedChunks: 4,
        totalChunks: 10,
      });
    });

    it('throws AppError for forbidden access', async () => {
      mockPrisma.uploadSession.findUnique.mockResolvedValue({
        id: 'up-1',
        userId: 'other-user',
      } as any);

      await expect(uploadService.getUploadStatus('up-1', 'user-1')).rejects.toBeInstanceOf(AppError);
      await expect(uploadService.getUploadStatus('up-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });
});
