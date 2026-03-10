import { Router } from 'express';
import {
  getSounds,
  getSoundById,
  getSoundVideos,
  toggleFavorite,
  getFavoriteSounds,
  getTrendingSounds,
  getGenres,
  searchSounds,
} from '../controllers/sound.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();

// Public routes
router.get('/', getSounds);
router.get('/trending', getTrendingSounds);
router.get('/genres', getGenres);
router.get('/search', searchSounds);
router.get('/:id', getSoundById);
router.get('/:id/videos', getSoundVideos);

// Authenticated routes
router.post('/:id/favorite', authenticate, toggleFavorite);
router.delete('/:id/favorite', authenticate, toggleFavorite);
router.get('/favorites', authenticate, getFavoriteSounds);

export default router;

