import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock password utils
vi.mock('../../../src/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_123'),
  comparePassword: vi.fn(),
}));

// Mock jwt utils
vi.mock('../../../src/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('mock_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock_refresh_token'),
  verifyRefreshToken: vi.fn(),
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AuthService } from '../../../src/services/auth.service';
import { prisma } from '../../../src/config/database';
import { hashPassword, comparePassword } from '../../../src/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../src/utils/jwt';

const mockPrisma = vi.mocked(prisma);
const mockComparePassword = vi.mocked(comparePassword);
const mockVerifyRefreshToken = vi.mocked(verifyRefreshToken);

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password_123',
    fullName: 'Test User',
    avatarUrl: null,
    bio: null,
    website: null,
    isVerified: false,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockUserSelectFields = {
    id: mockUser.id,
    username: mockUser.username,
    email: mockUser.email,
    fullName: mockUser.fullName,
    avatarUrl: mockUser.avatarUrl,
    isVerified: mockUser.isVerified,
    createdAt: mockUser.createdAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  // ============================================
  // register()
  // ============================================
  describe('register()', () => {
    const registerInput = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      username: 'newuser',
      fullName: 'New User',
    };

    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUserSelectFields as any);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.register(registerInput);

      expect(result).toEqual({
        user: mockUserSelectFields,
        token: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });

      // Verify email uniqueness check
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerInput.email },
      });

      // Verify username uniqueness check
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: registerInput.username },
      });

      // Verify password was hashed
      expect(hashPassword).toHaveBeenCalledWith(registerInput.password);

      // Verify user creation with correct data
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerInput.email,
          username: registerInput.username,
          passwordHash: 'hashed_password_123',
          fullName: registerInput.fullName,
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

      // Verify tokens were generated
      expect(generateAccessToken).toHaveBeenCalledWith({
        userId: mockUserSelectFields.id,
        email: mockUserSelectFields.email,
        username: mockUserSelectFields.username,
      });
      expect(generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUserSelectFields.id,
        email: mockUserSelectFields.email,
        username: mockUserSelectFields.username,
      });

      // Verify refresh token was stored
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserSelectFields.id,
          token: 'mock_refresh_token',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should register a user without fullName', async () => {
      const inputWithoutFullName = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        username: 'newuser',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUserSelectFields,
        fullName: null,
      } as any);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.register(inputWithoutFullName);

      expect(result.user.fullName).toBeNull();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: undefined,
          }),
        }),
      );
    });

    it('should throw EMAIL_EXISTS when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(authService.register(registerInput)).rejects.toThrow(AppError);

      try {
        await authService.register(registerInput);
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.message).toBe('Email already registered');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('EMAIL_EXISTS');
      }

      // Should not attempt to create user
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw USERNAME_EXISTS when username is already taken', async () => {
      // First call (email check) returns null, second call (username check) returns existing user
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser as any); // username check

      try {
        await authService.register(registerInput);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.message).toBe('Username already taken');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('USERNAME_EXISTS');
      }
    });

    it('should store refresh token with 7-day expiration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUserSelectFields as any);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const beforeDate = new Date();
      await authService.register(registerInput);

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;

      // Should expire ~7 days from now
      const daysDiff = (expiresAt.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(6.9);
      expect(daysDiff).toBeLessThanOrEqual(7.1);
    });
  });

  // ============================================
  // login()
  // ============================================
  describe('login()', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'correctPassword123',
      rememberMe: false,
    };

    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.login(loginInput);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          fullName: mockUser.fullName,
          avatarUrl: mockUser.avatarUrl,
          isVerified: mockUser.isVerified,
          createdAt: mockUser.createdAt,
        },
        token: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginInput.email },
      });
      expect(comparePassword).toHaveBeenCalledWith(loginInput.password, mockUser.passwordHash);
    });

    it('should throw INVALID_CREDENTIALS when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginInput)).rejects.toThrow(AppError);
      await expect(authService.login(loginInput)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });

      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockComparePassword.mockResolvedValue(false);

      await expect(authService.login(loginInput)).rejects.toThrow(AppError);
      await expect(authService.login(loginInput)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should throw ACCOUNT_DEACTIVATED when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      await expect(authService.login(loginInput)).rejects.toThrow(AppError);
      await expect(authService.login(loginInput)).rejects.toMatchObject({
        message: 'Account is deactivated',
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });

      // Password should not be checked for deactivated accounts
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should set 30-day expiration when rememberMe is true', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const beforeDate = new Date();
      await authService.login({ ...loginInput, rememberMe: true });

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;

      // Should expire ~30 days from now
      const daysDiff = (expiresAt.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(29.9);
      expect(daysDiff).toBeLessThanOrEqual(30.1);
    });

    it('should set 7-day expiration when rememberMe is false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const beforeDate = new Date();
      await authService.login({ ...loginInput, rememberMe: false });

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;

      const daysDiff = (expiresAt.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(6.9);
      expect(daysDiff).toBeLessThanOrEqual(7.1);
    });

    it('should not expose sensitive fields in the response user object', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      const result = await authService.login(loginInput);

      // Should not contain passwordHash or other internal fields
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('isActive');
      expect(result.user).not.toHaveProperty('updatedAt');
      expect(result.user).not.toHaveProperty('bio');
      expect(result.user).not.toHaveProperty('website');
    });
  });

  // ============================================
  // refreshToken()
  // ============================================
  describe('refreshToken()', () => {
    const validRefreshToken = 'valid_refresh_token_string';

    const mockTokenRecord = {
      id: '660e8400-e29b-41d4-a716-446655440001',
      userId: mockUser.id,
      token: validRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      user: mockUser,
    };

    it('should rotate tokens successfully', async () => {
      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.refreshToken.update.mockResolvedValue({} as any);

      const result = await authService.refreshToken(validRefreshToken);

      expect(result).toEqual({
        token: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });

      // Verify the old token was updated (rotation)
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id },
        data: {
          token: 'mock_refresh_token',
          expiresAt: expect.any(Date),
        },
      });

      // Verify new tokens were generated with correct payload
      expect(generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
      });
      expect(generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
      });
    });

    it('should throw when JWT verification fails (invalid token)', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      await expect(authService.refreshToken('invalid_token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw when JWT verification fails (expired JWT)', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Refresh token expired');
      });

      await expect(authService.refreshToken('expired_jwt_token')).rejects.toThrow('Refresh token expired');
    });

    it('should throw INVALID_REFRESH_TOKEN when token is not found in database', async () => {
      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(AppError);
      await expect(authService.refreshToken(validRefreshToken)).rejects.toMatchObject({
        message: 'Invalid refresh token',
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('should throw REFRESH_TOKEN_EXPIRED and delete token when DB token is expired', async () => {
      const expiredTokenRecord = {
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      };

      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredTokenRecord as any);
      mockPrisma.refreshToken.delete.mockResolvedValue({} as any);

      await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(AppError);
      await expect(authService.refreshToken(validRefreshToken)).rejects.toMatchObject({
        message: 'Refresh token expired',
        statusCode: 401,
        code: 'REFRESH_TOKEN_EXPIRED',
      });

      // Verify expired token was deleted from DB
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: expiredTokenRecord.id },
      });
    });

    it('should throw ACCOUNT_DEACTIVATED when user is inactive', async () => {
      const tokenWithInactiveUser = {
        ...mockTokenRecord,
        user: { ...mockUser, isActive: false },
      };

      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(tokenWithInactiveUser as any);

      await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(AppError);
      await expect(authService.refreshToken(validRefreshToken)).rejects.toMatchObject({
        message: 'Account is deactivated',
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
    });

    it('should preserve rememberMe (30-day) expiration on rotation', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after createdAt
      const rememberMeTokenRecord = {
        ...mockTokenRecord,
        createdAt,
        expiresAt,
      };

      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(rememberMeTokenRecord as any);
      mockPrisma.refreshToken.update.mockResolvedValue({} as any);

      const beforeDate = new Date();
      await authService.refreshToken(validRefreshToken);

      const updateCall = mockPrisma.refreshToken.update.mock.calls[0][0];
      const newExpiresAt = updateCall.data.expiresAt as Date;

      // Should set 30-day expiration (rememberMe detected)
      const daysDiff = (newExpiresAt.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(29.9);
      expect(daysDiff).toBeLessThanOrEqual(30.1);
    });

    it('should preserve standard (7-day) expiration on rotation', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after createdAt
      const standardTokenRecord = {
        ...mockTokenRecord,
        createdAt,
        expiresAt,
      };

      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(standardTokenRecord as any);
      mockPrisma.refreshToken.update.mockResolvedValue({} as any);

      const beforeDate = new Date();
      await authService.refreshToken(validRefreshToken);

      const updateCall = mockPrisma.refreshToken.update.mock.calls[0][0];
      const newExpiresAt = updateCall.data.expiresAt as Date;

      // Should set 7-day expiration (standard)
      const daysDiff = (newExpiresAt.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(6.9);
      expect(daysDiff).toBeLessThanOrEqual(7.1);
    });

    it('should include user relation when finding token', async () => {
      mockVerifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.refreshToken.update.mockResolvedValue({} as any);

      await authService.refreshToken(validRefreshToken);

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: validRefreshToken },
        include: { user: true },
      });
    });
  });

  // ============================================
  // logout()
  // ============================================
  describe('logout()', () => {
    it('should delete the refresh token for the user', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as any);

      await authService.logout('some_refresh_token', mockUser.id);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          token: 'some_refresh_token',
          userId: mockUser.id,
        },
      });
    });

    it('should not throw when token does not exist (already logged out)', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 } as any);

      // Should not throw even if no token was found
      await expect(authService.logout('nonexistent_token', mockUser.id)).resolves.toBeUndefined();
    });

    it('should only delete tokens matching both token and userId', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as any);

      const token = 'specific_token';
      const userId = 'specific_user_id';

      await authService.logout(token, userId);

      // Verify both token and userId are used in the where clause
      const deleteCall = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];
      expect(deleteCall.where).toHaveProperty('token', token);
      expect(deleteCall.where).toHaveProperty('userId', userId);
    });
  });
});
