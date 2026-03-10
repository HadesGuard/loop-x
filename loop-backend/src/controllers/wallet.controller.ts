import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { AppError } from '../middleware/error.middleware';

export const generateNonce = async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      throw new AppError('Wallet address is required', 400, 'ADDRESS_REQUIRED');
    }

    const result = await walletService.generateNonce(address);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to generate nonce', 500, 'INTERNAL_ERROR');
  }
};

export const verifyWallet = async (req: Request, res: Response) => {
  try {
    const { address, signature, fullMessage, walletType } = req.body;

    if (!address || !signature || !fullMessage || !walletType) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    if (!['aptos', 'ethereum', 'solana'].includes(walletType)) {
      throw new AppError('Invalid wallet type', 400, 'INVALID_WALLET_TYPE');
    }

    const result = await walletService.verifyWallet({
      address,
      signature,
      fullMessage,
      walletType: walletType as 'aptos' | 'ethereum' | 'solana',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Wallet verification failed', 500, 'WALLET_ERROR');
  }
};



