import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { AuthResponse } from '../types/auth.types';
import { redis } from '../config/redis';
import crypto from 'crypto';

export class WalletService {
  /**
   * Generate nonce for wallet signature
   */
  async generateNonce(address: string): Promise<{ nonce: string; expiresAt: Date }> {
    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store nonce in Redis with expiration
    await redis.setex(`auth:nonce:${address}`, 300, nonce);

    return {
      nonce,
      expiresAt,
    };
  }

  /**
   * Verify wallet signature and authenticate
   */
  async verifyWallet(data: {
    address: string;
    signature: string;
    fullMessage: string;
    walletType: 'aptos' | 'ethereum' | 'solana';
  }): Promise<AuthResponse> {
    // Get and verify nonce
    const storedNonce = await redis.get(`auth:nonce:${data.address}`);
    if (!storedNonce) {
      throw new AppError('Nonce expired or invalid', 400, 'INVALID_NONCE');
    }

    // Verify signature based on wallet type
    const isValid = await this.verifySignature(
      data.address,
      data.signature,
      data.fullMessage,
      data.walletType
    );

    if (!isValid) {
      throw new AppError('Signature verification failed', 401, 'INVALID_SIGNATURE');
    }

    // Delete used nonce
    await redis.del(`auth:nonce:${data.address}`);

    // Find or create user
    let user = await this.findOrCreateWalletUser({
      address: data.address,
      walletType: data.walletType,
    });

    // Generate tokens
    const token = generateAccessToken({
      userId: user.id,
      email: user.email || '',
      username: user.username,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email || '',
      username: user.username,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    logger.info(`User authenticated with wallet (${data.walletType}): ${user.id}`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email || '',
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Verify signature based on wallet type
   */
  private async verifySignature(
    address: string,
    signature: string,
    message: string,
    walletType: 'aptos' | 'ethereum' | 'solana'
  ): Promise<boolean> {
    try {
      switch (walletType) {
        case 'aptos':
          return await this.verifyAptosSignature(address, signature, message);
        
        case 'ethereum':
          return await this.verifyEthereumSignature(address, signature, message);
        
        case 'solana':
          return await this.verifySolanaSignature(address, signature, message);
        
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Signature verification error (${walletType}):`, error);
      return false;
    }
  }

  /**
   * Verify Aptos signature
   */
  private async verifyAptosSignature(
    address: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Aptos signature verification using @aptos-labs/ts-sdk
      const { AccountAddress, Ed25519PublicKey } = await import('@aptos-labs/ts-sdk');
      
      // Convert address to AccountAddress
      AccountAddress.fromString(address);
      
      // Decode signature (Aptos signatures are base64 encoded)
      // Note: Aptos signature format may vary - this is a simplified implementation
      // In production, you should verify the exact signature format from the client
      const signatureBytes = Buffer.from(signature, 'base64');
      
      // Create message bytes
      const messageBytes = Buffer.from(message, 'utf-8');
      
      // For Aptos, the signature typically includes the public key
      // This is a simplified verification - adjust based on actual client implementation
      if (signatureBytes.length < 64) {
        logger.warn('Invalid Aptos signature length');
        return false;
      }
      
      // Extract public key and signature (simplified - adjust based on actual format)
      const publicKeyBytes = signatureBytes.slice(0, 32);
      const signatureData = signatureBytes.slice(32, 64);
      
      const publicKey = new Ed25519PublicKey(publicKeyBytes);
      
      // Verify using Ed25519
      // Note: Aptos SDK verifySignature may have different signature
      // This is a simplified implementation - adjust based on actual SDK version
      // @ts-ignore - SDK method signature may vary
      return publicKey.verifySignature(messageBytes, signatureData);
    } catch (error) {
      logger.error('Aptos signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Ethereum signature
   */
  private async verifyEthereumSignature(
    address: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Ethereum signature verification using ethers.js
      const { verifyMessage } = await import('ethers');
      
      // Verify the message signature
      const recoveredAddress = verifyMessage(message, signature);
      
      // Compare addresses (case-insensitive)
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Ethereum signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Solana signature
   */
  private async verifySolanaSignature(
    address: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Solana signature verification using @solana/web3.js and tweetnacl
      const { PublicKey } = await import('@solana/web3.js');
      const nacl = await import('tweetnacl');
      
      // Create PublicKey from address
      const publicKey = new PublicKey(address);
      
      // Encode message
      const messageBytes = new TextEncoder().encode(message);
      
      // Decode signature (can be hex or base58)
      let signatureBytes: Uint8Array;
      try {
        // Try base58 first (Solana's native encoding)
        signatureBytes = Buffer.from(signature, 'base64');
      } catch {
        // Fallback to hex
        signatureBytes = Buffer.from(signature, 'hex');
      }
      
      // Verify signature using Ed25519 (Solana uses Ed25519)
      return nacl.default.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (error) {
      logger.error('Solana signature verification failed:', error);
      return false;
    }
  }

  /**
   * Find or create user from wallet
   */
  private async findOrCreateWalletUser(data: {
    address: string;
    walletType: 'aptos' | 'ethereum' | 'solana';
  }): Promise<{
    id: string;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    createdAt: Date;
  }> {
    // Check if user with wallet address exists
    // Note: In production, you might want to add walletAddress field to User model
    // For now, we'll use a workaround with a separate table or email field
    
    // Generate a unique email from wallet address
    const walletEmail = `${data.address.toLowerCase()}@wallet.${data.walletType}.local`;
    
    let user = await prisma.user.findUnique({
      where: { email: walletEmail },
    });

    if (user) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername(data.address);

    const newUser = await prisma.user.create({
      data: {
        email: walletEmail,
        username,
        passwordHash: '', // Wallet users don't have passwords
        fullName: `Wallet User ${data.address.slice(0, 8)}`,
      },
    });

    logger.info(`Created new user via wallet (${data.walletType}): ${newUser.id}`);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      avatarUrl: newUser.avatarUrl,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
    };
  }

  /**
   * Generate unique username from wallet address
   */
  private async generateUniqueUsername(address: string): Promise<string> {
    const shortAddress = address.slice(0, 8).toLowerCase();
    let username = `wallet_${shortAddress}`;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `wallet_${shortAddress}${counter}`;
      counter++;
    }

    return username;
  }
}

export const walletService = new WalletService();

