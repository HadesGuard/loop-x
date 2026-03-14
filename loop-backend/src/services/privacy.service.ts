import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

export class PrivacyService {
  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedUsername: string): Promise<void> {
    // Find user to block
    const userToBlock = await prisma.user.findUnique({
      where: { username: blockedUsername },
    });

    if (!userToBlock) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (blockerId === userToBlock.id) {
      throw new AppError('Cannot block yourself', 400, 'CANNOT_BLOCK_SELF');
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userToBlock.id,
        },
      },
    });

    if (existingBlock) {
      throw new AppError('User already blocked', 400, 'ALREADY_BLOCKED');
    }

    // Create block relationship
    await prisma.block.create({
      data: {
        blockerId,
        blockedId: userToBlock.id,
      },
    });

    // Unfollow if following
    await prisma.follow.deleteMany({
      where: {
        followerId: blockerId,
        followingId: userToBlock.id,
      },
    });

    // Remove from following if they follow you
    await prisma.follow.deleteMany({
      where: {
        followerId: userToBlock.id,
        followingId: blockerId,
      },
    });

    logger.info(`User ${blockerId} blocked user ${userToBlock.id}`);
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedUsername: string): Promise<void> {
    // Find user to unblock
    const userToUnblock = await prisma.user.findUnique({
      where: { username: blockedUsername },
    });

    if (!userToUnblock) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userToUnblock.id,
        },
      },
    });

    if (!existingBlock) {
      throw new AppError('User is not blocked', 400, 'NOT_BLOCKED');
    }

    // Remove block
    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userToUnblock.id,
        },
      },
    });

    logger.info(`User ${blockerId} unblocked user ${userToUnblock.id}`);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(userId: string) {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            fullName: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((block) => ({
      id: block.blocked.id,
      username: block.blocked.username,
      avatar: block.blocked.avatarUrl,
      fullName: block.blocked.fullName,
      isVerified: block.blocked.isVerified,
      blockedAt: block.createdAt,
    }));
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });

    return !!block;
  }

  /**
   * Auto-hide threshold: if a content item receives this many reports, it's hidden automatically.
   */
  static readonly REPORT_AUTO_HIDE_THRESHOLD = 3;

  /**
   * Report a user, video, or comment
   */
  async createReport(
    reporterId: string,
    data: {
      type: 'user' | 'video' | 'comment';
      targetId: string;
      reason: string;
      description?: string;
    }
  ): Promise<void> {
    // Validate target exists
    if (data.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: data.targetId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (reporterId === data.targetId) {
        throw new AppError('Cannot report yourself', 400, 'CANNOT_REPORT_SELF');
      }
    } else if (data.type === 'video') {
      const video = await prisma.video.findUnique({
        where: { id: data.targetId },
      });

      if (!video) {
        throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
      }
    } else if (data.type === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id: data.targetId },
      });

      if (!comment) {
        throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
      }
    }

    // Check if already reported (prevent duplicate reports)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        type: data.type,
        targetId: data.targetId,
        status: 'pending',
      },
    });

    if (existingReport) {
      throw new AppError('Already reported', 400, 'ALREADY_REPORTED');
    }

    // Create report
    await prisma.report.create({
      data: {
        reporterId,
        type: data.type,
        targetId: data.targetId,
        reason: data.reason,
        description: data.description,
        videoId: data.type === 'video' ? data.targetId : null,
        status: 'pending',
      },
    });

    logger.info(`User ${reporterId} reported ${data.type} ${data.targetId}`);

    // Auto-hide check: count pending reports for this target
    await this._checkAutoHideThreshold(data.type, data.targetId);
  }

  /**
   * Check if a reported item has crossed the auto-hide threshold and hide it if so.
   */
  private async _checkAutoHideThreshold(
    type: 'user' | 'video' | 'comment',
    targetId: string
  ): Promise<void> {
    const reportCount = await prisma.report.count({
      where: {
        type,
        targetId,
        status: 'pending',
      },
    });

    if (reportCount < PrivacyService.REPORT_AUTO_HIDE_THRESHOLD) {
      return;
    }

    if (type === 'video') {
      await prisma.video.updateMany({
        where: { id: targetId, status: { not: 'removed' } },
        data: { status: 'hidden' },
      });
      logger.info(
        `Auto-hidden video ${targetId} after ${reportCount} reports`
      );
    }
    // Users and comments are not auto-hidden; they require manual admin review.
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(userId: string) {
    let settings = await prisma.userPrivacySettings.findUnique({
      where: { userId },
    });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.userPrivacySettings.create({
        data: {
          userId,
          profileVisibility: 'public',
          allowMessages: 'everyone',
          allowComments: true,
          allowDuet: true,
          allowStitch: true,
          showActivityStatus: true,
        },
      });
    }

    return {
      profileVisibility: settings.profileVisibility,
      allowMessages: settings.allowMessages,
      allowComments: settings.allowComments,
      allowDuet: settings.allowDuet,
      allowStitch: settings.allowStitch,
      showActivityStatus: settings.showActivityStatus,
    };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    data: {
      profileVisibility?: 'public' | 'private';
      allowMessages?: 'everyone' | 'followers' | 'none';
      allowComments?: boolean;
      allowDuet?: boolean;
      allowStitch?: boolean;
      showActivityStatus?: boolean;
    }
  ): Promise<void> {
    // Upsert privacy settings
    await prisma.userPrivacySettings.upsert({
      where: { userId },
      update: {
        profileVisibility: data.profileVisibility,
        allowMessages: data.allowMessages,
        allowComments: data.allowComments,
        allowDuet: data.allowDuet,
        allowStitch: data.allowStitch,
        showActivityStatus: data.showActivityStatus,
      },
      create: {
        userId,
        profileVisibility: data.profileVisibility || 'public',
        allowMessages: data.allowMessages || 'everyone',
        allowComments: data.allowComments ?? true,
        allowDuet: data.allowDuet ?? true,
        allowStitch: data.allowStitch ?? true,
        showActivityStatus: data.showActivityStatus ?? true,
      },
    });

    logger.info(`User ${userId} updated privacy settings`, data);
  }
}

export const privacyService = new PrivacyService();


