// @ts-ignore - Shelby SDK subpath exports not resolved with moduleResolution: "node"
import { ShelbyNodeClient, generateCommitments, ClayErasureCodingProvider, defaultErasureCodingConfig } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

const NETWORK_MAP: Record<string, Network> = {
  shelbynet: Network.SHELBYNET,
  testnet: Network.TESTNET,
  mainnet: Network.MAINNET,
};

// SECURITY NOTE: HLS blob naming uses paths like "videos/{id}/hls/segment.ts".
// The Shelby BlobNameSchema allows "/" as a path separator (validated: max 1024 chars,
// must not end with "/"). This is confirmed safe for use.

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
   *
   * RISK: `(this.client as any).getProvider()` accesses a private method introduced
   * in @shelby-protocol/sdk@0.2.4. If the SDK is upgraded, this cast may break silently.
   * SDK version is pinned to 0.2.4 in package.json to prevent unintended upgrades.
   * Before upgrading the SDK, check if a public warmup API has been added (e.g. a
   * `warmup()` or `getProvider()` public method on ShelbyClient).
   *
   * Pinned SDK: @shelby-protocol/sdk 0.2.4
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
      // blobMerkleRoot is typed as Uint8Array in SDK v0.2.4; convert directly to hex
      merkleRoot: metadata?.blobMerkleRoot ? Buffer.from(metadata.blobMerkleRoot).toString('hex') : '',
      expirationMicros,
      chunksets: metadata?.encoding?.erasure_k ?? 1,
      size: metadata?.size ?? videoData.length,
    };
  }

  /**
   * Check and renew blobs for videos whose Shelby expiration is within the given
   * threshold. Called from video-processing jobs to prevent silent content expiry.
   *
   * Strategy: download the existing blob from Shelby, then re-upload it with a
   * fresh expiration. The SDK v0.2.4 does not expose an "extend expiration"
   * transaction directly; re-upload is the supported renewal path.
   *
   * @param thresholdDays - Renew blobs expiring within this many days (default 7)
   * @param renewalDays   - Extend renewed blobs by this many days (default 30)
   */
  async renewExpiringBlobs(
    thresholdDays: number = 7,
    renewalDays: number = 30
  ): Promise<{ renewed: number; failed: number }> {
    if (!this.signer || !this.client) {
      logger.warn('Shelby not configured — skipping blob expiration renewal');
      return { renewed: 0, failed: 0 };
    }

    const thresholdMicros = BigInt((Date.now() + thresholdDays * 24 * 60 * 60 * 1000) * 1000);

    // Find videos with Shelby blobs expiring within the threshold
    const expiringVideos = await prisma.video.findMany({
      where: {
        shelbyAccount: { not: null },
        shelbyBlobName: { not: null },
        shelbyExpiration: { lte: thresholdMicros },
        status: 'ready',
      },
      select: {
        id: true,
        shelbyAccount: true,
        shelbyBlobName: true,
        shelbyExpiration: true,
      },
    });

    if (expiringVideos.length === 0) {
      logger.info('Shelby renewal: no blobs expiring within threshold');
      return { renewed: 0, failed: 0 };
    }

    logger.info(`Shelby renewal: found ${expiringVideos.length} blob(s) expiring within ${thresholdDays} days`);

    let renewed = 0;
    let failed = 0;

    for (const video of expiringVideos) {
      try {
        // Download the existing blob data
        const blobStream = await this.downloadBlob(video.shelbyAccount!, video.shelbyBlobName!);
        const chunks: Uint8Array[] = [];
        const reader = blobStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const blobData = Buffer.alloc(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          blobData.set(chunk, offset);
          offset += chunk.length;
        }

        // Re-upload with renewed expiration
        await this.uploadBlob(blobData, video.shelbyBlobName!, renewalDays);

        const newExpirationMicros = BigInt((Date.now() + renewalDays * 24 * 60 * 60 * 1000) * 1000);
        await prisma.video.update({
          where: { id: video.id },
          data: { shelbyExpiration: newExpirationMicros },
        });

        logger.info(`Shelby renewal: renewed blob ${video.shelbyBlobName} for video ${video.id}`);
        renewed++;
      } catch (error) {
        logger.error(`Shelby renewal: failed to renew blob ${video.shelbyBlobName} for video ${video.id}:`, error);
        failed++;
      }
    }

    logger.info(`Shelby renewal complete: ${renewed} renewed, ${failed} failed`);
    return { renewed, failed };
  }
}

export const shelbyService = new ShelbyService();
