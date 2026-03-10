export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  fullName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    createdAt: Date;
  };
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
}

