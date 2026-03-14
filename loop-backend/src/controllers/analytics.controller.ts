import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { analyticsService } from '../services/analytics.service';
import { cacheService } from '../services/cache.service';

/**
 * GET /creator/dashboard
 * Get creator dashboard: overview stats + top videos + daily views chart
 */
export const getCreatorDashboard = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await analyticsService.getCreatorDashboard(userId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /analytics/overview
 * Get overall analytics for current user
 */
export const getOverview = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await analyticsService.getOverview(userId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /videos/:id/analytics
 * Get analytics for a specific video
 */
export const getVideoAnalytics = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: videoId } = req.params;

  const result = await analyticsService.getVideoAnalytics(userId, videoId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /videos/:id/track-view
 * Track a video view
 */
export const trackView = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;
  const { watchedDuration } = req.body;

  await analyticsService.trackView(videoId, userId, watchedDuration);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.videoById(videoId),
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    message: 'View tracked',
  });
};
