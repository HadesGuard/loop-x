import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().max(255).optional().or(z.literal('')),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

