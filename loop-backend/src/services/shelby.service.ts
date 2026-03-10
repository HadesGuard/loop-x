// @ts-ignore - Shelby SDK subpath exports not resolved with moduleResolution: "node"
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

export class ShelbyService {
  private client: ShelbyNodeClient | null = null;
  private signer: Account | null = null;

  constructor() {
    if (!env.SHELBY_API_KEY) {
      logger.warn('Shelby API key not configured');
      return;
    }

    this.client = new ShelbyNodeClient({
      network: Network.SHELBYNET,
      apiKey: env.SHELBY_API_KEY,
    });

    // Initialize service account signer if private key is provided
    if (env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY) {
      try {
        this.signer = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey(env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY),
        });
        logger.info(`Shelby service account initialized: ${this.signer.accountAddress.toString()}`);
      } catch (error) {
        logger.error('Failed to initialize Shelby service account:', error);
      }
    }
  }

  /**
   * Get service account address
   */
  getServiceAccountAddress(): string | null {
    return this.signer?.accountAddress.toString() || null;
  }

  /**
   * Upload a blob to Shelby (unified flow: encode + register + upload)
   */
  async uploadBlob(
    blobData: Buffer,
    blobName: string,
    expirationDays: number = 30
  ): Promise<void> {
    if (!this.signer || !this.client) {
      throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
    }

    const expirationMicros = (Date.now() + expirationDays * 24 * 60 * 60 * 1000) * 1000;

    try {
      await this.client.upload({
        signer: this.signer,
        blobData: new Uint8Array(blobData),
        blobName,
        expirationMicros,
      });
      logger.info(`Blob uploaded to Shelby: ${blobName}`);
    } catch (error) {
      logger.error(`Failed to upload blob to Shelby (${blobName}):`, error);
      throw new AppError('Failed to upload to Shelby', 500, 'SHELBY_UPLOAD_ERROR');
    }
  }

  /**
   * Download blob from Shelby
   */
  async downloadBlob(accountAddress: string, blobName: string): Promise<ReadableStream> {
    if (!this.client) {
      throw new AppError('Shelby client not configured', 500, 'SHELBY_NOT_CONFIGURED');
    }

    try {
      const account = AccountAddress.fromString(accountAddress);

      const { readable } = await this.client.download({
        account,
        blobName,
      });

      return readable;
    } catch (error) {
      logger.error('Failed to download blob from Shelby:', error);
      throw new AppError('Failed to download video from Shelby', 500, 'SHELBY_DOWNLOAD_ERROR');
    }
  }

  /**
   * Upload video to Shelby (complete flow)
   */
  async uploadVideo(
    videoData: Buffer,
    videoId: string,
    expirationDays: number = 30
  ): Promise<{
    account: string;
    blobName: string;
    merkleRoot: string;
    expirationMicros: bigint;
    chunksets: number;
    size: number;
  }> {
    if (!this.signer || !this.client) {
      throw new AppError('Shelby service account not configured', 500, 'SHELBY_NOT_CONFIGURED');
    }

    const blobName = `video_${videoId}.mp4`;
    const expirationMicros = BigInt((Date.now() + expirationDays * 24 * 60 * 60 * 1000) * 1000);

    logger.info(`Uploading video to Shelby: ${blobName}`);
    await this.uploadBlob(videoData, blobName, expirationDays);

    // Fetch registered metadata from chain
    const metadata = await this.client.coordination.getBlobMetadata({
      account: this.signer.accountAddress,
      name: blobName,
    });

    return {
      account: this.signer.accountAddress.toString(),
      blobName,
      merkleRoot: metadata?.blobMerkleRoot ? Buffer.from(Object.values(metadata.blobMerkleRoot as Record<string, number>)).toString('hex') : '',
      expirationMicros,
      chunksets: metadata?.encoding?.erasure_k ?? 1,
      size: metadata?.size ?? videoData.length,
    };
  }
}

export const shelbyService = new ShelbyService();
