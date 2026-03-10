import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { soundService } from '../services/sound.service';

export const getSounds = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const sort = (req.query.sort as 'trending' | 'recent' | 'popular' | 'alphabetical' | undefined) || 'trending';

  const result = await soundService.getSounds({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort,
    genre: req.query.genre as string,
    duration: req.query.duration as string,
    search: req.query.search as string,
    userId,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const getSoundById = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const sound = await soundService.getSoundById(id, userId);

  res.json({
    success: true,
    data: sound,
  });
};

export const getSoundVideos = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sort = (req.query.sort as 'trending' | 'recent' | 'popular' | undefined) || 'trending';

  const result = await soundService.getSoundVideos(id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  const { id } = req.params;

  const isFavorited = await soundService.toggleFavorite(userId, id);

  res.json({
    success: true,
    data: {
      favorited: isFavorited,
    },
  });
};

export const getFavoriteSounds = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const result = await soundService.getFavoriteSounds(userId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const getTrendingSounds = async (req: AuthRequest, res: Response) => {
  const timeframe = (req.query.timeframe as 'week' | 'day' | 'month' | undefined) || 'week';

  const result = await soundService.getTrendingSounds({
    timeframe,
    limit: Number(req.query.limit) || 20,
    genre: req.query.genre as string,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const getGenres = async (_req: AuthRequest, res: Response) => {
  const genres = await soundService.getGenres();

  res.json({
    success: true,
    data: {
      genres,
    },
  });
};

export const searchSounds = async (req: AuthRequest, res: Response) => {
  const result = await soundService.searchSounds({
    q: req.query.q as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    genre: req.query.genre as string,
  });

  res.json({
    success: true,
    data: result,
  });
};
