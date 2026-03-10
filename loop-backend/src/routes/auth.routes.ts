import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { googleAuth, appleAuth } from '../controllers/oauth.controller';
import { generateNonce, verifyWallet } from '../controllers/wallet.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, refreshRateLimiter } from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleAuthSchema,
  appleAuthSchema,
  walletNonceSchema,
  walletVerifySchema,
} from '../validators/auth.validator';

const router: Router = Router();

// Traditional auth
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', refreshRateLimiter, validate(refreshTokenSchema), refresh);
router.post('/logout', authenticate, logout);

// OAuth
router.post('/google', authRateLimiter, validate(googleAuthSchema), googleAuth);
router.post('/apple', authRateLimiter, validate(appleAuthSchema), appleAuth);

// Wallet auth
router.post('/wallet/nonce', authRateLimiter, validate(walletNonceSchema), generateNonce);
router.post('/wallet/verify', authRateLimiter, validate(walletVerifySchema), verifyWallet);

export default router;

