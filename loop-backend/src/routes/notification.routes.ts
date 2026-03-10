import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateParams } from '../middleware/validation.middleware';
import { getNotificationsQuerySchema } from '../validators/notification.validator';
import { idParamSchema } from '../validators/params.validator';

const router: Router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', validate(getNotificationsQuerySchema, 'query'), getNotifications);

// Mark all as read (must be before /:id route)
router.put('/read-all', markAllAsRead);

// Mark notification as read
router.put('/:id/read', validateParams(idParamSchema), markAsRead);

export default router;



