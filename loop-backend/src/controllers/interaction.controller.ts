import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { interactionService } from '../services/interaction.service';
import { cacheService } from '../services/cache.service';
import { GetCommentsQuery } from '../validators/interaction.validator';

/**
 * POST /videos/:id/like
 * Like a video
 */
export const likeVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleLikeVideo(userId, videoId);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.videoById(videoId),
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * DELETE /videos/:id/like
 * Unlike a video
 */
export const unlikeVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleLikeVideo(userId, videoId);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.videoById(videoId),
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /videos/:id/save
 * Save a video to favorites
 */
export const saveVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleSaveVideo(userId, videoId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * DELETE /videos/:id/save
 * Remove video from favorites
 */
export const unsaveVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleSaveVideo(userId, videoId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /videos/:id/share
 * Share a video
 */
export const shareVideo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;
  const { platform } = req.body;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.shareVideo(userId, videoId, platform);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.videoById(videoId),
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /videos/:id/comments
 * Get comments for a video
 */
export const getComments = async (req: AuthRequest, res: Response) => {
  const { id: videoId } = req.params;
  const userId = req.user?.userId;

  const query: GetCommentsQuery = {
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
    sort: (req.query.sort as 'newest' | 'oldest' | 'popular') || 'newest',
  };

  const result = await interactionService.getComments(videoId, userId, query);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /videos/:id/comments
 * Add a comment to a video
 */
export const addComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: videoId } = req.params;
  const { text, parentId } = req.body;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new AppError('Comment text is required', 400, 'INVALID_INPUT');
  }

  const result = await interactionService.addComment(userId, videoId, text.trim(), parentId);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.videoById(videoId),
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.status(201).json({
    success: true,
    data: result,
  });
};

/**
 * POST /comments/:id/like
 * Like a comment
 */
export const likeComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: commentId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleLikeComment(userId, commentId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * DELETE /comments/:id/like
 * Unlike a comment
 */
export const unlikeComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: commentId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await interactionService.toggleLikeComment(userId, commentId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * DELETE /comments/:id
 * Delete a comment
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id: commentId } = req.params;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  await interactionService.deleteComment(userId, commentId);

  await cacheService.invalidateByPatterns([
    cacheService.patterns.allFeedResponses,
    cacheService.patterns.legacyFeedCache,
  ]);

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
};

