import { z } from 'zod';

export const initiateUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(500 * 1024 * 1024), // 500MB max
  mimeType: z.string().regex(/^video\//),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private', 'followers']).default('public'),
  allowComments: z.boolean().default(true),
  allowDuet: z.boolean().default(true),
  allowStitch: z.boolean().default(true),
});

export const completeUploadSchema = z.object({
  // empty body is fine, just needs the uploadId param
});
