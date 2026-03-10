import { z } from 'zod';

export const shareVideoSchema = z.object({
  platform: z.enum(['copy_link', 'twitter', 'facebook', 'whatsapp', 'telegram']).optional(),
});

export type ShareVideoInput = z.infer<typeof shareVideoSchema>;

export const addCommentSchema = z.object({
  text: z.string().min(1).max(1000, 'Comment must be less than 1000 characters'),
  parentId: z.string().uuid().optional(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).default('newest').optional(),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;



