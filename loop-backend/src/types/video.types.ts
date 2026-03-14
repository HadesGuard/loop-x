export interface VideoUploadInput {
  title: string;
  description?: string;
  privacy?: 'public' | 'private' | 'friends';
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

export type UploadVideoInput = VideoUploadInput;

export interface VideoResponse {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string | null;
  title: string;
  description: string | null;
  views: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number | null;
  fileSize: number | null;
  privacy: string;
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  // Shelby fields
  shelbyAccount: string | null;
  shelbyBlobName: string | null;
  shelbyMerkleRoot: string | null;
  shelbyExpiration: string | null;
  shelbySize: number | null;
  shelbyChunksets: number | null;
  // On-chain NFT fields
  nftTokenAddress: string | null;
  nftTxHash: string | null;
  nftMintedAt: Date | null;
}

