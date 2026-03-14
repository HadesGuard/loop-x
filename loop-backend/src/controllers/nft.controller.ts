import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { nftService } from '../services/nft.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * POST /videos/:id/mint
 * Mint the authenticated user's video as an NFT on Aptos.
 *
 * Requires:
 *   - Authenticated request (JWT).
 *   - Caller must be the video owner.
 *   - Video must be in 'ready' status (fully processed and on Shelby).
 *   - `aptosAddress` in the request body — the creator's Aptos wallet address.
 *
 * Returns: { txHash, tokenAddress }
 */
export const mintVideoNft = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { id: videoId } = req.params;
  const { aptosAddress } = req.body;

  if (!aptosAddress || typeof aptosAddress !== 'string' || !aptosAddress.trim()) {
    throw new AppError('aptosAddress is required', 400, 'MISSING_APTOS_ADDRESS');
  }

  // Load the video and verify ownership.
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) {
    throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
  }
  if (video.userId !== userId) {
    throw new AppError('You do not own this video', 403, 'FORBIDDEN');
  }

  // Prevent re-minting.
  if (video.nftTokenAddress) {
    throw new AppError('Video already minted as NFT', 409, 'NFT_ALREADY_MINTED');
  }

  // Video must be ready before it can be minted.
  if (video.status !== 'ready') {
    throw new AppError(
      `Video is not ready for minting (status: ${video.status})`,
      422,
      'VIDEO_NOT_READY',
    );
  }

  const shelbyBlobRef = video.shelbyAccount && video.shelbyBlobName
    ? `${video.shelbyAccount}/${video.shelbyBlobName}`
    : '';

  logger.info(`User ${userId} minting NFT for video ${videoId}`);

  const { txHash, tokenAddress } = await nftService.mintVideoNft(
    videoId,
    video.title,
    video.description ?? '',
    shelbyBlobRef,
    video.hlsManifestUrl ?? '',
    video.thumbnailUrl ?? '',
    aptosAddress.trim(),
  );

  // Attempt to resolve the actual on-chain token object address after confirmation.
  let resolvedTokenAddress = tokenAddress;
  try {
    resolvedTokenAddress = await nftService.resolveTokenAddress(videoId);
  } catch {
    // Non-critical: keep the fallback address.
  }

  // Persist mint result.
  await prisma.video.update({
    where: { id: videoId },
    data: {
      nftTokenAddress: resolvedTokenAddress,
      nftTxHash: txHash,
      nftMintedAt: new Date(),
    },
  });

  logger.info(`NFT minted for video ${videoId}: tx=${txHash}, token=${resolvedTokenAddress}`);

  res.status(201).json({
    success: true,
    message: 'Video NFT minted successfully',
    data: {
      videoId,
      txHash,
      tokenAddress: resolvedTokenAddress,
    },
  });
};
