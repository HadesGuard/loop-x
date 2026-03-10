import { z } from 'zod';

export const createConversationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message text is required').max(5000, 'Message is too long (max 5000 characters)'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  before: z.string().uuid().optional(),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;



