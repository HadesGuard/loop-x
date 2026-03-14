import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import { getStorageStats, listUsers, updateUser } from '../controllers/admin.controller';

const router: Router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

router.get('/storage-stats', getStorageStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);

export default router;
