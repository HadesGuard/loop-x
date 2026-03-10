// API Response Types matching Backend
export interface ApiVideoResponse {
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
  hlsManifestUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: ApiUserResponse;
}

export interface ApiCommentResponse {
  id: string;
  videoId: string;
  userId: string;
  parentId: string | null;
  text: string;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
  user?: ApiUserResponse;
  replies?: ApiCommentResponse[];
}

export interface ApiUserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  followersCount?: number;
  followingCount?: number;
  videosCount?: number;
  isFollowing?: boolean;
}

export interface ApiNotificationResponse {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'reply' | 'mention';
  actorId: string;
  videoId: string | null;
  commentId: string | null;
  message: string | null;
  read: boolean;
  createdAt: string;
  actor?: ApiUserResponse;
  video?: ApiVideoResponse;
  comment?: ApiCommentResponse;
}

export interface ApiConversationResponse {
  id: string;
  username: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  lastMessage: string | null;
  timestamp: string;
  unread: number;
  createdAt: string;
}

export interface ApiMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender?: ApiUserResponse;
}

export interface ApiSearchResults {
  users: ApiUserResponse[];
  videos: ApiVideoResponse[];
  hashtags: Array<{
    tag: string;
    views: string;
    videosCount: number;
  }>;
}

export interface ApiAuthResponse {
  user: ApiUserResponse;
  token: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

