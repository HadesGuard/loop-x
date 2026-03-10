import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { videoService } from './video.service';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(os.tmpdir(), 'loop-uploads');
const SESSION_EXPIRY_HOURS = 24;

export class UploadService {
  /**
   * Initiate a chunked upload session
   */
  async initiateUpload(
    userId: string,
    data: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      title: string;
      description?: string;
      privacy?: string;
      allowComments?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
    }
  ): Promise<{ uploadId: string; chunkSize: number; totalChunks: number }> {
    const totalChunks = Math.ceil(data.fileSize / CHUNK_SIZE);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    const session = await prisma.uploadSession.create({
      data: {
        userId,
        fileName: data.fileName,
        fileSize: BigInt(data.fileSize),
        mimeType: data.mimeType,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        uploadedChunks: 0,
        status: 'pending',
        metadata: {
          title: data.title,
          description: data.description,
          privacy: data.privacy || 'public',
          allowComments: data.allowComments !== false,
          allowDuet: data.allowDuet !== false,
          allowStitch: data.allowStitch !== false,
        },
        expiresAt,
      },
    });

    // Create temp directory for chunks
    const sessionDir = path.join(UPLOAD_DIR, session.id);
    await fs.mkdir(sessionDir, { recursive: true });

    logger.info(`Upload session ${session.id} created for user ${userId}, totalChunks: ${totalChunks}`);

    return {
      uploadId: session.id,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    };
  }

  /**
   * Upload a single chunk
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer,
    userId: string
  ): Promise<{ uploadedChunks: number; totalChunks: number }> {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404, 'UPLOAD_SESSION_NOT_FOUND');
    }

    if (session.userId !== userId) {
      throw new AppError('Unauthorized access to upload session', 403, 'FORBIDDEN');
    }

    if (session.status !== 'pending' && session.status !== 'uploading') {
      throw new AppError(`Upload session is ${session.status}`, 400, 'UPLOAD_SESSION_INVALID_STATUS');
    }

    if (new Date() > session.expiresAt) {
      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'expired' },
      });
      throw new AppError('Upload session has expired', 400, 'UPLOAD_SESSION_EXPIRED');
    }

    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new AppError(
        `Invalid chunk index ${chunkIndex}. Must be between 0 and ${session.totalChunks - 1}`,
        400,
        'INVALID_CHUNK_INDEX'
      );
    }

    // Store chunk to temp directory
    const chunkPath = path.join(UPLOAD_DIR, uploadId, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, chunkData);

    // Count actual uploaded chunks by checking filesystem
    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    const files = await fs.readdir(sessionDir);
    const chunkFiles = files.filter((f) => f.startsWith('chunk_'));
    const uploadedChunks = chunkFiles.length;

    // Update session
    const updatedSession = await prisma.uploadSession.update({
      where: { id: uploadId },
      data: {
        uploadedChunks,
        status: 'uploading',
      },
    });

    logger.info(`Chunk ${chunkIndex} uploaded for session ${uploadId} (${uploadedChunks}/${session.totalChunks})`);

    return {
      uploadedChunks: updatedSession.uploadedChunks,
      totalChunks: updatedSession.totalChunks,
    };
  }

  /**
   * Complete the upload by reassembling chunks and creating a video
   */
  async completeUpload(uploadId: string, userId: string) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404, 'UPLOAD_SESSION_NOT_FOUND');
    }

    if (session.userId !== userId) {
      throw new AppError('Unauthorized access to upload session', 403, 'FORBIDDEN');
    }

    if (session.status === 'complete') {
      throw new AppError('Upload session is already complete', 400, 'UPLOAD_ALREADY_COMPLETE');
    }

    if (session.uploadedChunks !== session.totalChunks) {
      throw new AppError(
        `Not all chunks uploaded. ${session.uploadedChunks}/${session.totalChunks} chunks received`,
        400,
        'INCOMPLETE_UPLOAD'
      );
    }

    // Reassemble chunks into a single buffer
    const chunks: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(UPLOAD_DIR, uploadId, `chunk_${i}`);
      try {
        const chunkData = await fs.readFile(chunkPath);
        chunks.push(chunkData);
      } catch {
        throw new AppError(`Missing chunk ${i}`, 400, 'MISSING_CHUNK');
      }
    }

    const assembledBuffer = Buffer.concat(chunks);

    // Extract metadata from session
    const metadata = session.metadata as {
      title: string;
      description?: string;
      privacy?: string;
      allowComments?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
    };

    // Create video via videoService
    const video = await videoService.uploadVideo(
      userId,
      assembledBuffer,
      {
        title: metadata.title,
        description: metadata.description,
        privacy: (metadata.privacy as 'public' | 'private' | 'friends') || 'public',
        allowComments: metadata.allowComments !== false,
        allowDuet: metadata.allowDuet !== false,
        allowStitch: metadata.allowStitch !== false,
      },
      Number(session.fileSize)
    );

    // Update session status
    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 'complete' },
    });

    // Clean up chunk files
    try {
      const sessionDir = path.join(UPLOAD_DIR, uploadId);
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to clean up chunks for session ${uploadId}:`, error);
    }

    logger.info(`Upload session ${uploadId} completed, video created`);

    return video;
  }

  /**
   * Get upload session status
   */
  async getUploadStatus(
    uploadId: string,
    userId: string
  ): Promise<{ status: string; uploadedChunks: number; totalChunks: number }> {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404, 'UPLOAD_SESSION_NOT_FOUND');
    }

    if (session.userId !== userId) {
      throw new AppError('Unauthorized access to upload session', 403, 'FORBIDDEN');
    }

    return {
      status: session.status,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
    };
  }
}

export const uploadService = new UploadService();
