import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { feedService } from '../services/feed.service';
import { FeedQueryInput } from '../validators/feed.validator';

/**
 * GET /feed - Get "For You" feed
 */
export const getForYouFeed = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const query: FeedQueryInput = {
    cursor: req.query.cursor as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) || 20 : 20,
  };

  const feed = await feedService.getForYouFeed(userId, query);

  res.json({
    success: true,
    data: {
      videos: feed.items,
      nextCursor: feed.nextCursor || undefined,
    },
  });
};

/**
 * GET /feed/following - Get "Following" feed
 */
export const getFollowingFeed = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const query: FeedQueryInput = {
    cursor: req.query.cursor as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) || 20 : 20,
  };

  const feed = await feedService.getFollowingFeed(userId, query);

  res.json({
    success: true,
    data: {
      videos: feed.items,
      nextCursor: feed.nextCursor || undefined,
    },
  });
};
