import { Request } from 'express';
import { redis } from '../config/redis';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const RESPONSE_CACHE_PREFIX = 'response-cache';

function toStableQueryString(query: Request['query']): string {
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    return 'none';
  }

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(serializeQueryValue(value))}`)
    .join('&');
}

function serializeQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => serializeQueryValue(item)).join(',');
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function toAuthRequest(req: Request): AuthRequest {
  return req as AuthRequest;
}

export class CacheService {
  buildFeedCacheKey(req: Request): string {
    const authReq = toAuthRequest(req);
    const userId = authReq.user?.userId || 'anonymous';
    const query = toStableQueryString(req.query);

    return `${RESPONSE_CACHE_PREFIX}:videos-feed:user:${userId}:query:${query}`;
  }

  buildVideoDetailCacheKey(req: Request): string {
    const videoId = req.params.id;
    return `${RESPONSE_CACHE_PREFIX}:video:${videoId}`;
  }

  buildUserProfileByIdCacheKey(req: Request): string {
    const authReq = toAuthRequest(req);
    const viewerId = authReq.user?.userId || 'anonymous';
    const profileId = req.params.id;

    return `${RESPONSE_CACHE_PREFIX}:user-profile:viewer:${viewerId}:id:${profileId}`;
  }

  buildUserProfileByUsernameCacheKey(req: Request): string {
    const authReq = toAuthRequest(req);
    const viewerId = authReq.user?.userId || 'anonymous';
    const username = req.params.username;

    return `${RESPONSE_CACHE_PREFIX}:user-profile:viewer:${viewerId}:username:${username}`;
  }

  buildSearchCacheKey(req: Request): string {
    const query = toStableQueryString(req.query);
    return `${RESPONSE_CACHE_PREFIX}:search:query:${query}`;
  }

  async invalidateByPatterns(patterns: string[]): Promise<void> {
    const uniquePatterns = [...new Set(patterns)];

    for (const pattern of uniquePatterns) {
      try {
        const keys = pattern.includes('*') ? await redis.keys(pattern) : [pattern];

        if (keys.length === 0) {
          continue;
        }

        await redis.del(...keys);
      } catch (error) {
        logger.warn('Response cache invalidation error (non-fatal):', error);
      }
    }
  }

  get patterns() {
    return {
      allFeedResponses: `${RESPONSE_CACHE_PREFIX}:videos-feed:*`,
      videoById: (videoId: string) => `${RESPONSE_CACHE_PREFIX}:video:${videoId}`,
      allUserProfiles: `${RESPONSE_CACHE_PREFIX}:user-profile:*`,
      userProfilesById: (userId: string) => `${RESPONSE_CACHE_PREFIX}:user-profile:*:id:${userId}`,
      userProfilesByUsername: (username: string) =>
        `${RESPONSE_CACHE_PREFIX}:user-profile:*:username:${username}`,
      allSearchResponses: `${RESPONSE_CACHE_PREFIX}:search:*`,
      legacyFeedCache: 'feed:*',
    };
  }
}

export const cacheService = new CacheService();
