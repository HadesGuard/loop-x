import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { messagingService } from '../services/messaging.service';

/**
 * GET /conversations
 * Get all conversations for current user
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await messagingService.getConversations(userId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /conversations
 * Create or get existing conversation with a user
 */
export const createOrGetConversation = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { userId: otherUserId } = req.body;
  if (!otherUserId || typeof otherUserId !== 'string') {
    throw new AppError('User ID is required', 400, 'INVALID_INPUT');
  }

  const result = await messagingService.createOrGetConversation(userId, otherUserId);

  res.status(201).json({
    success: true,
    data: result,
  });
};

/**
 * GET /conversations/:id/messages
 * Get messages in a conversation
 */
export const getMessages = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: conversationId } = req.params;
  const { page, limit, before } = req.query;

  const pageNum = page ? Number(page) : 1;
  const limitNum = limit ? Number(limit) : 50;
  const beforeId = before ? String(before) : undefined;

  const result = await messagingService.getMessages(userId, conversationId, {
    page: pageNum,
    limit: limitNum,
    before: beforeId,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /conversations/:id/messages
 * Send a message in a conversation
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: conversationId } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new AppError('Message text is required', 400, 'INVALID_INPUT');
  }

  const result = await messagingService.sendMessage(userId, conversationId, text);

  res.status(201).json({
    success: true,
    data: result,
  });
};

/**
 * PUT /conversations/:id/read
 * Mark conversation as read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: conversationId } = req.params;

  await messagingService.markAsRead(userId, conversationId);

  res.json({
    success: true,
    message: 'Conversation marked as read',
  });
};
