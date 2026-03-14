import { z } from 'zod';

/** POST /videos/:id/tip — request body (parsed directly against req.body). */
export const tipVideoSchema = z.object({
  /** Gross tip amount in octas (1 APT = 100_000_000 octas). Min 1 000 octas (~0.00001 APT). */
  amountOctas: z
    .number({ required_error: 'amountOctas is required' })
    .int('amountOctas must be an integer')
    .min(1_000, 'Minimum tip is 1 000 octas'),
  /** Viewer's Aptos wallet address, supplied by the client (e.g. from Petra wallet). */
  tipperAddress: z
    .string({ required_error: 'tipperAddress is required' })
    .min(1, 'tipperAddress cannot be empty'),
});

/** GET /creator/earnings — query params (parsed directly against req.query). */
export const getEarningsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type TipVideoInput = z.infer<typeof tipVideoSchema>;
