import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const appleAuthSchema = z.object({
  idToken: z.string().min(1, 'Apple ID token is required'),
  userInfo: z.object({
    email: z.string().email().optional(),
    fullName: z.string().optional(),
  }).optional(),
});

export const walletNonceSchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
});

export const walletVerifySchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
  signature: z.string().min(1, 'Signature is required'),
  fullMessage: z.string().min(1, 'Full message is required'),
  walletType: z.enum(['aptos', 'ethereum', 'solana'], {
    errorMap: () => ({ message: 'Wallet type must be aptos, ethereum, or solana' }),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type WalletNonceInput = z.infer<typeof walletNonceSchema>;
export type WalletVerifyInput = z.infer<typeof walletVerifySchema>;

