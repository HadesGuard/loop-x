// @ts-ignore - Shelby SDK subpath exports not resolved with moduleResolution: "node"
import { ShelbyNodeClient, generateCommitments, ClayErasureCodingProvider, defaultErasureCodingConfig } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

const NETWORK_MAP: Record<string, Network> = {
  shelbynet: Network.SHELBYNET,
  testnet: Network.TESTNET,
  mainnet: Network.MAINNET,
};

export class ShelbyService {
  private client: ShelbyNodeClient | null = null;
  private signer: Account | null = null;
  private warmupDone = false;

  constructor() {
    if (!env.SHELBY_API_KEY) {
      logger.warn('Shelby API key not configured');
      return;
    }

    const networkName = env.SHELBY_NETWORK ?? 'testnet';
    const network = NETWORK_MAP[networkName] ?? Network.TESTNET;
    this.client = new ShelbyNodeClient({ network, apiKey: env.SHELBY_API_KEY });
    logger.info(`Shelby client initialized with network: ${networkName}`);

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

    // Warm up WASM erasure coding provider (first use produces incorrect results)
    this.warmup();
  }

  /**
   * Warm up the WASM erasure coding provider to avoid first-upload failure.
   * SDK bug: the first generateCommitments call after WASM init produces
   * incorrect merkle roots, causing the upload complete step to fail.
   */
  private async warmup(): Promise<void> {
    if (!this.client) return;
    try {
      // Use the SDK client's internal provider so the warmup affects
      // the same singleton that client.upload() will use later.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = await (this.client as any).getProvider();
      const dummyData = new Uint8Array(16);
      await generateCommitments(provider, dummyData);
      this.warmupDone = true;
      logger.info('Shelby WASM provider warmed up');
    } catch (error) {
      logger.warn('Shelby WASM warmup failed (uploads may fail on first attempt):', error);
    }
  }

  private async ensureWarmedUp(): Promise<void> {
    if (!this.warmupDone && this.client) {
      await this.warmup();
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

    await this.ensureWarmedUp();

    const expirationMicros = BigInt((Date.now() + expirationDays * 24 * 60 * 60 * 1000) * 1000);

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

    await this.ensureWarmedUp();

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
