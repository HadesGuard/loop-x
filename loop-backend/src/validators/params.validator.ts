import { z } from 'zod';

export const usernameParamSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid username format'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});
