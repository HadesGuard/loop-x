import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { hashtagService } from '../services/hashtag.service';

/**
 * GET /hashtags/:tag
 * Get hashtag page with videos
 */
export const getHashtagPage = async (req: AuthRequest, res: Response) => {
  const { tag } = req.params;
  const { sort, page, limit } = req.query;

  const sortType = (sort as 'trending' | 'recent') || 'trending';
  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 20;

  const result = await hashtagService.getHashtagPage(tag, {
    sort: sortType,
    page: pageNum,
    limit: limitNum,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /hashtags/trending
 * Get trending hashtags
 */
export const getTrendingHashtags = async (req: AuthRequest, res: Response) => {
  const { limit } = req.query;
  const limitNum = limit ? Number(limit) : 20;

  const result = await hashtagService.getTrendingHashtags(limitNum);

  res.json({
    success: true,
    data: result,
  });
};

