import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.json({
    success: true,
    data: result,
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);

  res.json({
    success: true,
    data: result,
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }

  await authService.logout(refreshToken, userId);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

