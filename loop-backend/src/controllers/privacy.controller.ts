import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { privacyService } from '../services/privacy.service';
import { AppError } from '../middleware/error.middleware';

export const blockUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { username } = req.params;

  await privacyService.blockUser(userId, username);

  res.json({
    success: true,
    message: 'User blocked successfully',
  });
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { username } = req.params;

  await privacyService.unblockUser(userId, username);

  res.json({
    success: true,
    message: 'User unblocked successfully',
  });
};

export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const users = await privacyService.getBlockedUsers(userId);

  res.json({
    success: true,
    data: {
      users,
    },
  });
};

export const createReport = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { type, targetId, reason, description } = req.body;

  await privacyService.createReport(userId, {
    type,
    targetId,
    reason,
    description,
  });

  res.json({
    success: true,
    message: 'Report submitted successfully',
  });
};

export const getPrivacySettings = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const settings = await privacyService.getPrivacySettings(userId);

  res.json({
    success: true,
    data: settings,
  });
};

export const updatePrivacySettings = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const data = req.body;

  await privacyService.updatePrivacySettings(userId, data);

  res.json({
    success: true,
    message: 'Privacy settings updated successfully',
  });
};
