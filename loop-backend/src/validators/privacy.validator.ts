import { z } from 'zod';

export const reportSchema = z.object({
  type: z.enum(['user', 'video']),
  targetId: z.string().uuid('Invalid target ID'),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'violence', 'copyright', 'other']),
  description: z.string().max(1000).optional(),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private']).optional(),
  allowMessages: z.enum(['everyone', 'followers', 'none']).optional(),
  allowComments: z.boolean().optional(),
  allowDuet: z.boolean().optional(),
  allowStitch: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;



