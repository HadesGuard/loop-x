import { Router } from 'express';
import {
  getTrendingVideos,
  getTopCreators,
  getDiscoverHashtags,
} from '../controllers/discovery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  discoverTrendingQuerySchema,
  discoverCreatorsQuerySchema,
  trendingHashtagsQuerySchema,
} from '../validators/search.validator';

const router: Router = Router();

// Discovery routes require authentication
router.use(authenticate);

// Trending videos
router.get('/trending', validate(discoverTrendingQuerySchema, 'query'), getTrendingVideos);

// Top creators
router.get('/creators', validate(discoverCreatorsQuerySchema, 'query'), getTopCreators);

// Trending hashtags
router.get('/hashtags', validate(trendingHashtagsQuerySchema, 'query'), getDiscoverHashtags);

export default router;



