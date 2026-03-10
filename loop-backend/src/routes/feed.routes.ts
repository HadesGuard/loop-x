import { Router } from 'express';
import { getForYouFeed, getFollowingFeed } from '../controllers/feed.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { feedQuerySchema } from '../validators/feed.validator';

const router: Router = Router();

/**
 * GET /feed
 * Get "For You" feed
 * Query params: cursor (optional), limit (optional, default: 20, max: 50)
 */
router.get(
  '/',
  authenticate,
  validateQuery(feedQuerySchema),
  getForYouFeed
);

/**
 * GET /feed/following
 * Get "Following" feed (videos from users you follow)
 * Query params: cursor (optional), limit (optional, default: 20, max: 50)
 */
router.get(
  '/following',
  authenticate,
  validateQuery(feedQuerySchema),
  getFollowingFeed
);

export default router;
