import { Router } from 'express';
import { getCreatorDashboard } from '../controllers/analytics.controller';
import { getVideoAnalytics } from '../controllers/analytics.controller';
import { getMyEarnings, getCreatorEarnings } from '../controllers/tipping.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateParams, validateQuery } from '../middleware/validation.middleware';
import { idParamSchema } from '../validators/params.validator';
import { getEarningsSchema } from '../validators/tipping.validator';

const router: Router = Router();

router.use(authenticate);

// GET /creator/dashboard — overview + top videos + daily views chart
router.get('/dashboard', getCreatorDashboard);

// GET /creator/videos/:id/analytics — per-video analytics
router.get('/videos/:id/analytics', validateParams(idParamSchema), getVideoAnalytics);

// GET /creator/earnings — authenticated creator's own tip earnings
router.get('/earnings', validateQuery(getEarningsSchema), getMyEarnings);

// GET /creator/earnings/:userId — public earnings for a specific creator
router.get('/earnings/:userId', validateParams(idParamSchema), validateQuery(getEarningsSchema), getCreatorEarnings);

export default router;
