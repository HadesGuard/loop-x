export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileWithStats extends UserProfile {
  followersCount: number;
  followingCount: number;
  videosCount: number;
  isFollowing?: boolean; // Whether current user is following this user
}

export interface UpdateProfileInput {
  fullName?: string;
  bio?: string;
  website?: string;
}

export interface UserVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  views: bigint;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number | null;
  createdAt: Date;
}

