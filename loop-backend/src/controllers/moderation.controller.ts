import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { moderationService } from '../services/moderation.service';

/**
 * GET /reports
 * List all reports (admin only)
 */
export const getReports = async (req: AuthRequest, res: Response) => {
  // Query params are validated and coerced by listReportsQuerySchema middleware
  const { status, type, page, limit } = req.query as unknown as {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  };

  const result = await moderationService.getReports({
    status,
    type,
    page: Number(page),
    limit: Number(limit),
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /reports/:id
 * Get report details (admin only)
 */
export const getReportById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const report = await moderationService.getReportById(id);

  res.json({
    success: true,
    data: { report },
  });
};

/**
 * PUT /reports/:id
 * Review a report (admin only)
 */
export const reviewReport = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { status, notes } = req.body;

  const result = await moderationService.reviewReport(id, userId, status, notes);

  res.json({
    success: true,
    message: 'Report reviewed successfully',
    data: { report: result },
  });
};

/**
 * POST /reports/:id/action
 * Take moderation action on a report (admin only)
 */
export const takeAction = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { action, reason } = req.body;

  const result = await moderationService.takeAction(id, userId, action, reason);

  res.json({
    success: true,
    message: 'Moderation action taken successfully',
    data: { result },
  });
};
