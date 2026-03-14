import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { tipVideo } from '../controllers/tipping.controller';
import { tipVideoSchema } from '../validators/tipping.validator';

const router: ExpressRouter = Router();

// All tipping routes require authentication.
router.use(authenticate);

/**
 * POST /videos/:id/tip
 * Tip a video creator. Body: { amountOctas, tipperAddress }.
 * Creator earnings are accessible via GET /creator/earnings.
 */
router.post('/:id/tip', validate(tipVideoSchema), tipVideo);

export default router;
