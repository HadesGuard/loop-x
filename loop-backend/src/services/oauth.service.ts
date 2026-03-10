import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { AuthResponse } from '../types/auth.types';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export class OAuthService {
  /**
   * Authenticate with Google OAuth
   */
  async authenticateGoogle(idToken: string): Promise<AuthResponse> {
    try {
      // Verify Google ID token
      const decodedToken = await this.verifyGoogleToken(idToken);
      
      if (!decodedToken) {
        throw new AppError('Invalid Google token', 401, 'INVALID_TOKEN');
      }

      const { email, name, picture, sub: providerUserId } = decodedToken;

      // Find or create user
      let user = await this.findOrCreateOAuthUser({
        provider: 'google',
        providerUserId,
        email: email!,
        fullName: name,
        avatarUrl: picture,
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
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });

      logger.info(`User authenticated with Google: ${user.id}`);

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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Google OAuth error:', error);
      throw new AppError('Google authentication failed', 500, 'OAUTH_ERROR');
    }
  }

  /**
   * Authenticate with Apple OAuth
   */
  async authenticateApple(idToken: string, userInfo?: {
    email?: string;
    fullName?: string;
  }): Promise<AuthResponse> {
    try {
      // Verify Apple ID token
      const decodedToken = await this.verifyAppleToken(idToken);
      
      if (!decodedToken) {
        throw new AppError('Invalid Apple token', 401, 'INVALID_TOKEN');
      }

      const { sub: providerUserId, email } = decodedToken;
      const userEmail = email || userInfo?.email;

      if (!userEmail) {
        throw new AppError('Email is required for Apple authentication', 400, 'EMAIL_REQUIRED');
      }

      // Find or create user
      let user = await this.findOrCreateOAuthUser({
        provider: 'apple',
        providerUserId,
        email: userEmail,
        fullName: userInfo?.fullName,
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
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });

      logger.info(`User authenticated with Apple: ${user.id}`);

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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Apple OAuth error:', error);
      throw new AppError('Apple authentication failed', 500, 'OAUTH_ERROR');
    }
  }

  /**
   * Find or create user from OAuth provider
   */
  private async findOrCreateOAuthUser(data: {
    provider: 'google' | 'apple';
    providerUserId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }): Promise<{
    id: string;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    createdAt: Date;
  }> {
    // Check if OAuth provider already exists
    const oauthProvider = await prisma.oAuthProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: data.provider,
          providerUserId: data.providerUserId,
        },
      },
      include: { user: true },
    });

    if (oauthProvider) {
      const u = oauthProvider.user;
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
      };
    }

    // Check if user with email exists
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (user) {
      // Link OAuth provider to existing user
      await prisma.oAuthProvider.create({
        data: {
          userId: user.id,
          provider: data.provider,
          providerUserId: data.providerUserId,
        },
      });
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername(data.email);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        username,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        passwordHash: '', // OAuth users don't have passwords
      },
    });

    // Create OAuth provider record
    await prisma.oAuthProvider.create({
      data: {
        userId: newUser.id,
        provider: data.provider,
        providerUserId: data.providerUserId,
      },
    });

    logger.info(`Created new user via OAuth (${data.provider}): ${newUser.id}`);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      avatarUrl: newUser.avatarUrl,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
    };
  }

  /**
   * Generate unique username from email
   */
  private async generateUniqueUsername(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Verify Google ID token
   */
  private async verifyGoogleToken(idToken: string): Promise<any> {
    try {
      if (!env.GOOGLE_CLIENT_ID) {
        logger.warn('GOOGLE_CLIENT_ID not set, falling back to basic token decode');
        // Fallback for development - decode without verification
        return this.decodeTokenUnsafe(idToken);
      }

      const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }
      
      return payload;
    } catch (error) {
      logger.error('Google token verification failed:', error);
      throw new AppError('Invalid Google token', 401, 'INVALID_TOKEN');
    }
  }

  /**
   * Decode token without verification (unsafe - only for development)
   */
  private decodeTokenUnsafe(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Decode Apple token (placeholder - replace with actual verification)
   */
  /**
   * Verify Apple ID token
   */
  private async verifyAppleToken(idToken: string): Promise<any> {
    try {
      if (!env.APPLE_CLIENT_ID) {
        logger.warn('APPLE_CLIENT_ID not set, falling back to basic token decode');
        // Fallback for development
        return this.decodeTokenUnsafe(idToken);
      }

      // Apple uses JWKS (JSON Web Key Set) for token verification
      // Get the key ID from the token header
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new Error('Invalid token structure');
      }

      const kid = decoded.header.kid;
      
      // Apple's JWKS endpoint
      const client = jwksClient({
        jwksUri: 'https://appleid.apple.com/auth/keys',
        cache: true,
        cacheMaxAge: 86400000, // 24 hours
      });

      const key = await client.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      // Verify the token
      const payload = jwt.verify(idToken, signingKey, {
        audience: env.APPLE_CLIENT_ID,
        issuer: 'https://appleid.apple.com',
        algorithms: ['RS256'],
      });

      return payload;
    } catch (error) {
      logger.error('Apple token verification failed:', error);
      throw new AppError('Invalid Apple token', 401, 'INVALID_TOKEN');
    }
  }
}

export const oauthService = new OAuthService();

