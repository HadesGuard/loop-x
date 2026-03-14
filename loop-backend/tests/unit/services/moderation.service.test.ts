import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    report: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AppError } from '../../../src/middleware/error.middleware';
import { prisma } from '../../../src/config/database';
import { ModerationService } from '../../../src/services/moderation.service';
import { PrivacyService } from '../../../src/services/privacy.service';

const mockPrisma = vi.mocked(prisma);

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ModerationService();
  });

  describe('getReports', () => {
    it('returns paginated reports', async () => {
      const mockReports = [
        {
          id: 'r1',
          reporterId: 'u1',
          reporter: { id: 'u1', username: 'user1', avatarUrl: null },
          type: 'video',
          targetId: 'v1',
          reason: 'spam',
          description: null,
          status: 'pending',
          notes: null,
          createdAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
        },
      ];

      mockPrisma.report.findMany.mockResolvedValue(mockReports as never);
      mockPrisma.report.count.mockResolvedValue(1);

      const result = await service.getReports({ page: 1, limit: 10 });

      expect(result.reports).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('filters by status and type', async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      await service.getReports({ status: 'pending', type: 'video', page: 1, limit: 10 });

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'pending', type: 'video' },
        })
      );
    });
  });

  describe('getReportById', () => {
    it('returns report with target details for video type', async () => {
      const mockReport = {
        id: 'r1',
        reporterId: 'u1',
        reporter: { id: 'u1', username: 'user1', avatarUrl: null, fullName: null },
        type: 'video',
        targetId: 'v1',
        reason: 'spam',
        description: null,
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      };

      mockPrisma.report.findUnique.mockResolvedValue(mockReport as never);
      mockPrisma.video.findUnique.mockResolvedValue({
        id: 'v1',
        title: 'Test Video',
        url: 'http://example.com/v.mp4',
        thumbnailUrl: null,
        status: 'active',
        userId: 'u2',
        user: { id: 'u2', username: 'creator' },
      } as never);

      const result = await service.getReportById('r1');

      expect(result.id).toBe('r1');
      expect(result.target).toBeDefined();
    });

    it('throws 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('missing')).rejects.toThrow(AppError);
    });
  });

  describe('reviewReport', () => {
    it('updates report status and notes', async () => {
      const mockReport = { id: 'r1', status: 'pending' };
      const updatedReport = {
        id: 'r1',
        status: 'reviewed',
        notes: 'Looks OK',
        reviewedAt: new Date(),
        reviewedBy: 'admin1',
      };

      mockPrisma.report.findUnique.mockResolvedValue(mockReport as never);
      mockPrisma.report.update.mockResolvedValue(updatedReport as never);

      const result = await service.reviewReport('r1', 'admin1', 'reviewed', 'Looks OK');

      expect(result.status).toBe('reviewed');
      expect(mockPrisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({
            status: 'reviewed',
            notes: 'Looks OK',
            reviewedBy: 'admin1',
          }),
        })
      );
    });

    it('throws 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(service.reviewReport('missing', 'admin1', 'reviewed')).rejects.toThrow(AppError);
    });
  });

  describe('takeAction', () => {
    it('warns — logs and returns result', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        type: 'video',
        targetId: 'v1',
      } as never);
      mockPrisma.report.update.mockResolvedValue({} as never);

      const result = await service.takeAction('r1', 'admin1', 'warn', 'Inappropriate');

      expect(result).toMatchObject({ action: 'warn', targetId: 'v1' });
      expect(mockPrisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'resolved' }),
        })
      );
    });

    it('remove_content hides a video', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        type: 'video',
        targetId: 'v1',
      } as never);
      mockPrisma.video.update.mockResolvedValue({} as never);
      mockPrisma.report.update.mockResolvedValue({} as never);

      const result = await service.takeAction('r1', 'admin1', 'remove_content', 'Spam');

      expect(result).toMatchObject({ action: 'remove_content', targetId: 'v1' });
      expect(mockPrisma.video.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'removed' } })
      );
    });

    it('remove_content deletes a comment', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        type: 'comment',
        targetId: 'c1',
      } as never);
      mockPrisma.comment.delete.mockResolvedValue({} as never);
      mockPrisma.report.update.mockResolvedValue({} as never);

      const result = await service.takeAction('r1', 'admin1', 'remove_content', 'Hate speech');

      expect(result).toMatchObject({ action: 'remove_content', targetId: 'c1' });
    });

    it('suspend_user — suspends user for user-type report', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        type: 'user',
        targetId: 'u2',
      } as never);
      mockPrisma.user.update.mockResolvedValue({} as never);
      mockPrisma.report.update.mockResolvedValue({} as never);

      const result = await service.takeAction('r1', 'admin1', 'suspend_user', 'Repeat violations');

      expect(result).toMatchObject({ action: 'suspend_user', targetUserId: 'u2' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } })
      );
    });

    it('throws for invalid action', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        type: 'video',
        targetId: 'v1',
      } as never);

      await expect(service.takeAction('r1', 'admin1', 'delete_account', 'test')).rejects.toThrow(AppError);
    });
  });

  describe('getReportStats', () => {
    it('returns aggregated stats', async () => {
      mockPrisma.report.count.mockResolvedValue(10);
      mockPrisma.report.groupBy
        .mockResolvedValueOnce([
          { status: 'pending', _count: { status: 7 } },
          { status: 'resolved', _count: { status: 3 } },
        ] as never)
        .mockResolvedValueOnce([
          { type: 'video', _count: { type: 6 } },
          { type: 'comment', _count: { type: 4 } },
        ] as never);

      const result = await service.getReportStats();

      expect(result.total).toBe(10);
      expect(result.byStatus.pending).toBe(7);
      expect(result.byStatus.resolved).toBe(3);
      expect(result.byType.video).toBe(6);
      expect(result.byType.comment).toBe(4);
      expect(result.byType.user).toBe(0); // no user reports in mock
    });
  });
});

describe('PrivacyService — createReport', () => {
  let service: PrivacyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PrivacyService();
  });

  it('creates a video report successfully', async () => {
    mockPrisma.video.findUnique.mockResolvedValue({ id: 'v1' } as never);
    mockPrisma.report.findFirst.mockResolvedValue(null);
    mockPrisma.report.create.mockResolvedValue({} as never);
    mockPrisma.report.count.mockResolvedValue(1); // below threshold

    await service.createReport('u1', { type: 'video', targetId: 'v1', reason: 'spam' });

    expect(mockPrisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'video', targetId: 'v1', reporterId: 'u1' }),
      })
    );
  });

  it('creates a comment report successfully', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({ id: 'c1' } as never);
    mockPrisma.report.findFirst.mockResolvedValue(null);
    mockPrisma.report.create.mockResolvedValue({} as never);
    mockPrisma.report.count.mockResolvedValue(1);

    await service.createReport('u1', { type: 'comment', targetId: 'c1', reason: 'harassment' });

    expect(mockPrisma.report.create).toHaveBeenCalled();
  });

  it('creates a user report successfully', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2' } as never);
    mockPrisma.report.findFirst.mockResolvedValue(null);
    mockPrisma.report.create.mockResolvedValue({} as never);
    mockPrisma.report.count.mockResolvedValue(1);

    await service.createReport('u1', { type: 'user', targetId: 'u2', reason: 'spam' });

    expect(mockPrisma.report.create).toHaveBeenCalled();
  });

  it('prevents duplicate pending reports', async () => {
    mockPrisma.video.findUnique.mockResolvedValue({ id: 'v1' } as never);
    mockPrisma.report.findFirst.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      service.createReport('u1', { type: 'video', targetId: 'v1', reason: 'spam' })
    ).rejects.toThrow(AppError);
  });

  it('throws 404 for non-existent video', async () => {
    mockPrisma.video.findUnique.mockResolvedValue(null);

    await expect(
      service.createReport('u1', { type: 'video', targetId: 'missing', reason: 'spam' })
    ).rejects.toThrow(AppError);
  });

  it('throws 404 for non-existent comment', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue(null);

    await expect(
      service.createReport('u1', { type: 'comment', targetId: 'missing', reason: 'spam' })
    ).rejects.toThrow(AppError);
  });

  it('prevents self-reporting', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' } as never);

    await expect(
      service.createReport('u1', { type: 'user', targetId: 'u1', reason: 'spam' })
    ).rejects.toThrow(AppError);
  });

  describe('auto-hide threshold', () => {
    it('auto-hides video at threshold', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: 'v1' } as never);
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({} as never);
      mockPrisma.report.count.mockResolvedValue(PrivacyService.REPORT_AUTO_HIDE_THRESHOLD);
      mockPrisma.video.updateMany.mockResolvedValue({ count: 1 } as never);

      await service.createReport('u1', { type: 'video', targetId: 'v1', reason: 'spam' });

      expect(mockPrisma.video.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'v1' }),
          data: { status: 'hidden' },
        })
      );
    });

    it('does not auto-hide below threshold', async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: 'v1' } as never);
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({} as never);
      mockPrisma.report.count.mockResolvedValue(PrivacyService.REPORT_AUTO_HIDE_THRESHOLD - 1);

      await service.createReport('u1', { type: 'video', targetId: 'v1', reason: 'spam' });

      expect(mockPrisma.video.updateMany).not.toHaveBeenCalled();
    });
  });
});
