import { Router } from 'express';
import { createReport } from '../controllers/privacy.controller';
import {
  getReports,
  getReportById,
  getReportStats,
  reviewReport,
  takeAction,
} from '../controllers/moderation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import { validate, validateQuery } from '../middleware/validation.middleware';
import { reportSchema } from '../validators/privacy.validator';
import {
  reviewReportSchema,
  moderationActionSchema,
  listReportsQuerySchema,
} from '../validators/moderation.validator';

const router: Router = Router();

// All report routes require authentication
router.use(authenticate);

// User-facing: create a report
router.post('/', validate(reportSchema), createReport);

// Admin-only routes
router.get('/stats', isAdmin, getReportStats);
router.get('/', isAdmin, validateQuery(listReportsQuerySchema), getReports);
router.get('/:id', isAdmin, getReportById);
router.put('/:id', isAdmin, validate(reviewReportSchema), reviewReport);
router.post('/:id/action', isAdmin, validate(moderationActionSchema), takeAction);

export default router;
