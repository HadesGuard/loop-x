import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { AuthResponse } from '../types/auth.types';
import { AppError } from '../middleware/error.middleware';

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUserByEmail) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUserByUsername) {
      throw new AppError('Username already taken', 400, 'USERNAME_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        fullName: data.fullName,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate tokens
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
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    logger.info(`User registered: ${user.id} (${user.email})`);

    return {
      user,
      token,
      refreshToken,
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
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
    expiresAt.setDate(expiresAt.getDate() + (data.rememberMe ? 30 : 7)); // 30 days if rememberMe, else 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    logger.info(`User logged in: ${user.id} (${user.email})`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // Verify refresh token
    const { verifyRefreshToken } = await import('../utils/jwt');
    verifyRefreshToken(refreshToken); // Verify token is valid

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Generate new tokens
    const newToken = generateAccessToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      username: tokenRecord.user.username,
    });

    const newRefreshToken = generateRefreshToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      username: tokenRecord.user.username,
    });

    // Determine rememberMe from original token expiration (if > 7 days, it was rememberMe)
    const originalExpirationDays = Math.ceil(
      (tokenRecord.expiresAt.getTime() - tokenRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const rememberMe = originalExpirationDays > 7;

    // Update refresh token with same expiration as original
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: newRefreshToken,
        expiresAt,
      },
    });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    // Delete refresh token
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId,
      },
    });

    logger.info(`User logged out: ${userId}`);
  }
}

export const authService = new AuthService();

