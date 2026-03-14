import { Router } from 'express';
import {
  getCurrentUser,
  getUserByIdProfile,
  getUserByUsername,
  updateProfile,
  followUser,
  unfollowUser,
  getUserVideos,
  getUserFollowers,
  getUserFollowing,
  getUserLikedVideos,
  getUserSavedVideos,
  uploadAvatar,
  deleteAccount,
} from '../controllers/user.controller';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getPrivacySettings,
  updatePrivacySettings,
} from '../controllers/privacy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateParams } from '../middleware/validation.middleware';
import { responseCache } from '../middleware/cache.middleware';
import { updateProfileSchema, deleteAccountSchema } from '../validators/user.validator';
import { privacySettingsSchema } from '../validators/privacy.validator';
import { idParamSchema, usernameParamSchema } from '../validators/params.validator';
import { cacheService } from '../services/cache.service';
import { uploadAvatarMiddleware } from '../middleware/upload.middleware';

const router: Router = Router();

// All user routes require authentication
router.use(authenticate);

// Current user routes
router.get('/me', getCurrentUser);
router.put('/me', validate(updateProfileSchema), updateProfile);
router.post('/me/avatar', uploadAvatarMiddleware, uploadAvatar);
router.delete('/me', validate(deleteAccountSchema), deleteAccount);

// All /me/* routes must be before /:username to avoid "me" matching as username
router.get('/me/saved', getUserSavedVideos);
router.get('/me/blocked', getBlockedUsers);
router.get('/me/privacy-settings', getPrivacySettings);
router.put('/me/privacy-settings', validate(privacySettingsSchema), updatePrivacySettings);

// User profile routes (/:username is a wildcard — must come after /me/*)
router.get(
  '/:id/profile',
  validateParams(idParamSchema),
  responseCache({
    ttlSeconds: 120,
    key: (req) => cacheService.buildUserProfileByIdCacheKey(req),
  }),
  getUserByIdProfile
);
router.get(
  '/:username',
  validateParams(usernameParamSchema),
  responseCache({
    ttlSeconds: 120,
    key: (req) => cacheService.buildUserProfileByUsernameCacheKey(req),
  }),
  getUserByUsername
);
router.get('/:username/videos', validateParams(usernameParamSchema), getUserVideos);
router.get('/:username/followers', validateParams(usernameParamSchema), getUserFollowers);
router.get('/:username/following', validateParams(usernameParamSchema), getUserFollowing);
router.get('/:username/liked', validateParams(usernameParamSchema), getUserLikedVideos);

// Follow routes
router.post('/:username/follow', validateParams(usernameParamSchema), followUser);
router.delete('/:username/follow', validateParams(usernameParamSchema), unfollowUser);

// Block routes
router.post('/:username/block', validateParams(usernameParamSchema), blockUser);
router.delete('/:username/block', validateParams(usernameParamSchema), unblockUser);

export default router;
