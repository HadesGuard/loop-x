import { Router } from 'express';
import { getOverview } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Get overall analytics
router.get('/overview', getOverview);

export default router;

