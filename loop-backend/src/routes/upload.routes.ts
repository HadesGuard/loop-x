import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateParams } from '../middleware/validation.middleware';
import { initiateUploadSchema } from '../validators/upload.validator';
import { idParamSchema } from '../validators/params.validator';
import { uploadRateLimiter } from '../middleware/rate-limit.middleware';
import {
  initiateUpload,
  uploadChunk,
  completeUpload,
  getUploadStatus,
} from '../controllers/upload.controller';

const router: Router = Router();
router.use(authenticate);

router.post('/initiate', uploadRateLimiter, validate(initiateUploadSchema), initiateUpload);
router.put(
  '/:id/chunk/:index',
  validateParams(idParamSchema),
  express.raw({ limit: '6mb', type: 'application/octet-stream' }),
  uploadChunk
);
router.post('/:id/complete', validateParams(idParamSchema), completeUpload);
router.get('/:id/status', validateParams(idParamSchema), getUploadStatus);

export default router;
