import { Router } from 'express';
import { likeComment, unlikeComment, deleteComment } from '../controllers/interaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateParams } from '../middleware/validation.middleware';
import { idParamSchema } from '../validators/params.validator';

const router: Router = Router();

// All comment routes require authentication
router.use(authenticate);

// Comment interactions
router.post('/:id/like', validateParams(idParamSchema), likeComment);
router.delete('/:id/like', validateParams(idParamSchema), unlikeComment);
router.delete('/:id', validateParams(idParamSchema), deleteComment);

export default router;



