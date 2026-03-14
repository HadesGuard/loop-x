import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { tippingService } from '../services/tipping.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * POST /videos/:id/tip
 *
 * Authenticated viewer tips a video creator.
 * Requires:
 *   - JWT auth.
 *   - body.amountOctas — gross tip amount in octas.
 *   - body.tipperAddress — viewer's Aptos wallet address.
 *
 * The creator's Aptos wallet address is resolved from their stored profile.
 * Returns the persisted Tip record.
 */
export const tipVideo = async (req: AuthRequest, res: Response) => {
  const tipperId = req.user?.userId;
  if (!tipperId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: videoId } = req.params;
  const { amountOctas, tipperAddress } = req.body as {
    amountOctas: number;
    tipperAddress: string;
  };

  // Load video to get creator.
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, userId: true },
  });
  if (!video) {
    throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
  }

  const creatorId = video.userId;

  // Prevent self-tipping.
  if (tipperId === creatorId) {
    throw new AppError('You cannot tip your own video', 400, 'SELF_TIP_NOT_ALLOWED');
  }

  // Resolve creator's on-chain Aptos wallet address.
  // Wallet users are identified by email pattern: `<address>@wallet.aptos.local`.
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { email: true },
  });

  const aptosWalletSuffix = '@wallet.aptos.local';
  if (!creator || !creator.email.endsWith(aptosWalletSuffix)) {
    throw new AppError(
      'Creator has not linked an Aptos wallet — tip unavailable',
      422,
      'CREATOR_NO_WALLET',
    );
  }

  const creatorWalletAddress = creator.email.replace(aptosWalletSuffix, '');

  logger.info(`User ${tipperId} tipping ${amountOctas} octas to creator ${creatorId} for video ${videoId}`);

  const tip = await tippingService.submitTip({
    videoId,
    tipperId,
    creatorId,
    creatorAddress: creatorWalletAddress,
    tipperAddress: tipperAddress.trim(),
    amountOctas: BigInt(amountOctas),
  });

  res.status(201).json({
    success: true,
    message: 'Tip sent successfully',
    data: tip,
  });
};

/**
 * GET /creator/earnings
 *
 * Returns the authenticated creator's cumulative tip earnings and history.
 */
export const getMyEarnings = async (req: AuthRequest, res: Response) => {
  const creatorId = req.user?.userId;
  if (!creatorId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);

  const earnings = await tippingService.getCreatorEarnings(creatorId, limit, offset);

  res.json({
    success: true,
    data: earnings,
  });
};

/**
 * GET /creator/earnings/:userId
 *
 * Admin/public endpoint to view a specific creator's earnings.
 * Can be restricted to admin-only in the route if needed.
 */
export const getCreatorEarnings = async (req: AuthRequest, res: Response) => {
  const { userId: creatorId } = req.params;

  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true },
  });
  if (!creator) {
    throw new AppError('Creator not found', 404, 'USER_NOT_FOUND');
  }

  const earnings = await tippingService.getCreatorEarnings(creatorId, limit, offset);

  res.json({
    success: true,
    data: earnings,
  });
};
