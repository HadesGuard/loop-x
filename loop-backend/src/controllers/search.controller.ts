import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { searchService } from '../services/search.service';

/**
 * GET /search
 * Search for users, videos, and hashtags
 */
export const search = async (req: AuthRequest, res: Response) => {
  const { q, type, page, limit } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
    return;
  }

  const searchType = (type as 'all' | 'users' | 'videos' | 'hashtags') || 'all';
  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 20;

  const result = await searchService.search(q, searchType, {
    page: pageNum,
    limit: limitNum,
  });

  res.json({
    success: true,
    data: result,
  });
};

