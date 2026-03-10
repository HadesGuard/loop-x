import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { uploadService } from '../services/upload.service';

/**
 * POST /uploads/initiate
 * Initiate a chunked upload session
 */
export const initiateUpload = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await uploadService.initiateUpload(userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Upload session created',
    data: result,
  });
};

/**
 * PUT /uploads/:id/chunk/:index
 * Upload a single chunk
 */
export const uploadChunk = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const chunkIndex = parseInt(req.params.index, 10);

  if (isNaN(chunkIndex) || chunkIndex < 0) {
    throw new AppError('Invalid chunk index', 400, 'INVALID_CHUNK_INDEX');
  }

  const chunkData = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

  const result = await uploadService.uploadChunk(id, chunkIndex, chunkData, userId);

  res.json({
    success: true,
    message: 'Chunk uploaded',
    data: result,
  });
};

/**
 * POST /uploads/:id/complete
 * Complete the chunked upload
 */
export const completeUpload = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id } = req.params;

  const video = await uploadService.completeUpload(id, userId);

  res.json({
    success: true,
    message: 'Upload completed successfully',
    data: { video },
  });
};

/**
 * GET /uploads/:id/status
 * Get upload session status
 */
export const getUploadStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id } = req.params;

  const status = await uploadService.getUploadStatus(id, userId);

  res.json({
    success: true,
    data: status,
  });
};
