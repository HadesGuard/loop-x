// Mock for shelby.service to avoid Shelby SDK import issues in tests
export const shelbyService = {
  uploadBlob: vi.fn().mockResolvedValue(undefined),
  getServiceAccountAddress: vi.fn().mockReturnValue('0x1234567890abcdef'),
  downloadBlob: vi.fn().mockResolvedValue({
    getReader: () => ({
      read: () => Promise.resolve({ done: true, value: undefined }),
    }),
  }),
  uploadVideo: vi.fn().mockResolvedValue({
    account: '0x1234567890abcdef',
    blobName: 'test-video.mp4',
    merkleRoot: 'test-merkle-root',
    expirationMicros: BigInt(Date.now() * 1000),
    chunksets: 1,
    size: 1024,
  }),
};
