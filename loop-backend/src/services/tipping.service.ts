/**
 * TippingService — On-chain creator tipping via the Loop tipping Move module.
 *
 * The platform service account mediates all tip transfers:
 *   1. Backend receives a tip request from an authenticated viewer.
 *   2. Service calls `tipping::tipping::send_tip` on-chain (platform signs).
 *   3. The Move module splits the gross amount: net → creator, fee → platform.
 *   4. Service records the tip locally in the `tips` table.
 *
 * Security notes:
 *   - Platform private key is loaded from env, never hard-coded.
 *   - Only authenticated users can trigger a tip (enforced by controller).
 *   - Both tipper and creator must have registered Aptos wallet addresses.
 *   - Minimum tip amount is enforced: 1 000 octas (~0.00001 APT).
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
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import type { TipSubmitParams, OnChainTipResult, TipResponse, EarningsResponse } from '@/types/tipping.types';

// Minimum tip: 1 000 octas
const MIN_TIP_OCTAS = 1_000n;

// Default fee if on-chain view call fails: 500 bps = 5%
const DEFAULT_FEE_BPS = 500;

// Map env SHELBY_NETWORK → Aptos Network enum (same pattern as nft.service.ts)
const NETWORK_MAP: Record<string, Network> = {
  testnet: Network.TESTNET,
  mainnet: Network.MAINNET,
  shelbynet: Network.TESTNET,
  devnet: Network.DEVNET,
};

export class TippingService {
  private aptos: Aptos;
  private signer: Account | null = null;
  private contractAddress: string | null = null;

  constructor() {
    const networkName = env.SHELBY_NETWORK ?? 'testnet';
    const network = NETWORK_MAP[networkName] ?? Network.TESTNET;

    const aptosConfig = env.APTOS_NODE_URL
      ? new AptosConfig({ network, fullnode: env.APTOS_NODE_URL })
      : new AptosConfig({ network });

    this.aptos = new Aptos(aptosConfig);

    if (env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY) {
      try {
        this.signer = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey(env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY),
        });
        logger.info(`Tipping service initialised. Signer: ${this.signer.accountAddress.toString()}`);
      } catch (err) {
        logger.error('Tipping service: failed to initialise signer:', err);
      }
    } else {
      logger.warn('Tipping service: SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY not set — tipping disabled');
    }

    // Contract address defaults to the service account (single-deployer pattern).
    this.contractAddress =
      env.APTOS_CONTRACT_ADDRESS ?? this.signer?.accountAddress.toString() ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Submit a tip on-chain and record it locally.
   *
   * @param params.videoId        UUID of the tipped video.
   * @param params.tipperId       Loop user ID of the viewer.
   * @param params.creatorAddress Aptos wallet address of the creator.
   * @param params.tipperAddress  Aptos wallet address of the viewer (recorded in event).
   * @param params.amountOctas    Gross tip amount in octas.
   */
  async submitTip(params: TipSubmitParams): Promise<TipResponse> {
    const { videoId, tipperId, creatorAddress, tipperAddress, amountOctas } = params;

    this.assertReady();

    if (amountOctas < MIN_TIP_OCTAS) {
      throw new AppError(
        `Tip amount must be at least ${MIN_TIP_OCTAS} octas`,
        400,
        'TIP_TOO_SMALL',
      );
    }

    // Validate Aptos addresses.
    this.validateAddress(creatorAddress, 'creator');
    this.validateAddress(tipperAddress, 'tipper');

    // creatorId is resolved by the controller from the video owner.
    // We use creatorAddress for on-chain and creatorId for the local record.

    // Submit on-chain.
    const onChain = await this.sendTipOnChain(tipperAddress, creatorAddress, amountOctas);

    // Persist locally.
    const tip = await prisma.tip.create({
      data: {
        tipperId,
        creatorId: params.creatorId,
        videoId,
        grossAmountOctas: onChain.grossAmount,
        feeOctas: onChain.feeAmount,
        netAmountOctas: onChain.netAmount,
        feeBps: onChain.feeBps,
        txHash: onChain.txHash,
        contractAddress: onChain.contractAddress,
      },
    });

    return this.formatTip(tip);
  }

  /**
   * Query a creator's total earnings and tip history.
   *
   * @param creatorId  Loop user ID of the creator.
   * @param limit      Max tips to return (default 20).
   * @param offset     Pagination offset (default 0).
   */
  async getCreatorEarnings(
    creatorId: string,
    limit = 20,
    offset = 0,
  ): Promise<EarningsResponse> {
    const [aggregate, tips] = await Promise.all([
      prisma.tip.aggregate({
        where: { creatorId },
        _sum: {
          grossAmountOctas: true,
          netAmountOctas: true,
          feeOctas: true,
        },
        _count: { id: true },
      }),
      prisma.tip.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      creatorId,
      totalGrossOctas: (aggregate._sum.grossAmountOctas ?? 0n).toString(),
      totalNetOctas: (aggregate._sum.netAmountOctas ?? 0n).toString(),
      totalFeesOctas: (aggregate._sum.feeOctas ?? 0n).toString(),
      tipCount: aggregate._count.id,
      tips: tips.map(this.formatTip),
    };
  }

  /**
   * Get all tips sent by a viewer.
   */
  async getTipsByTipper(tipperId: string, limit = 20, offset = 0): Promise<TipResponse[]> {
    const tips = await prisma.tip.findMany({
      where: { tipperId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return tips.map(this.formatTip);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Call `tipping::tipping::send_tip` on-chain using the platform signer.
   */
  private async sendTipOnChain(
    tipperAddress: string,
    creatorAddress: string,
    grossAmount: bigint,
  ): Promise<OnChainTipResult> {
    const signer = this.signer!;
    const contractAddr = this.contractAddress!;

    // Fetch the current fee from the contract so we can record it accurately.
    const feeBps = await this.fetchFeeBps(contractAddr);

    logger.info(`Submitting tip: creator=${creatorAddress} amount=${grossAmount} octas feeBps=${feeBps}`);

    const payload: InputEntryFunctionData = {
      function: `${contractAddr}::tipping::send_tip`,
      functionArguments: [
        tipperAddress,
        creatorAddress,
        grossAmount.toString(),
      ],
    };

    let txHash: string;
    try {
      const tx: SimpleTransaction = await this.aptos.transaction.build.simple({
        sender: signer.accountAddress,
        data: payload,
      });

      const pendingTx = await this.aptos.signAndSubmitTransaction({ signer, transaction: tx });
      txHash = pendingTx.hash;
      logger.info(`Tip tx submitted: ${txHash}`);

      await this.aptos.waitForTransaction({ transactionHash: txHash });
      logger.info(`Tip tx confirmed: ${txHash}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Tip on-chain submission failed:', err);
      throw new AppError(`Tip transaction failed: ${msg}`, 500, 'TIP_TX_FAILED');
    }

    const feeAmount = (grossAmount * BigInt(feeBps)) / 10_000n;
    const netAmount = grossAmount - feeAmount;

    return { txHash, grossAmount, feeAmount, netAmount, feeBps, contractAddress: contractAddr };
  }

  /**
   * Query the on-chain view function to get the current platform fee.
   * Falls back to the DEFAULT_FEE_BPS constant on failure.
   */
  private async fetchFeeBps(contractAddr: string): Promise<number> {
    try {
      const [feeBps] = await this.aptos.view({
        payload: {
          function: `${contractAddr}::tipping::get_fee_bps`,
          functionArguments: [contractAddr],
        },
      });
      return Number(feeBps);
    } catch (err) {
      logger.warn('Could not fetch on-chain fee bps, using default:', err);
      return DEFAULT_FEE_BPS;
    }
  }

  private validateAddress(addr: string, label: string): void {
    try {
      AccountAddress.fromString(addr);
    } catch {
      throw new AppError(`Invalid Aptos ${label} address: ${addr}`, 400, 'INVALID_ADDRESS');
    }
  }

  private assertReady(): void {
    if (!this.signer) {
      throw new AppError(
        'Tipping is not configured (missing SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY)',
        503,
        'TIPPING_NOT_CONFIGURED',
      );
    }
    if (!this.contractAddress) {
      throw new AppError(
        'Tipping contract address not configured (missing APTOS_CONTRACT_ADDRESS)',
        503,
        'TIPPING_CONTRACT_NOT_CONFIGURED',
      );
    }
  }

  private formatTip(tip: {
    id: string;
    tipperId: string;
    creatorId: string;
    videoId: string;
    grossAmountOctas: bigint;
    feeOctas: bigint;
    netAmountOctas: bigint;
    feeBps: number;
    txHash: string;
    contractAddress: string;
    createdAt: Date;
  }): TipResponse {
    return {
      id: tip.id,
      tipperId: tip.tipperId,
      creatorId: tip.creatorId,
      videoId: tip.videoId,
      grossAmountOctas: tip.grossAmountOctas.toString(),
      feeOctas: tip.feeOctas.toString(),
      netAmountOctas: tip.netAmountOctas.toString(),
      feeBps: tip.feeBps,
      txHash: tip.txHash,
      contractAddress: tip.contractAddress,
      createdAt: tip.createdAt.toISOString(),
    };
  }
}

export const tippingService = new TippingService();
