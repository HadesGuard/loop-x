import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { UpdateProfileInput, UserProfileWithStats } from '../types/user.types';
import { feedService } from './feed.service';
import { notificationService } from './notification.service';
import { comparePassword } from '../utils/password';

export class UserService {
  /**
   * Get current user profile by ID
   */
  async getCurrentUser(userId: string): Promise<UserProfileWithStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    const [followersCount, followingCount, videosCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.video.count({ where: { userId: user.id, status: 'ready' } }),
    ]);

    return {
      ...user,
      followersCount,
      followingCount,
      videosCount,
    };
  }

  /**
   * Get user profile by username
   */
  async getUserByUsername(
    username: string,
    currentUserId?: string
  ): Promise<UserProfileWithStats> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Get stats
    const [followersCount, followingCount, videosCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: user.id },
      }),
      prisma.follow.count({
        where: { followerId: user.id },
      }),
      prisma.video.count({
        where: { userId: user.id, status: 'ready' },
      }),
    ]);

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Only expose email to the user themselves
    const { email, ...publicUser } = user;
    const profile = currentUserId === user.id ? user : publicUser;

    return {
      ...profile,
      followersCount,
      followingCount,
      videosCount,
      isFollowing,
    };
  }

  /**
   * Get user profile by user ID
   */
  async getUserById(
    userId: string,
    currentUserId?: string
  ): Promise<UserProfileWithStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    const [followersCount, followingCount, videosCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: user.id },
      }),
      prisma.follow.count({
        where: { followerId: user.id },
      }),
      prisma.video.count({
        where: { userId: user.id, status: 'ready' },
      }),
    ]);

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    const { email, ...publicUser } = user;
    const profile = currentUserId === user.id ? user : publicUser;

    return {
      ...profile,
      followersCount,
      followingCount,
      videosCount,
      isFollowing,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<UserProfileWithStats> {
    // Clean up empty strings - convert to null for database
    const updateData: {
      fullName?: string | null;
      bio?: string | null;
      website?: string | null;
    } = {};
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName || null;
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio || null;
    }
    if (data.website !== undefined) {
      updateData.website = data.website || null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User profile updated: ${userId}`);

    // Get stats
    const [followersCount, followingCount, videosCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: user.id },
      }),
      prisma.follow.count({
        where: { followerId: user.id },
      }),
      prisma.video.count({
        where: { userId: user.id, status: 'ready' },
      }),
    ]);

    return {
      ...user,
      followersCount,
      followingCount,
      videosCount,
    };
  }

  /**
   * Update avatar URL
   */
  /**
   * Update avatar from URL (for OAuth or direct URL)
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    logger.info(`User avatar updated: ${userId}`);
  }

  /**
   * Upload avatar file to Shelby and update user
   */
  async uploadAvatarFile(userId: string, avatarBuffer: Buffer): Promise<string> {
    const { shelbyService } = await import('./shelby.service');
    
    // Generate avatar ID
    const avatarId = `${userId}-avatar-${Date.now()}`;
    const avatarBlobName = `${avatarId}.jpg`;
    
    // Upload to Shelby
    const expirationDays = 365; // Avatars last 1 year
    await shelbyService.uploadBlob(avatarBuffer, avatarBlobName, expirationDays);
    
    const serviceAccount = shelbyService.getServiceAccountAddress();
    if (!serviceAccount) {
      throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
    }
    
    const avatarUrl = `shelby://${serviceAccount}/${avatarBlobName}`;
    
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    logger.info(`User avatar uploaded to Shelby: ${userId}`);
    return avatarUrl;
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingUsername: string): Promise<void> {
    // Get following user
    const followingUser = await prisma.user.findUnique({
      where: { username: followingUsername },
    });

    if (!followingUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!followingUser.isActive) {
      throw new AppError('Cannot follow deactivated account', 403, 'ACCOUNT_DEACTIVATED');
    }

    if (followerId === followingUser.id) {
      throw new AppError('Cannot follow yourself', 400, 'CANNOT_FOLLOW_SELF');
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: followingUser.id,
        },
      },
    });

    if (existingFollow) {
      throw new AppError('Already following this user', 400, 'ALREADY_FOLLOWING');
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId: followingUser.id,
      },
    });

    // Create notification for followed user
    await notificationService.createNotification({
      userId: followingUser.id,
      type: 'follow',
      actorId: followerId,
    });

    logger.info(`User ${followerId} followed ${followingUser.id}`);
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingUsername: string): Promise<void> {
    // Get following user
    const followingUser = await prisma.user.findUnique({
      where: { username: followingUsername },
    });

    if (!followingUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: followingUser.id,
        },
      },
    });

    if (!existingFollow) {
      throw new AppError('Not following this user', 400, 'NOT_FOLLOWING');
    }

    // Delete follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: followingUser.id,
        },
      },
    });

    logger.info(`User ${followerId} unfollowed ${followingUser.id}`);
    
    // Invalidate feed cache for follower
    await feedService.invalidateFeedCache(followerId);
  }

  /**
   * Get user videos
   */
  async getUserVideos(
    username: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ videos: any[]; nextCursor: string | null }> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    const where = {
      userId: user.id,
      status: 'ready' as const,
    };

    const videos = await prisma.video.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        duration: true,
        createdAt: true,
      },
    });

    let nextCursor: string | null = null;
    if (videos.length > limit) {
      nextCursor = videos[limit].id;
      videos.pop();
    }

    return {
      videos: videos.map((video) => ({
        ...video,
        views: Number(video.views),
      })),
      nextCursor,
    };
  }
  /**
   * Get user's followers list
   */
  async getUserFollowers(
    username: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ users: any[]; nextCursor: string | null }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (!user.isActive) throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const follows = await prisma.follow.findMany({
      where: { followingId: user.id },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      nextCursor = follows[limit].id;
      follows.pop();
    }

    return {
      users: follows.map((f) => f.follower),
      nextCursor,
    };
  }

  /**
   * Get user's following list
   */
  async getUserFollowing(
    username: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ users: any[]; nextCursor: string | null }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (!user.isActive) throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      nextCursor = follows[limit].id;
      follows.pop();
    }

    return {
      users: follows.map((f) => f.following),
      nextCursor,
    };
  }

  /**
   * Get user's liked videos
   */
  async getUserLikedVideos(
    username: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ videos: any[]; nextCursor: string | null }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (!user.isActive) throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const likes = await prisma.videoLike.findMany({
      where: {
        userId: user.id,
        video: { status: 'ready' },
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            views: true,
            likesCount: true,
            commentsCount: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (likes.length > limit) {
      nextCursor = likes[limit].id;
      likes.pop();
    }

    return {
      videos: likes.map((l) => ({
        ...l.video,
        views: Number(l.video.views),
      })),
      nextCursor,
    };
  }

  /**
   * Get user's saved videos
   */
  async getUserSavedVideos(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ videos: any[]; nextCursor: string | null }> {
    const saves = await prisma.videoSave.findMany({
      where: {
        userId,
        video: { status: 'ready' },
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            views: true,
            likesCount: true,
            commentsCount: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (saves.length > limit) {
      nextCursor = saves[limit].id;
      saves.pop();
    }

    return {
      videos: saves.map((s) => ({
        ...s.video,
        views: Number(s.video.views),
      })),
      nextCursor,
    };
  }
  /**
   * Delete user account (soft delete)
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is already deactivated', 400, 'ACCOUNT_ALREADY_DEACTIVATED');
    }

    // Wallet/OAuth users may not have a password
    if (!user.passwordHash) {
      throw new AppError('Cannot delete account without password. Use account settings to set a password first.', 400, 'NO_PASSWORD');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
    }

    const deletedId = `deleted-${userId.slice(0, 8)}`;

    // Soft delete: deactivate + anonymize
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `${deletedId}@deleted.local`,
          username: deletedId,
          fullName: null,
          bio: null,
          website: null,
          avatarUrl: null,
        },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    logger.info(`Account deleted (soft): ${userId}`);
  }
}

export const userService = new UserService();
