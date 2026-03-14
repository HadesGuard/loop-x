import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { userService } from '../services/user.service';
import { cacheService } from '../services/cache.service';

const MAX_LIMIT = 100;
const parseLimit = (raw: string | undefined, defaultVal = 20): number =>
  Math.min(Math.max(parseInt(raw || '', 10) || defaultVal, 1), MAX_LIMIT);
const profileInvalidationPatterns = (req: AuthRequest, userId: string): string[] => {
  const patterns = [
    cacheService.patterns.userProfilesById(userId),
    cacheService.patterns.allSearchResponses,
  ];

  if (req.user?.username) {
    patterns.push(cacheService.patterns.userProfilesByUsername(req.user.username));
  }

  return patterns;
};

/**
 * GET /users/me
 * Get current user profile
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const user = await userService.getCurrentUser(userId);

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * GET /users/:username
 * Get user profile by username
 */
export const getUserByUsername = async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const currentUserId = req.user?.userId;

  const user = await userService.getUserByUsername(username, currentUserId);

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * GET /users/:id/profile
 * Get user profile by ID
 */
export const getUserByIdProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.userId;

  const user = await userService.getUserById(id, currentUserId);

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * PUT /users/me
 * Update current user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const user = await userService.updateProfile(userId, req.body);

  await cacheService.invalidateByPatterns(profileInvalidationPatterns(req, userId));

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * POST /users/:username/follow
 * Follow a user
 */
export const followUser = async (req: AuthRequest, res: Response) => {
  const followerId = req.user?.userId;
  const { username } = req.params;

  if (!followerId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await userService.followUser(followerId, username);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.allUserProfiles,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    message: 'User followed successfully',
  });
};

/**
 * DELETE /users/:username/follow
 * Unfollow a user
 */
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const followerId = req.user?.userId;
  const { username } = req.params;

  if (!followerId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await userService.unfollowUser(followerId, username);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.allUserProfiles,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    message: 'User unfollowed successfully',
  });
};

/**
 * GET /users/:username/videos
 * Get user videos
 */
export const getUserVideos = async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const limit = parseLimit(req.query.limit as string);
  const cursor = req.query.cursor as string | undefined;

  const result = await userService.getUserVideos(username, limit, cursor);

  res.json({
    success: true,
    data: {
      videos: result.videos,
      pagination: {
        limit,
        nextCursor: result.nextCursor,
      },
    },
  });
};

/**
 * GET /users/:username/followers
 * Get user's followers
 */
export const getUserFollowers = async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const limit = parseLimit(req.query.limit as string);
  const cursor = req.query.cursor as string | undefined;

  const result = await userService.getUserFollowers(username, limit, cursor);

  res.json({
    success: true,
    data: {
      users: result.users,
      pagination: { limit, nextCursor: result.nextCursor },
    },
  });
};

/**
 * GET /users/:username/following
 * Get user's following list
 */
export const getUserFollowing = async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const limit = parseLimit(req.query.limit as string);
  const cursor = req.query.cursor as string | undefined;

  const result = await userService.getUserFollowing(username, limit, cursor);

  res.json({
    success: true,
    data: {
      users: result.users,
      pagination: { limit, nextCursor: result.nextCursor },
    },
  });
};

/**
 * GET /users/:username/liked
 * Get user's liked videos
 */
export const getUserLikedVideos = async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const limit = parseLimit(req.query.limit as string);
  const cursor = req.query.cursor as string | undefined;

  const result = await userService.getUserLikedVideos(username, limit, cursor);

  res.json({
    success: true,
    data: {
      videos: result.videos,
      pagination: { limit, nextCursor: result.nextCursor },
    },
  });
};

/**
 * GET /users/me/saved
 * Get current user's saved videos (private, only own)
 */
export const getUserSavedVideos = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  const limit = parseLimit(req.query.limit as string);
  const cursor = req.query.cursor as string | undefined;

  const result = await userService.getUserSavedVideos(userId, limit, cursor);

  res.json({
    success: true,
    data: {
      videos: result.videos,
      pagination: { limit, nextCursor: result.nextCursor },
    },
  });
};

/**
 * POST /users/me/avatar
 * Upload avatar file or URL
 */
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  // If file is uploaded, use it; otherwise accept avatarUrl in body
  if (req.file) {
    const avatarBuffer = Buffer.from(req.file.buffer);
    const avatarUrl = await userService.uploadAvatarFile(userId, avatarBuffer);

    await cacheService.invalidateByPatterns(profileInvalidationPatterns(req, userId));
    
    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl },
    });
  }

  // Fallback: accept avatarUrl in body (for OAuth or direct URL)
  const { avatarUrl } = req.body;

  if (!avatarUrl) {
    throw new AppError('Avatar file or URL is required', 400, 'AVATAR_REQUIRED');
  }

  // Validate URL to prevent SSRF — only allow HTTPS URLs
  try {
    const url = new URL(avatarUrl);
    if (url.protocol !== 'https:') {
      throw new AppError('Avatar URL must use HTTPS', 400, 'INVALID_AVATAR_URL');
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('Invalid avatar URL', 400, 'INVALID_AVATAR_URL');
  }

  await userService.updateAvatar(userId, avatarUrl);

  await cacheService.invalidateByPatterns(profileInvalidationPatterns(req, userId));

  return res.json({
    success: true,
    message: 'Avatar updated successfully',
    data: { avatarUrl },
  });
};

/**
 * DELETE /users/me
 * Delete current user account
 */
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { password } = req.body;
  await userService.deleteAccount(userId, password);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
};
