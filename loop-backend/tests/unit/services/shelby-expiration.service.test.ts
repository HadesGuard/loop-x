import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    video: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    SHELBY_API_KEY: undefined,
    SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY: undefined,
    SHELBY_NETWORK: 'testnet',
  },
}));

import { prisma } from '../../../src/config/database';
import { ShelbyService } from '../../../src/services/shelby.service';

const mockPrisma = vi.mocked(prisma);

describe('ShelbyService.markExpiredBlobs', () => {
  let service: ShelbyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShelbyService();
  });

  it('marks ready videos with past expiration as expired', async () => {
    mockPrisma.video.updateMany.mockResolvedValue({ count: 3 });

    const count = await service.markExpiredBlobs();

    expect(count).toBe(3);
    expect(mockPrisma.video.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'expired' },
        where: expect.objectContaining({
          status: 'ready',
          shelbyBlobName: { not: null },
        }),
      })
    );
  });

  it('returns 0 when no videos are expired', async () => {
    mockPrisma.video.updateMany.mockResolvedValue({ count: 0 });

    const count = await service.markExpiredBlobs();

    expect(count).toBe(0);
  });
});

describe('ShelbyService.renewExpiringBlobs (not configured)', () => {
  let service: ShelbyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShelbyService();
  });

  it('returns zeros when Shelby is not configured', async () => {
    const result = await service.renewExpiringBlobs();

    expect(result).toEqual({ renewed: 0, failed: 0 });
    expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
  });
});
