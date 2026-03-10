import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { discoveryService } from '../services/discovery.service';

/**
 * GET /discover/trending
 * Get trending videos
 */
export const getTrendingVideos = async (req: AuthRequest, res: Response) => {
  const { page, limit, timeframe } = req.query;

  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 20;
  const timeframeType = (timeframe as 'day' | 'week' | 'month') || 'week';

  const result = await discoveryService.getTrendingVideos({
    page: pageNum,
    limit: limitNum,
    timeframe: timeframeType,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /discover/creators
 * Get top creators
 */
export const getTopCreators = async (req: AuthRequest, res: Response) => {
  const { limit, category } = req.query;

  const limitNum = limit ? Number(limit) : 20;
  const categoryFilter = category ? String(category) : undefined;

  const result = await discoveryService.getTopCreators({
    limit: limitNum,
    category: categoryFilter,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /discover/hashtags
 * Get trending hashtags
 */
export const getDiscoverHashtags = async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  const limitNum = limit ? Number(limit) : 20;

  const result = await discoveryService.getTrendingHashtags(limitNum);

  res.json({
    success: true,
    data: result,
  });
};



