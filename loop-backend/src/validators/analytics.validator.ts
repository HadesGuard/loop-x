import { z } from 'zod';

export const trackViewSchema = z.object({
  watchedDuration: z.number().int().min(0).optional(),
});

export type TrackViewInput = z.infer<typeof trackViewSchema>;

export const getHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type GetHistoryQuery = z.infer<typeof getHistoryQuerySchema>;



