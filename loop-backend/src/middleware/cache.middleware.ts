import { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface CachedPayload {
  statusCode: number;
  body: unknown;
}

interface ResponseCacheOptions {
  ttlSeconds: number;
  key: (req: Request) => string;
  scope?: 'private' | 'public';
}

export const responseCache = ({
  ttlSeconds,
  key,
  scope = 'private',
}: ResponseCacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const cacheKey = key(req);
    const cacheControl = `${scope}, max-age=${ttlSeconds}`;

    try {
      const cachedValue = await redis.get(cacheKey);

      if (cachedValue) {
        const cachedPayload = JSON.parse(cachedValue) as CachedPayload;

        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', cacheControl);
        res.status(cachedPayload.statusCode).json(cachedPayload.body);
        return;
      }
    } catch (error) {
      logger.warn('Response cache read error (non-fatal):', error);
    }

    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', cacheControl);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payload: CachedPayload = {
          statusCode: res.statusCode,
          body,
        };

        redis
          .setex(cacheKey, ttlSeconds, JSON.stringify(payload))
          .catch((error) => logger.warn('Response cache write error (non-fatal):', error));
      }

      return originalJson(body);
    }) as typeof res.json;

    next();
  };
};
