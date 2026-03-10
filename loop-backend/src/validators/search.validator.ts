import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['all', 'users', 'videos', 'hashtags']).default('all').optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const hashtagPageQuerySchema = z.object({
  sort: z.enum(['trending', 'recent']).default('trending').optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type HashtagPageQuery = z.infer<typeof hashtagPageQuerySchema>;

export const trendingHashtagsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type TrendingHashtagsQuery = z.infer<typeof trendingHashtagsQuerySchema>;

export const discoverTrendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  timeframe: z.enum(['day', 'week', 'month']).default('week').optional(),
});

export type DiscoverTrendingQuery = z.infer<typeof discoverTrendingQuerySchema>;

export const discoverCreatorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  category: z.string().optional(),
});

export type DiscoverCreatorsQuery = z.infer<typeof discoverCreatorsQuerySchema>;



