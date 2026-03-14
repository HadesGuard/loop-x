export interface TipRequest {
  /** Gross amount in octas to tip (1 APT = 100_000_000 octas). */
  amountOctas: number;
}

export interface TipResponse {
  id: string;
  tipperId: string;
  creatorId: string;
  videoId: string;
  grossAmountOctas: string;
  feeOctas: string;
  netAmountOctas: string;
  feeBps: number;
  txHash: string;
  contractAddress: string;
  createdAt: string;
}

export interface EarningsResponse {
  creatorId: string;
  totalGrossOctas: string;
  totalNetOctas: string;
  totalFeesOctas: string;
  tipCount: number;
  tips: TipResponse[];
}

export interface TipSubmitParams {
  videoId: string;
  tipperId: string;
  /** Loop user ID of the creator (resolved from the video). */
  creatorId: string;
  /** Aptos wallet address of the creator. */
  creatorAddress: string;
  /** Aptos wallet address of the viewer (recorded in on-chain event). */
  tipperAddress: string;
  amountOctas: bigint;
}

export interface OnChainTipResult {
  txHash: string;
  grossAmount: bigint;
  feeAmount: bigint;
  netAmount: bigint;
  feeBps: number;
  contractAddress: string;
}
