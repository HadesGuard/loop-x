import { z } from 'zod';

export const reviewReportSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']),
  notes: z.string().max(2000).optional(),
});

export const moderationActionSchema = z.object({
  action: z.enum(['warn', 'remove_content', 'suspend_user']),
  reason: z.string().min(1).max(2000),
});

export const listReportsQuerySchema = z.object({
  status: z
    .enum(['pending', 'reviewed', 'resolved', 'dismissed'])
    .optional(),
  type: z.enum(['video', 'user', 'comment']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
