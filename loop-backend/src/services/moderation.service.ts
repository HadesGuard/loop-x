import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

export class ModerationService {
  /**
   * List reports with pagination and filtering
   */
  async getReports(filters: {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    const { status, type, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports: reports.map((report) => ({
        id: report.id,
        reporterId: report.reporterId,
        reporter: report.reporter,
        type: report.type,
        targetId: report.targetId,
        reason: report.reason,
        description: report.description,
        status: report.status,
        notes: report.notes,
        createdAt: report.createdAt,
        reviewedAt: report.reviewedAt,
        reviewedBy: report.reviewedBy,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single report by ID with details
   */
  async getReportById(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            fullName: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    // Resolve target details based on type
    let target: Record<string, unknown> | null = null;

    if (report.type === 'video') {
      const video = await prisma.video.findUnique({
        where: { id: report.targetId },
        select: {
          id: true,
          title: true,
          url: true,
          thumbnailUrl: true,
          status: true,
          userId: true,
          user: {
            select: { id: true, username: true },
          },
        },
      });
      target = video ? { ...video, type: 'video' } : null;
    } else if (report.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: report.targetId },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          fullName: true,
          isActive: true,
        },
      });
      target = user ? { ...user, type: 'user' } : null;
    } else if (report.type === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id: report.targetId },
        select: {
          id: true,
          text: true,
          userId: true,
          videoId: true,
          user: {
            select: { id: true, username: true },
          },
        },
      });
      target = comment ? { ...comment, type: 'comment' } : null;
    }

    return {
      id: report.id,
      reporterId: report.reporterId,
      reporter: report.reporter,
      type: report.type,
      targetId: report.targetId,
      target,
      reason: report.reason,
      description: report.description,
      status: report.status,
      notes: report.notes,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      reviewedBy: report.reviewedBy,
    };
  }

  /**
   * Update report status (review/resolve/dismiss)
   */
  async reviewReport(
    reportId: string,
    adminId: string,
    status: string,
    notes?: string
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        notes,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    logger.info(
      `Admin ${adminId} reviewed report ${reportId} with status: ${status}`
    );

    return {
      id: updated.id,
      status: updated.status,
      notes: updated.notes,
      reviewedAt: updated.reviewedAt,
      reviewedBy: updated.reviewedBy,
    };
  }

  /**
   * Take moderation action on a report's target
   */
  async takeAction(
    reportId: string,
    adminId: string,
    action: string,
    reason: string
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'warn': {
        // For now, log the warning. In a full system, this could send a notification.
        logger.info(
          `Admin ${adminId} issued warning for ${report.type} ${report.targetId}: ${reason}`
        );
        result = { action: 'warn', targetId: report.targetId, reason };
        break;
      }

      case 'remove_content': {
        if (report.type === 'video') {
          await prisma.video.update({
            where: { id: report.targetId },
            data: { status: 'removed' },
          });
          logger.info(
            `Admin ${adminId} removed video ${report.targetId}: ${reason}`
          );
          result = {
            action: 'remove_content',
            targetId: report.targetId,
            reason,
          };
        } else if (report.type === 'comment') {
          await prisma.comment.delete({
            where: { id: report.targetId },
          });
          logger.info(
            `Admin ${adminId} removed comment ${report.targetId}: ${reason}`
          );
          result = {
            action: 'remove_content',
            targetId: report.targetId,
            reason,
          };
        } else {
          throw new AppError(
            'Cannot remove content for user-type reports. Use suspend_user instead.',
            400,
            'INVALID_ACTION'
          );
        }
        break;
      }

      case 'suspend_user': {
        let targetUserId: string;

        if (report.type === 'user') {
          targetUserId = report.targetId;
        } else if (report.type === 'video') {
          const video = await prisma.video.findUnique({
            where: { id: report.targetId },
            select: { userId: true },
          });
          if (!video) {
            throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
          }
          targetUserId = video.userId;
        } else if (report.type === 'comment') {
          const comment = await prisma.comment.findUnique({
            where: { id: report.targetId },
            select: { userId: true },
          });
          if (!comment) {
            throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
          }
          targetUserId = comment.userId;
        } else {
          throw new AppError('Invalid report type', 400, 'INVALID_REPORT_TYPE');
        }

        await prisma.user.update({
          where: { id: targetUserId },
          data: { isActive: false },
        });

        logger.info(
          `Admin ${adminId} suspended user ${targetUserId}: ${reason}`
        );
        result = {
          action: 'suspend_user',
          targetUserId,
          reason,
        };
        break;
      }

      default:
        throw new AppError('Invalid action', 400, 'INVALID_ACTION');
    }

    // Auto-resolve the report after taking action
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'resolved',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    return result;
  }
}

export const moderationService = new ModerationService();
