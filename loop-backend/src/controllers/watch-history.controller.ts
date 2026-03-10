import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { watchHistoryService } from '../services/watch-history.service';

/**
 * GET /watch-history
 * Get watch history for current user
 */
export const getHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { page, limit } = req.query;

  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 50;

  const result = await watchHistoryService.getHistory(userId, {
    page: pageNum,
    limit: limitNum,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * DELETE /watch-history
 * Clear watch history
 */
export const clearHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await watchHistoryService.clearHistory(userId);

  res.json({
    success: true,
    message: 'Watch history cleared',
  });
};

/**
 * DELETE /watch-history/:videoId
 * Remove a video from watch history
 */
export const removeFromHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { videoId } = req.params;

  await watchHistoryService.removeFromHistory(userId, videoId);

  res.json({
    success: true,
    message: 'Video removed from watch history',
  });
};
