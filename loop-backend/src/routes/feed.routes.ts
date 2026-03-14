import { Router } from 'express';
import { getForYouFeed, getFollowingFeed } from '../controllers/feed.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { responseCache } from '../middleware/cache.middleware';
import { feedQuerySchema } from '../validators/feed.validator';
import { cacheService } from '../services/cache.service';

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
  responseCache({
    ttlSeconds: 30,
    key: (req) => cacheService.buildFeedCacheKey(req),
  }),
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
