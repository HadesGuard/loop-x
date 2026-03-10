import { z } from 'zod';

export const uploadVideoSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private', 'friends']).default('public'),
  allowComments: z.boolean().default(true),
  allowDuet: z.boolean().default(true),
  allowStitch: z.boolean().default(true),
});

export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;

export const updateVideoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private', 'friends']).optional(),
  allowComments: z.boolean().optional(),
  allowDuet: z.boolean().optional(),
  allowStitch: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

