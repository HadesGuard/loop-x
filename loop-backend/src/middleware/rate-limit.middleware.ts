import rateLimit from 'express-rate-limit';

// Strict limiter for auth endpoints: 10 requests per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// General API limiter: 100 requests per minute per IP
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// Upload limiter: 10 uploads per hour per IP
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many uploads. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// Search limiter: 30 searches per minute per IP
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many search requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// More lenient for token refresh: 20 per 15 minutes
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many refresh attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});
