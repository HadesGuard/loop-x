import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/utils/password';
import { generateAccessToken, generateRefreshToken } from '../../src/utils/jwt';

/**
 * Create a test user
 */
export async function createTestUser(
  prisma: PrismaClient,
  data?: {
    email?: string;
    username?: string;
    password?: string;
    fullName?: string;
    isActive?: boolean;
  }
) {
  const passwordHash = await hashPassword(data?.password || 'password123');
  
  return await prisma.user.create({
    data: {
      email: data?.email || `test${Date.now()}@example.com`,
      username: data?.username || `testuser${Date.now()}`,
      passwordHash,
      fullName: data?.fullName,
      isActive: data?.isActive !== undefined ? data.isActive : true,
    },
  });
}

/**
 * Create a test user with tokens
 */
export async function createTestUserWithTokens(
  prisma: PrismaClient,
  data?: {
    email?: string;
    username?: string;
    password?: string;
  }
) {
  const user = await createTestUser(prisma, data);
  
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  
  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });
  
  return {
    user,
    token,
    refreshToken,
  };
}

/**
 * Create a test video
 */
export async function createTestVideo(
  prisma: PrismaClient,
  userId: string,
  data?: {
    title?: string;
    url?: string;
    status?: string;
    privacy?: string;
    shelbyAccount?: string;
    shelbyBlobName?: string;
    shelbySize?: bigint;
  }
) {
  return await prisma.video.create({
    data: {
      userId,
      title: data?.title || 'Test Video',
      url: data?.url || 'https://example.com/video.mp4',
      status: data?.status || 'ready',
      privacy: data?.privacy || 'public',
      shelbyAccount: data?.shelbyAccount,
      shelbyBlobName: data?.shelbyBlobName,
      shelbySize: data?.shelbySize,
    },
  });
}

