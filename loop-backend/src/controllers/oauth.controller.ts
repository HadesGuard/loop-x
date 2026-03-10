import { Request, Response } from 'express';
import { oauthService } from '../services/oauth.service';
import { AppError } from '../middleware/error.middleware';

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError('Google ID token is required', 400, 'ID_TOKEN_REQUIRED');
    }

    const result = await oauthService.authenticateGoogle(idToken);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Google authentication failed', 500, 'OAUTH_ERROR');
  }
};

export const appleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken, userInfo } = req.body;

    if (!idToken) {
      throw new AppError('Apple ID token is required', 400, 'ID_TOKEN_REQUIRED');
    }

    const result = await oauthService.authenticateApple(idToken, userInfo);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Apple authentication failed', 500, 'OAUTH_ERROR');
  }
};



