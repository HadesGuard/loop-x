import { VideoResponse } from './video.types';

export interface FeedItem extends VideoResponse {
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedQuery {
  cursor?: string;
  limit?: number;
}



