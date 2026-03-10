import { Router } from 'express';
import { getHistory, clearHistory, removeFromHistory } from '../controllers/watch-history.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { getHistoryQuerySchema } from '../validators/analytics.validator';

const router: Router = Router();

// All watch history routes require authentication
router.use(authenticate);

// Get watch history
router.get('/', validate(getHistoryQuerySchema, 'query'), getHistory);

// Clear watch history
router.delete('/', clearHistory);

// Remove video from history
router.delete('/:videoId', removeFromHistory);

export default router;



