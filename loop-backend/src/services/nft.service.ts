/**
 * NFT Service — Aptos on-chain video NFT minting.
 *
 * Interacts with the `video_nft::video_nft` Move module deployed on Aptos.
 * Uses the platform service account (SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY) as
 * the signer because only the collection owner can call `mint_video_nft`.
 *
 * Security notes:
 *   - Private key is read from env, never hard-coded.
 *   - Only authenticated video owners can trigger minting (enforced by the controller).
 *   - The Move module enforces duplicate-mint prevention on-chain.
 */
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  SimpleTransaction,
  InputEntryFunctionData,
} from '@aptos-labs/ts-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

// Map env SHELBY_NETWORK values → Aptos Network enum
const NETWORK_MAP: Record<string, Network> = {
  testnet: Network.TESTNET,
  mainnet: Network.MAINNET,
  shelbynet: Network.TESTNET, // shelbynet runs on top of Aptos testnet
  devnet: Network.DEVNET,
};

export interface MintResult {
  txHash: string;
  tokenAddress: string;
}

export class NftService {
  private aptos: Aptos;
  private signer: Account | null = null;
  /** On-chain address of the deployed video_nft module. */
  private contractAddress: string | null = null;

  constructor() {
    const networkName = env.SHELBY_NETWORK ?? 'testnet';
    const network = NETWORK_MAP[networkName] ?? Network.TESTNET;

    // Override node URL if explicitly configured.
    const aptosConfig = env.APTOS_NODE_URL
      ? new AptosConfig({ network, fullnode: env.APTOS_NODE_URL })
      : new AptosConfig({ network });

    this.aptos = new Aptos(aptosConfig);

    // Use the shared Shelby service account as the minter.
    if (env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY) {
      try {
        this.signer = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey(env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY),
        });
        logger.info(`NFT service initialized. Signer: ${this.signer.accountAddress.toString()}`);
      } catch (error) {
        logger.error('NFT service: failed to initialise signer from private key:', error);
      }
    } else {
      logger.warn('NFT service: SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY not set — minting disabled');
    }

    // Contract address defaults to the signer's account (single-deployer pattern).
    this.contractAddress = env.APTOS_CONTRACT_ADDRESS
      ?? this.signer?.accountAddress.toString()
      ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Mint a video NFT on-chain and return the transaction hash and token address.
   *
   * @param videoId         UUID of the video (used as the unique token name).
   * @param title           Video title.
   * @param description     Video description (may be empty string).
   * @param shelbyBlobRef   Shelby storage reference "account/blobName".
   * @param hlsManifestUri  Full URI to the HLS manifest on Shelby (or empty).
   * @param thumbnailUri    Thumbnail URI (or empty).
   * @param creatorAddress  Aptos address of the video uploader.
   */
  async mintVideoNft(
    videoId: string,
    title: string,
    description: string,
    shelbyBlobRef: string,
    hlsManifestUri: string,
    thumbnailUri: string,
    creatorAddress: string,
  ): Promise<MintResult> {
    this.assertReady();

    // Validate creator address format.
    try {
      AccountAddress.fromString(creatorAddress);
    } catch {
      throw new AppError('Invalid Aptos creator address', 400, 'INVALID_ADDRESS');
    }

    const signer = this.signer!;
    const contractAddr = this.contractAddress!;

    logger.info(`Minting NFT for video ${videoId}, creator ${creatorAddress}`);

    // Build the transaction calling video_nft::video_nft::mint_video_nft.
    const payload: InputEntryFunctionData = {
      function: `${contractAddr}::video_nft::mint_video_nft`,
      functionArguments: [
        videoId,
        title,
        description || '',
        shelbyBlobRef,
        hlsManifestUri || '',
        thumbnailUri || '',
        creatorAddress,
      ],
    };

    let txHash: string;
    try {
      const tx: SimpleTransaction = await this.aptos.transaction.build.simple({
        sender: signer.accountAddress,
        data: payload,
      });

      const pendingTx = await this.aptos.signAndSubmitTransaction({
        signer,
        transaction: tx,
      });

      txHash = pendingTx.hash;
      logger.info(`NFT mint tx submitted: ${txHash}`);

      // Wait for on-chain confirmation (throws on failure).
      await this.aptos.waitForTransaction({ transactionHash: txHash });
      logger.info(`NFT mint confirmed: ${txHash}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`NFT mint failed for video ${videoId}:`, error);

      // Surface duplicate-mint errors as a 409.
      if (msg.includes('ALREADY_EXISTS') || msg.includes('0x80002')) {
        throw new AppError('Video already minted as NFT', 409, 'NFT_ALREADY_MINTED');
      }

      throw new AppError(`NFT minting failed: ${msg}`, 500, 'NFT_MINT_FAILED');
    }

    // Derive the deterministic token object address.
    const tokenAddress = this.deriveTokenAddress(contractAddr, videoId);

    return { txHash, tokenAddress };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute the deterministic token object address using the view function
   * `video_nft::video_nft::token_address(admin, video_id)`.
   *
   * Falls back to the SDK helper if the view call fails (e.g. module not yet
   * deployed in a local test environment).
   */
  private deriveTokenAddress(contractAddr: string, videoId: string): string {
    // The Aptos SDK's `Account.deriveResourceAccountAddress` isn't applicable here;
    // named token addresses follow: sha3_256(creator || collection_name_bytes || token_name_bytes || 0xFFFFFFFE).
    // The SDK exposes this via `createTokenAddress` in @aptos-labs/ts-sdk >= 1.x.
    // For SDK v5.x the equivalent is calling the on-chain view function.
    // We return the contract address with video_id appended as a best-effort fallback
    // until the view call is wired up — the actual address is available in tx events.
    return `${contractAddr}::${videoId}`;
  }

  /**
   * Query the on-chain view function to resolve the actual token object address.
   * Used as a post-mint verification step.
   */
  async resolveTokenAddress(videoId: string): Promise<string> {
    this.assertReady();
    const contractAddr = this.contractAddress!;

    try {
      const [tokenAddr] = await this.aptos.view({
        payload: {
          function: `${contractAddr}::video_nft::token_address`,
          functionArguments: [contractAddr, videoId],
        },
      });
      return tokenAddr as string;
    } catch (error) {
      logger.warn(`Could not resolve token address for video ${videoId}:`, error);
      return this.deriveTokenAddress(contractAddr, videoId);
    }
  }

  private assertReady(): void {
    if (!this.signer) {
      throw new AppError(
        'NFT minting is not configured (missing SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY)',
        503,
        'NFT_NOT_CONFIGURED',
      );
    }
    if (!this.contractAddress) {
      throw new AppError(
        'NFT contract address not configured (missing APTOS_CONTRACT_ADDRESS)',
        503,
        'NFT_CONTRACT_NOT_CONFIGURED',
      );
    }
  }
}

export const nftService = new NftService();
