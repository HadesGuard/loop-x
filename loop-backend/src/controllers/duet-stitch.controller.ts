import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { duetStitchService } from '../services/duet-stitch.service';

export const createDuet = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { id } = req.params;
  const { position, alignment, ...videoMetadata } = req.body;

  if (!req.file) {
    throw new AppError('Video file is required', 400, 'VIDEO_REQUIRED');
  }

  const result = await duetStitchService.createDuet(
    userId,
    id,
    req.file.buffer,
    {
      ...videoMetadata,
      position,
      alignment,
    },
    req.file.size
  );

  res.json({
    success: true,
    data: result,
  });
};

export const createStitch = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { id } = req.params;
  const { clipStartTime, clipEndTime, clipDuration, ...videoMetadata } = req.body;

  if (!req.file) {
    throw new AppError('Video file is required', 400, 'VIDEO_REQUIRED');
  }

  const result = await duetStitchService.createStitch(
    userId,
    id,
    req.file.buffer,
    {
      ...videoMetadata,
      clipStartTime: Number(clipStartTime),
      clipEndTime: Number(clipEndTime),
      clipDuration: Number(clipDuration),
    },
    req.file.size
  );

  res.json({
    success: true,
    data: result,
  });
};

export const getDuets = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sort = (req.query.sort as 'recent' | 'popular' | 'trending' | undefined) || 'recent';

  const result = await duetStitchService.getDuets(id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const getStitches = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sort = (req.query.sort as 'recent' | 'popular' | 'trending' | undefined) || 'recent';

  const result = await duetStitchService.getStitches(id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const getDuetInfo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await duetStitchService.getDuetInfo(id);

  res.json({
    success: true,
    data: result,
  });
};

export const getStitchInfo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await duetStitchService.getStitchInfo(id);

  res.json({
    success: true,
    data: result,
  });
};
