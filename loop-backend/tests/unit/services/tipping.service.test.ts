import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../src/config/database', () => ({
  prisma: {
    tip: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    SHELBY_NETWORK: 'testnet',
    SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY: undefined, // disabled by default
    APTOS_CONTRACT_ADDRESS: undefined,
    APTOS_NODE_URL: 'https://fullnode.testnet.aptoslabs.com/v1',
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { AppError } from '../../../src/middleware/error.middleware';
import { prisma } from '../../../src/config/database';
import { TippingService } from '../../../src/services/tipping.service';

const mockPrisma = vi.mocked(prisma);

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTipRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tip-uuid-1',
    tipperId: 'user-tipper',
    creatorId: 'user-creator',
    videoId: 'video-1',
    grossAmountOctas: 10_000n,
    feeOctas: 500n,
    netAmountOctas: 9_500n,
    feeBps: 500,
    txHash: '0xabc',
    contractAddress: '0xcontract',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TippingService', () => {
  let service: TippingService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Instantiate fresh each time (signer will be null — private key not set).
    service = new TippingService();
  });

  // ── submitTip ─────────────────────────────────────────────────────────

  describe('submitTip', () => {
    it('throws TIPPING_NOT_CONFIGURED when signer is absent', async () => {
      await expect(
        service.submitTip({
          videoId: 'v-1',
          tipperId: 'u-1',
          creatorId: 'u-2',
          creatorAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          tipperAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amountOctas: 5_000n,
        }),
      ).rejects.toThrow(AppError);

      await expect(
        service.submitTip({
          videoId: 'v-1',
          tipperId: 'u-1',
          creatorId: 'u-2',
          creatorAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          tipperAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amountOctas: 5_000n,
        }),
      ).rejects.toMatchObject({ code: 'TIPPING_NOT_CONFIGURED' });
    });

    it('throws TIP_TOO_SMALL when amount is below minimum', async () => {
      // Even without a signer, the amount check runs first only when signer is present.
      // Test with a patched service that has a signer set.
      const patchedService = new TippingService();
      // @ts-expect-error: injecting private field for test
      patchedService.signer = { accountAddress: { toString: () => '0xadmin' } };
      // @ts-expect-error: injecting private field for test
      patchedService.contractAddress = '0xcontract';

      await expect(
        patchedService.submitTip({
          videoId: 'v-1',
          tipperId: 'u-1',
          creatorId: 'u-2',
          creatorAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          tipperAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amountOctas: 999n, // below MIN_TIP_OCTAS (1 000)
        }),
      ).rejects.toMatchObject({ code: 'TIP_TOO_SMALL' });
    });

    it('throws INVALID_ADDRESS for a malformed creator address', async () => {
      const patchedService = new TippingService();
      // @ts-expect-error: injecting private field for test
      patchedService.signer = { accountAddress: { toString: () => '0xadmin' } };
      // @ts-expect-error: injecting private field for test
      patchedService.contractAddress = '0xcontract';

      await expect(
        patchedService.submitTip({
          videoId: 'v-1',
          tipperId: 'u-1',
          creatorId: 'u-2',
          creatorAddress: 'not-a-valid-address',
          tipperAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amountOctas: 5_000n,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_ADDRESS' });
    });
  });

  // ── getCreatorEarnings ────────────────────────────────────────────────

  describe('getCreatorEarnings', () => {
    it('returns aggregated earnings and tip list', async () => {
      const tip = makeTipRecord();

      mockPrisma.tip.aggregate.mockResolvedValue({
        _sum: {
          grossAmountOctas: 10_000n,
          netAmountOctas: 9_500n,
          feeOctas: 500n,
        },
        _count: { id: 1 },
      } as any);

      mockPrisma.tip.findMany.mockResolvedValue([tip] as any);

      const result = await service.getCreatorEarnings('user-creator');

      expect(result.creatorId).toBe('user-creator');
      expect(result.totalGrossOctas).toBe('10000');
      expect(result.totalNetOctas).toBe('9500');
      expect(result.totalFeesOctas).toBe('500');
      expect(result.tipCount).toBe(1);
      expect(result.tips).toHaveLength(1);
      expect(result.tips[0].txHash).toBe('0xabc');
    });

    it('returns zero totals when no tips exist', async () => {
      mockPrisma.tip.aggregate.mockResolvedValue({
        _sum: {
          grossAmountOctas: null,
          netAmountOctas: null,
          feeOctas: null,
        },
        _count: { id: 0 },
      } as any);

      mockPrisma.tip.findMany.mockResolvedValue([]);

      const result = await service.getCreatorEarnings('user-nobody');

      expect(result.totalGrossOctas).toBe('0');
      expect(result.totalNetOctas).toBe('0');
      expect(result.totalFeesOctas).toBe('0');
      expect(result.tipCount).toBe(0);
      expect(result.tips).toHaveLength(0);
    });
  });

  // ── getTipsByTipper ───────────────────────────────────────────────────

  describe('getTipsByTipper', () => {
    it('returns tips sent by a viewer', async () => {
      mockPrisma.tip.findMany.mockResolvedValue([makeTipRecord()] as any);

      const result = await service.getTipsByTipper('user-tipper');

      expect(result).toHaveLength(1);
      expect(result[0].tipperId).toBe('user-tipper');
      expect(result[0].grossAmountOctas).toBe('10000');
    });

    it('passes correct limit and offset to the query', async () => {
      mockPrisma.tip.findMany.mockResolvedValue([]);

      await service.getTipsByTipper('u-1', 5, 10);

      expect(mockPrisma.tip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 10 }),
      );
    });
  });
});
