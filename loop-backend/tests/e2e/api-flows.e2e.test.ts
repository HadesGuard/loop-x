import 'express-async-errors';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { hashPassword } from '../../src/utils/password';
import { generateAccessToken } from '../../src/utils/jwt';
import { prisma } from '../../src/config/database';
import { setupTestDatabase } from '../helpers/setup';

const hoisted = vi.hoisted(() => {
  const redisStore = new Map<string, string>();
  return {
    redisStore,
    queueVideoProcessingMock: vi.fn(async () => undefined),
    shelbyUploadVideoMock: vi.fn(async (videoData: Buffer, videoId: string) => ({
      account: '0xmockaccount',
      blobName: `${videoId}.mp4`,
      merkleRoot: 'mock-merkle-root',
      expirationMicros: Date.now() * 1_000,
      size: videoData.length,
      chunksets: 1,
    })),
  };
});

vi.mock('../../src/config/redis', () => ({
  redis: {
    get: vi.fn(async (key: string) => hoisted.redisStore.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      hoisted.redisStore.set(key, value);
      return 'OK';
    }),
    keys: vi.fn(async (pattern: string) => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return [...hoisted.redisStore.keys()].filter((key) => regex.test(key));
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const key of keys) {
        hoisted.redisStore.delete(key);
      }
      return keys.length;
    }),
  },
}));

vi.mock('../../src/queues/video-processing.queue', () => ({
  queueVideoProcessing: hoisted.queueVideoProcessingMock,
  getVideoProcessingStatus: vi.fn(async () => null),
}));

vi.mock('../../src/services/shelby.service', () => ({
  shelbyService: {
    uploadVideo: hoisted.shelbyUploadVideoMock,
    uploadBlob: vi.fn(async () => undefined),
    downloadBlob: vi.fn(async () => new ReadableStream()),
    getServiceAccountAddress: vi.fn(() => '0xmockaccount'),
  },
}));

const runTag = `e2e${Date.now().toString(36)}`;
let uniqueCounter = 0;
let app: Express;

function uniquePart(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}_${runTag}_${uniqueCounter}`;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function errorCodeFrom(body: any): string | undefined {
  return body?.error?.code ?? body?.code;
}

async function buildApp(): Promise<Express> {
  const [
    { errorHandler },
    { default: authRoutes },
    { default: videoRoutes },
    { default: feedRoutes },
    { default: userRoutes },
    { default: conversationRoutes },
    { default: searchRoutes },
  ] = await Promise.all([
    import('../../src/middleware/error.middleware'),
    import('../../src/routes/auth.routes'),
    import('../../src/routes/video.routes'),
    import('../../src/routes/feed.routes'),
    import('../../src/routes/user.routes'),
    import('../../src/routes/conversation.routes'),
    import('../../src/routes/search.routes'),
  ]);

  const testApp = express();
  testApp.use(express.json({ limit: '10mb' }));
  testApp.use(express.urlencoded({ extended: true, limit: '10mb' }));
  testApp.use('/auth', authRoutes);
  testApp.use('/videos', videoRoutes);
  testApp.use('/feed', feedRoutes);
  testApp.use('/users', userRoutes);
  testApp.use('/conversations', conversationRoutes);
  testApp.use('/search', searchRoutes);
  testApp.use(errorHandler);
  return testApp;
}

async function createDbUser(prefix: string) {
  const slug = uniquePart(prefix).slice(0, 32).toLowerCase();
  const user = await prisma.user.create({
    data: {
      email: `${slug}@e2e.local`,
      username: slug,
      passwordHash: await hashPassword('Password123!'),
      fullName: `E2E ${slug}`,
    },
  });

  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return { user, token };
}

async function createReadyVideo(userId: string, titlePrefix: string) {
  return prisma.video.create({
    data: {
      userId,
      title: `${titlePrefix} ${uniquePart('video')}`,
      description: `Description ${runTag}`,
      url: `shelby://0xmockaccount/${uniquePart('blob')}.mp4`,
      status: 'ready',
      privacy: 'public',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 12,
      fileSize: BigInt(1024),
      shelbyAccount: '0xmockaccount',
      shelbyBlobName: `${uniquePart('blobname')}.mp4`,
      shelbySize: BigInt(1024),
    },
  });
}

async function cleanupRunData() {
  await prisma.hashtag.deleteMany({
    where: {
      tag: {
        contains: runTag,
      },
    },
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: runTag,
      },
    },
    select: { id: true },
  });

  if (users.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: users.map((user) => user.id),
        },
      },
    });
  }

  hoisted.redisStore.clear();
  hoisted.queueVideoProcessingMock.mockClear();
  hoisted.shelbyUploadVideoMock.mockClear();
}

describe('E2E API Critical Flows', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long-for-testing';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-32-chars-long-for-testing';

    await setupTestDatabase();
    app = await buildApp();
  });

  afterEach(async () => {
    await cleanupRunData();
  });

  afterAll(async () => {
    await cleanupRunData();
    await prisma.$disconnect();
  });

  describe('Auth flow', () => {
    it('supports signup -> login -> refresh -> logout and invalidates refreshed token on logout', async () => {
      const username = uniquePart('authuser').slice(0, 24);
      const email = `${username}.${runTag}@e2e.local`;
      const password = 'Password123!';

      const registerRes = await request(app).post('/auth/register').send({
        email,
        username,
        password,
        fullName: 'QA Auth Flow',
      });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.data.user.email).toBe(email);

      const loginRes = await request(app).post('/auth/login').send({
        email,
        password,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.token).toBeTypeOf('string');
      expect(loginRes.body.data.refreshToken).toBeTypeOf('string');

      const refreshRes = await request(app).post('/auth/refresh').send({
        refreshToken: loginRes.body.data.refreshToken,
      });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.token).toBeTypeOf('string');
      expect(refreshRes.body.data.refreshToken).toBeTypeOf('string');
      expect(refreshRes.body.data.refreshToken).not.toBe(loginRes.body.data.refreshToken);

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set(authHeader(loginRes.body.data.token))
        .send({ refreshToken: refreshRes.body.data.refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      const refreshAfterLogoutRes = await request(app).post('/auth/refresh').send({
        refreshToken: refreshRes.body.data.refreshToken,
      });

      expect(refreshAfterLogoutRes.status).toBe(401);
      expect(errorCodeFrom(refreshAfterLogoutRes.body)).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects duplicate email registration', async () => {
      const usernameA = uniquePart('dupe').slice(0, 24);
      const usernameB = uniquePart('dupe').slice(0, 24);
      const email = `${uniquePart('dupe-email')}@e2e.local`;

      const firstRegister = await request(app).post('/auth/register').send({
        email,
        username: usernameA,
        password: 'Password123!',
      });
      expect(firstRegister.status).toBe(201);

      const secondRegister = await request(app).post('/auth/register').send({
        email,
        username: usernameB,
        password: 'Password123!',
      });

      expect(secondRegister.status).toBe(400);
      expect(errorCodeFrom(secondRegister.body)).toBe('EMAIL_EXISTS');
    });
  });

  describe('Video flow', () => {
    it('supports upload -> process completion -> feed visibility -> like -> comment', async () => {
      const creator = await createDbUser('creator');
      const viewer = await createDbUser('viewer');

      const uploadRes = await request(app)
        .post('/videos')
        .set(authHeader(creator.token))
        .field('title', `Upload ${runTag}`)
        .field('description', 'Video from E2E flow')
        .field('privacy', 'public')
        .attach('video', Buffer.from('mock-video-bytes'), {
          filename: 'test.mp4',
          contentType: 'video/mp4',
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.video.status).toBe('uploading');

      const uploadedVideoId = uploadRes.body.data.video.id as string;
      expect(hoisted.shelbyUploadVideoMock).toHaveBeenCalledOnce();
      expect(hoisted.queueVideoProcessingMock).toHaveBeenCalledWith(uploadedVideoId, false);

      await prisma.video.update({
        where: { id: uploadedVideoId },
        data: {
          status: 'ready',
          thumbnailUrl: 'https://example.com/processed-thumb.jpg',
          duration: 15,
        },
      });

      const feedRes = await request(app).get('/feed').set(authHeader(viewer.token));
      expect(feedRes.status).toBe(200);
      expect(feedRes.body.success).toBe(true);
      expect(
        feedRes.body.data.videos.some((video: { id: string }) => video.id === uploadedVideoId)
      ).toBe(true);

      const likeRes = await request(app)
        .post(`/videos/${uploadedVideoId}/like`)
        .set(authHeader(viewer.token))
        .send({});
      expect(likeRes.status).toBe(200);
      expect(likeRes.body.success).toBe(true);
      expect(likeRes.body.data.liked).toBe(true);
      expect(likeRes.body.data.likesCount).toBe(1);

      const commentRes = await request(app)
        .post(`/videos/${uploadedVideoId}/comments`)
        .set(authHeader(viewer.token))
        .send({ text: 'Great upload' });
      expect(commentRes.status).toBe(201);
      expect(commentRes.body.success).toBe(true);
      expect(commentRes.body.data.text).toBe('Great upload');

      const commentsRes = await request(app)
        .get(`/videos/${uploadedVideoId}/comments`)
        .set(authHeader(viewer.token));
      expect(commentsRes.status).toBe(200);
      expect(commentsRes.body.success).toBe(true);
      expect(commentsRes.body.data.comments).toHaveLength(1);
    });

    it('rejects empty comment payloads with validation errors', async () => {
      const owner = await createDbUser('owner');
      const commenter = await createDbUser('commenter');
      const video = await createReadyVideo(owner.user.id, 'Comment Validation');

      const response = await request(app)
        .post(`/videos/${video.id}/comments`)
        .set(authHeader(commenter.token))
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(errorCodeFrom(response.body)).toBe('VALIDATION_ERROR');
    });
  });

  describe('Social flow', () => {
    it('supports follow -> following feed -> DM conversation and message exchange', async () => {
      const creator = await createDbUser('social_creator');
      const follower = await createDbUser('social_follower');
      const video = await createReadyVideo(creator.user.id, 'Following Feed Video');

      const followRes = await request(app)
        .post(`/users/${creator.user.username}/follow`)
        .set(authHeader(follower.token))
        .send({});
      expect(followRes.status).toBe(200);
      expect(followRes.body.success).toBe(true);

      const followingFeedRes = await request(app)
        .get('/feed/following')
        .set(authHeader(follower.token));
      expect(followingFeedRes.status).toBe(200);
      expect(followingFeedRes.body.success).toBe(true);
      expect(
        followingFeedRes.body.data.videos.some((item: { id: string }) => item.id === video.id)
      ).toBe(true);

      const conversationRes = await request(app)
        .post('/conversations')
        .set(authHeader(follower.token))
        .send({ userId: creator.user.id });
      expect(conversationRes.status).toBe(201);
      expect(conversationRes.body.success).toBe(true);
      const conversationId = conversationRes.body.data.id as string;

      const messageRes = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(follower.token))
        .send({ text: 'Hello from follower' });
      expect(messageRes.status).toBe(201);
      expect(messageRes.body.success).toBe(true);
      expect(messageRes.body.data.text).toBe('Hello from follower');

      const messagesForCreatorRes = await request(app)
        .get(`/conversations/${conversationId}/messages`)
        .set(authHeader(creator.token));
      expect(messagesForCreatorRes.status).toBe(200);
      expect(messagesForCreatorRes.body.success).toBe(true);
      expect(messagesForCreatorRes.body.data.messages).toHaveLength(1);
      expect(messagesForCreatorRes.body.data.messages[0].text).toBe('Hello from follower');
      expect(messagesForCreatorRes.body.data.messages[0].isMine).toBe(false);
    });

    it('rejects duplicate follow requests', async () => {
      const creator = await createDbUser('social_dupe_creator');
      const follower = await createDbUser('social_dupe_follower');

      const firstFollow = await request(app)
        .post(`/users/${creator.user.username}/follow`)
        .set(authHeader(follower.token))
        .send({});
      expect(firstFollow.status).toBe(200);

      const secondFollow = await request(app)
        .post(`/users/${creator.user.username}/follow`)
        .set(authHeader(follower.token))
        .send({});

      expect(secondFollow.status).toBe(400);
      expect(errorCodeFrom(secondFollow.body)).toBe('ALREADY_FOLLOWING');
    });
  });

  describe('Search flow', () => {
    it('returns users, videos, and hashtags for targeted searches', async () => {
      const requester = await createDbUser('search_requester');
      const creator = await createDbUser('search_creator');

      const queryPart = uniquePart('trend').toLowerCase();
      const hashtagTag = `tag_${queryPart}`;

      const video = await prisma.video.create({
        data: {
          userId: creator.user.id,
          title: `Amazing ${queryPart} clip`,
          description: `A searchable ${queryPart} video`,
          url: `shelby://0xmockaccount/${uniquePart('search-video')}.mp4`,
          status: 'ready',
          privacy: 'public',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      });

      await prisma.hashtag.create({
        data: {
          tag: hashtagTag,
          views: BigInt(1234),
          videosCount: 1,
        },
      });

      const usersSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: creator.user.username, type: 'users' });
      expect(usersSearch.status).toBe(200);
      expect(usersSearch.body.success).toBe(true);
      expect(
        usersSearch.body.data.users.some(
          (item: { username: string }) => item.username === `@${creator.user.username}`
        )
      ).toBe(true);

      const videosSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: queryPart, type: 'videos' });
      expect(videosSearch.status).toBe(200);
      expect(videosSearch.body.success).toBe(true);
      expect(
        videosSearch.body.data.videos.some((item: { id: string }) => item.id === video.id)
      ).toBe(true);

      const hashtagsSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: queryPart, type: 'hashtags' });
      expect(hashtagsSearch.status).toBe(200);
      expect(hashtagsSearch.body.success).toBe(true);
      expect(
        hashtagsSearch.body.data.hashtags.some((item: { tag: string }) => item.tag === hashtagTag)
      ).toBe(true);
    });

    it('rejects missing query parameter', async () => {
      const requester = await createDbUser('search_validation');

      const response = await request(app).get('/search').set(authHeader(requester.token));

      expect(response.status).toBe(400);
      expect(errorCodeFrom(response.body)).toBe('VALIDATION_ERROR');
    });
  });

  describe('Response cache flow', () => {
    it('caches /videos/:id responses and invalidates after video update', async () => {
      const owner = await createDbUser('cache_video_owner');
      const viewer = await createDbUser('cache_video_viewer');
      const video = await createReadyVideo(owner.user.id, 'Cache Video');

      const firstGet = await request(app)
        .get(`/videos/${video.id}`)
        .set(authHeader(viewer.token));
      expect(firstGet.status).toBe(200);
      expect(firstGet.headers['x-cache']).toBe('MISS');
      expect(firstGet.headers['cache-control']).toContain('max-age=60');

      const secondGet = await request(app)
        .get(`/videos/${video.id}`)
        .set(authHeader(viewer.token));
      expect(secondGet.status).toBe(200);
      expect(secondGet.headers['x-cache']).toBe('HIT');

      const updatedTitle = `Updated ${uniquePart('video_title')}`;
      const updateRes = await request(app)
        .put(`/videos/${video.id}`)
        .set(authHeader(owner.token))
        .send({ title: updatedTitle });
      expect(updateRes.status).toBe(200);

      const thirdGet = await request(app)
        .get(`/videos/${video.id}`)
        .set(authHeader(viewer.token));
      expect(thirdGet.status).toBe(200);
      expect(thirdGet.headers['x-cache']).toBe('MISS');
      expect(thirdGet.body.data.video.title).toBe(updatedTitle);
    });

    it('caches /users/:id/profile responses and invalidates after profile update', async () => {
      const user = await createDbUser('cache_profile_user');

      const firstGet = await request(app)
        .get(`/users/${user.user.id}/profile`)
        .set(authHeader(user.token));
      expect(firstGet.status).toBe(200);
      expect(firstGet.headers['x-cache']).toBe('MISS');
      expect(firstGet.headers['cache-control']).toContain('max-age=120');

      const secondGet = await request(app)
        .get(`/users/${user.user.id}/profile`)
        .set(authHeader(user.token));
      expect(secondGet.status).toBe(200);
      expect(secondGet.headers['x-cache']).toBe('HIT');

      const updatedName = `Profile ${uniquePart('name')}`;
      const updateRes = await request(app)
        .put('/users/me')
        .set(authHeader(user.token))
        .send({ fullName: updatedName });
      expect(updateRes.status).toBe(200);

      const thirdGet = await request(app)
        .get(`/users/${user.user.id}/profile`)
        .set(authHeader(user.token));
      expect(thirdGet.status).toBe(200);
      expect(thirdGet.headers['x-cache']).toBe('MISS');
      expect(thirdGet.body.data.user.fullName).toBe(updatedName);
    });

    it('keys /search cache by query params and invalidates on write', async () => {
      const requester = await createDbUser('cache_search_requester');
      const creator = await createDbUser('cache_search_creator');
      const term = uniquePart('cache_search_term').toLowerCase();

      const video = await prisma.video.create({
        data: {
          userId: creator.user.id,
          title: `Cache ${term}`,
          description: `Search ${term}`,
          url: `shelby://0xmockaccount/${uniquePart('cache-search-video')}.mp4`,
          status: 'ready',
          privacy: 'public',
          thumbnailUrl: 'https://example.com/cache-thumb.jpg',
        },
      });

      const firstSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: term, type: 'videos' });
      expect(firstSearch.status).toBe(200);
      expect(firstSearch.headers['x-cache']).toBe('MISS');
      expect(firstSearch.headers['cache-control']).toContain('max-age=30');

      const secondSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: term, type: 'videos' });
      expect(secondSearch.status).toBe(200);
      expect(secondSearch.headers['x-cache']).toBe('HIT');

      const differentQuerySearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: term, type: 'users' });
      expect(differentQuerySearch.status).toBe(200);
      expect(differentQuerySearch.headers['x-cache']).toBe('MISS');

      const updateRes = await request(app)
        .put(`/videos/${video.id}`)
        .set(authHeader(creator.token))
        .send({ title: `Updated ${term}` });
      expect(updateRes.status).toBe(200);

      const thirdSearch = await request(app)
        .get('/search')
        .set(authHeader(requester.token))
        .query({ q: term, type: 'videos' });
      expect(thirdSearch.status).toBe(200);
      expect(thirdSearch.headers['x-cache']).toBe('MISS');
    });

    it('supports /videos/feed alias with per-user cache keys', async () => {
      const creator = await createDbUser('cache_feed_creator');
      const viewerA = await createDbUser('cache_feed_viewer_a');
      const viewerB = await createDbUser('cache_feed_viewer_b');

      await createReadyVideo(creator.user.id, 'Cache Feed Video');

      const firstForViewerA = await request(app)
        .get('/videos/feed')
        .set(authHeader(viewerA.token));
      expect(firstForViewerA.status).toBe(200);
      expect(firstForViewerA.headers['x-cache']).toBe('MISS');
      expect(firstForViewerA.headers['cache-control']).toContain('max-age=30');

      const secondForViewerA = await request(app)
        .get('/videos/feed')
        .set(authHeader(viewerA.token));
      expect(secondForViewerA.status).toBe(200);
      expect(secondForViewerA.headers['x-cache']).toBe('HIT');

      const firstForViewerB = await request(app)
        .get('/videos/feed')
        .set(authHeader(viewerB.token));
      expect(firstForViewerB.status).toBe(200);
      expect(firstForViewerB.headers['x-cache']).toBe('MISS');
    });
  });
});
