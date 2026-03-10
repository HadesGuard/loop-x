import { Router } from 'express';
import { uploadVideo, getVideo, updateVideo, deleteVideo, streamVideo, streamHLS } from '../controllers/video.controller';
import { getVideoAnalytics } from '../controllers/analytics.controller';
import {
  likeVideo,
  unlikeVideo,
  saveVideo,
  unsaveVideo,
  shareVideo,
  getComments,
  addComment,
} from '../controllers/interaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateParams } from '../middleware/validation.middleware';
import { uploadVideoSchema, updateVideoSchema } from '../validators/video.validator';
import { shareVideoSchema, addCommentSchema, getCommentsQuerySchema } from '../validators/interaction.validator';
import { idParamSchema } from '../validators/params.validator';
import { trackViewSchema } from '../validators/analytics.validator';
import { trackView } from '../controllers/analytics.controller';
import {
  createDuet,
  createStitch,
  getDuets,
  getStitches,
  getDuetInfo,
  getStitchInfo,
} from '../controllers/duet-stitch.controller';
import { uploadVideoMiddleware } from '../middleware/upload.middleware';
import { uploadRateLimiter } from '../middleware/rate-limit.middleware';

const router: Router = Router();

// All video routes require authentication
router.use(authenticate);

// Upload video
router.post(
  '/',
  uploadRateLimiter,
  uploadVideoMiddleware,
  validate(uploadVideoSchema),
  uploadVideo
);

// Get video
router.get('/:id', validateParams(idParamSchema), getVideo);

// Update video metadata
router.put('/:id', validateParams(idParamSchema), validate(updateVideoSchema), updateVideo);

// Delete video
router.delete('/:id', validateParams(idParamSchema), deleteVideo);

// Get video analytics
router.get('/:id/analytics', validateParams(idParamSchema), getVideoAnalytics);

// Track view
router.post('/:id/track-view', validateParams(idParamSchema), validate(trackViewSchema), trackView);

// Stream video
router.get('/:id/stream', validateParams(idParamSchema), streamVideo);

// HLS streaming info
router.get('/:id/hls', validateParams(idParamSchema), streamHLS);

// Video interactions
router.post('/:id/like', validateParams(idParamSchema), likeVideo);
router.delete('/:id/like', validateParams(idParamSchema), unlikeVideo);
router.post('/:id/save', validateParams(idParamSchema), saveVideo);
router.delete('/:id/save', validateParams(idParamSchema), unsaveVideo);
router.post('/:id/share', validateParams(idParamSchema), validate(shareVideoSchema), shareVideo);

// Comments
router.get('/:id/comments', validateParams(idParamSchema), validate(getCommentsQuerySchema, 'query'), getComments);
router.post('/:id/comments', validateParams(idParamSchema), validate(addCommentSchema), addComment);

// Duet & Stitch
router.post('/:id/duet', validateParams(idParamSchema), uploadVideoMiddleware, createDuet);
router.get('/:id/duets', validateParams(idParamSchema), getDuets);
router.get('/:id/duet-info', validateParams(idParamSchema), getDuetInfo);
router.post('/:id/stitch', validateParams(idParamSchema), uploadVideoMiddleware, createStitch);
router.get('/:id/stitches', validateParams(idParamSchema), getStitches);
router.get('/:id/stitch-info', validateParams(idParamSchema), getStitchInfo);

export default router;

