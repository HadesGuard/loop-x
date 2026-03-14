import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Shelby pricing estimate: $0.01 per GB per day (placeholder — adjust when real pricing is available)
const COST_PER_GB_PER_DAY_USD = 0.01;

/**
 * GET /admin/storage-stats
 *
 * Returns global Shelby storage statistics and per-user breakdown.
 * Only accessible by admin/moderator users (enforced by isAdmin middleware).
 */
export const getStorageStats = async (req: AuthRequest, res: Response): Promise<void> => {
  logger.info(`Admin storage stats requested by user ${req.user?.userId}`);

  // Aggregate per-user storage usage across all videos with Shelby blobs
  const perUserRaw = await prisma.video.groupBy({
    by: ['userId'],
    where: {
      shelbyBlobName: { not: null },
      status: { notIn: ['deleted'] },
    },
    _count: { shelbyBlobName: true },
    _sum: { shelbySize: true },
  });

  // Fetch usernames for display
  const userIds = perUserRaw.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });
  const usernameMap = new Map(users.map((u) => [u.id, u.username]));

  // Compute global totals
  let totalBlobs = 0;
  let totalBytes = BigInt(0);

  const perUser = perUserRaw.map((row) => {
    const blobCount = row._count.shelbyBlobName;
    const bytes = row._sum.shelbySize ?? BigInt(0);
    totalBlobs += blobCount;
    totalBytes += bytes;

    const bytesNum = Number(bytes);
    const gbStored = bytesNum / (1024 ** 3);
    // Rough cost estimate assuming blobs are retained for 30 days on average
    const estimatedCostUsd = gbStored * 30 * COST_PER_GB_PER_DAY_USD;

    return {
      userId: row.userId,
      username: usernameMap.get(row.userId) ?? 'unknown',
      blobCount,
      totalBytes: bytesNum,
      estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000,
    };
  });

  // Sort by most storage first
  perUser.sort((a, b) => b.totalBytes - a.totalBytes);

  const totalBytesNum = Number(totalBytes);
  const totalGb = totalBytesNum / (1024 ** 3);
  const totalEstimatedCostUsd = Math.round(totalGb * 30 * COST_PER_GB_PER_DAY_USD * 10000) / 10000;

  // Count expired videos
  const expiredCount = await prisma.video.count({
    where: { status: 'expired' },
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalBlobs,
        totalBytes: totalBytesNum,
        totalGb: Math.round(totalGb * 1000) / 1000,
        estimatedCostUsd: totalEstimatedCostUsd,
        expiredVideos: expiredCount,
        costNote: `Estimate based on $${COST_PER_GB_PER_DAY_USD}/GB/day over 30-day average retention`,
      },
      perUser,
    },
  });
};

/**
 * GET /admin/users
 * List all users with pagination and optional search (admin only).
 */
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { fullName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            videos: true,
            followers: true,
            following: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
};

/**
 * PATCH /admin/users/:id
 * Update a user's role or active status (admin only).
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const adminId = req.user?.userId;
  const { id } = req.params;
  const { isActive, role } = req.body as { isActive?: boolean; role?: string };

  if (id === adminId) {
    throw new AppError('Cannot modify your own account', 400, 'SELF_MODIFY');
  }

  const VALID_ROLES = ['user', 'admin', 'moderator'];
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400, 'INVALID_ROLE');
  }

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (role !== undefined) data.role = role;

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400, 'NO_FIELDS');
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, isActive: true },
  });

  logger.info(`Admin ${adminId} updated user ${id}: ${JSON.stringify(data)}`);

  res.json({ success: true, data: { user: updated } });
};
