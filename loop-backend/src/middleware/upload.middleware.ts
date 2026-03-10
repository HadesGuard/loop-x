import multer from 'multer';
import { Request } from 'express';
import { AppError } from './error.middleware';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for videos
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed video MIME types
  const allowedMimes = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/webm',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed types: ${allowedMimes.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

// Configure multer
export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

// Middleware for single video upload
export const uploadVideoMiddleware: ReturnType<typeof uploadVideo.single> = uploadVideo.single('video');

// File filter for images (avatars)
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed image MIME types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed types: ${allowedMimes.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

// Configure multer for avatar uploads
export const uploadAvatar = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for avatars
  },
});

// Middleware for single avatar upload
export const uploadAvatarMiddleware: ReturnType<typeof uploadAvatar.single> = uploadAvatar.single('avatar');

