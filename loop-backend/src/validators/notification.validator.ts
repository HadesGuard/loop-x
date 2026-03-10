import { z } from 'zod';

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  type: z.enum(['like', 'comment', 'follow', 'reply', 'mention']).optional(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;

