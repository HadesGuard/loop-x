import { Router } from 'express';
import { getHashtagPage, getTrendingHashtags } from '../controllers/hashtag.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { hashtagPageQuerySchema, trendingHashtagsQuerySchema } from '../validators/search.validator';

const router: Router = Router();

// Hashtag routes require authentication
router.use(authenticate);

// Get trending hashtags (must be before /:tag route)
router.get('/trending', validate(trendingHashtagsQuerySchema, 'query'), getTrendingHashtags);

// Get hashtag page
router.get('/:tag', validate(hashtagPageQuerySchema, 'query'), getHashtagPage);

export default router;



