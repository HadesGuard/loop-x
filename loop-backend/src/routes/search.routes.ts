import { Router } from 'express';
import { search } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { searchQuerySchema } from '../validators/search.validator';
import { searchRateLimiter } from '../middleware/rate-limit.middleware';

const router: Router = Router();

// Search routes require authentication
router.use(authenticate);

// Search endpoint
router.get('/', searchRateLimiter, validate(searchQuerySchema, 'query'), search);

export default router;



