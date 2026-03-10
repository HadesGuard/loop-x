import type {
  ApiResponse,
  ApiAuthResponse,
  ApiVideoResponse,
  ApiCommentResponse,
  ApiUserResponse,
  ApiNotificationResponse,
  ApiConversationResponse,
  ApiMessageResponse,
  ApiSearchResults,
} from '@/types/api';
import type { Video, Comment, Notification, Conversation, Message } from '@/types/video';
import {
  transformVideo,
  transformComment,
  transformNotification,
  transformConversation,
  transformMessage,
} from './transformers';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshQueue: Array<{ resolve: (value: boolean) => void }> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setRefreshToken(refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - Unauthorized - Try to refresh token first
      if (response.status === 401) {
        // Skip refresh for auth endpoints to avoid infinite loops
        const isAuthEndpoint = endpoint.startsWith('/auth/');

        if (!isAuthEndpoint && retryCount === 0) {
          // Try to refresh token
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            // Retry original request with new token
            return this.request<T>(endpoint, options, retryCount + 1);
          }
        }

        // If refresh failed or is auth endpoint, clear tokens and redirect
        this.clearToken();
        // Disconnect WebSocket
        if (typeof window !== 'undefined') {
          const { wsClient } = await import('./websocket');
          wsClient.disconnect();
          // Only redirect if we're not already on login page to avoid loops
          if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            window.location.href = '/login';
          }
        }
        throw new Error('Unauthorized - Please login again');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a network/fetch error
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Cannot connect to server. Please make sure the backend is running.');
        }
        throw error;
      }
      throw new Error('Network error - Please check your connection and try again');
    }
  }

  private async requestFormData<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        const isAuthEndpoint = endpoint.startsWith('/auth/');

        if (!isAuthEndpoint && retryCount === 0) {
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            return this.requestFormData<T>(endpoint, options, retryCount + 1);
          }
        }

        this.clearToken();
        if (typeof window !== 'undefined') {
          const { wsClient } = await import('./websocket');
          wsClient.disconnect();
          if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            window.location.href = '/login';
          }
        }
        throw new Error('Unauthorized - Please login again');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Cannot connect to server. Please make sure the backend is running.');
        }
        throw error;
      }
      throw new Error('Network error - Please check your connection and try again');
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    // If already refreshing, queue this caller to avoid race conditions
    if (this.isRefreshing) {
      return new Promise<boolean>((resolve) => {
        this.refreshQueue.push({ resolve });
      });
    }

    this.isRefreshing = true;
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      return false;
    }

    try {
      const result = await this.refreshToken(refreshToken);
      this.setToken(result.token);
      if (result.refreshToken) {
        this.setRefreshToken(result.refreshToken);
      }

      // Update WebSocket with new token
      if (typeof window !== 'undefined') {
        const { wsClient } = await import('./websocket');
        wsClient.updateToken(result.token);
      }

      // Resolve all queued callers
      this.refreshQueue.forEach(({ resolve }) => resolve(true));
      return true;
    } catch (error) {
      // Token refresh failed - user will be redirected to login
      this.refreshQueue.forEach(({ resolve }) => resolve(false));
      return false;
    } finally {
      this.refreshQueue = [];
      this.isRefreshing = false;
    }
  }

  // Authentication Methods
  async login(email: string, password: string, rememberMe = false): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        // Connect WebSocket after successful login
        const { wsClient } = await import('./websocket');
        wsClient.connect(response.data.token);
      }
      return response.data;
    }
    throw new Error('Login failed');
  }

  async register(data: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        // Connect WebSocket after successful login
        const { wsClient } = await import('./websocket');
        wsClient.connect(response.data.token);
      }
      return response.data;
    }
    throw new Error('Registration failed');
  }

  async googleAuth(idToken: string): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        // Connect WebSocket after successful login
        const { wsClient } = await import('./websocket');
        wsClient.connect(response.data.token);
      }
      return response.data;
    }
    throw new Error('Google authentication failed');
  }

  async appleAuth(idToken: string, userInfo?: { email?: string; fullName?: string }): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ idToken, userInfo }),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        // Connect WebSocket after successful login
        const { wsClient } = await import('./websocket');
        wsClient.connect(response.data.token);
      }
      return response.data;
    }
    throw new Error('Apple authentication failed');
  }

  async walletNonce(address: string, walletType: 'aptos' | 'ethereum' | 'solana'): Promise<{ nonce: string; expiresAt: string }> {
    const response = await this.request<ApiResponse<{ nonce: string; expiresAt: string }>>('/auth/wallet/nonce', {
      method: 'POST',
      body: JSON.stringify({ address, walletType }),
    });
    return response.data;
  }

  async walletVerify(data: {
    address: string;
    signature: string;
    fullMessage: string;
    walletType: 'aptos' | 'ethereum' | 'solana';
  }): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        // Connect WebSocket after successful login
        const { wsClient } = await import('./websocket');
        wsClient.connect(response.data.token);
      }
      return response.data;
    }
    throw new Error('Wallet verification failed');
  }

  async refreshToken(refreshToken: string): Promise<ApiAuthResponse> {
    const response = await this.request<ApiResponse<ApiAuthResponse>>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken);
      }
      return response.data;
    }
    throw new Error('Token refresh failed');
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Ignore logout errors, still clear tokens
    } finally {
      this.clearToken();
      // Disconnect WebSocket
      if (typeof window !== 'undefined') {
        const { wsClient } = await import('./websocket');
        wsClient.disconnect();
      }
    }
  }

  // Video Methods
  async getVideosFeed(type: 'foryou' | 'following' = 'foryou', page = 1, limit = 10): Promise<Video[]> {
    const endpoint = type === 'foryou' ? '/feed' : '/feed/following';
    const url = `${endpoint}?page=${page}&limit=${limit}`;

    const response = await this.request<ApiResponse<{ videos: ApiVideoResponse[]; nextCursor?: string }>>(url);

    if (response.success && response.data) {
      if (response.data.videos && Array.isArray(response.data.videos)) {
        return response.data.videos.map(v => transformVideo(v, v.user));
      }
    }
    return [];
  }

  async getVideoById(id: string): Promise<Video | null> {
    try {
      const response = await this.request<ApiResponse<ApiVideoResponse>>(`/videos/${id}`);
      if (response.success && response.data) {
        return transformVideo(response.data, response.data.user);
      }
      return null;
    } catch {
      return null;
    }
  }

  async uploadVideo(file: File, metadata: {
    title: string;
    description?: string;
    privacy?: 'public' | 'private' | 'friends';
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
  }): Promise<Video> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.privacy) formData.append('privacy', metadata.privacy);
    formData.append('allowComments', String(metadata.allowComments ?? true));
    formData.append('allowDuet', String(metadata.allowDuet ?? true));
    formData.append('allowStitch', String(metadata.allowStitch ?? true));

    const data = await this.requestFormData<{ success: boolean; data: { video: ApiVideoResponse } }>('/videos', {
      method: 'POST',
      body: formData,
    });
    if (data.success && data.data) {
      return transformVideo(data.data.video, data.data.video.user);
    }
    throw new Error('Upload failed');
  }

  async updateVideo(id: string, data: {
    title?: string;
    description?: string;
    privacy?: string;
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
  }): Promise<Video> {
    const response = await this.request<ApiResponse<ApiVideoResponse>>(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      return transformVideo(response.data, response.data.user);
    }
    throw new Error('Failed to update video');
  }

  async deleteVideo(id: string): Promise<void> {
    await this.request(`/videos/${id}`, { method: 'DELETE' });
  }

  async likeVideo(id: string): Promise<{ liked: boolean }> {
    await this.request(`/videos/${id}/like`, { method: 'POST' });
    return { liked: true };
  }

  async unlikeVideo(id: string): Promise<{ liked: boolean }> {
    await this.request(`/videos/${id}/like`, { method: 'DELETE' });
    return { liked: false };
  }

  async saveVideo(id: string): Promise<{ saved: boolean }> {
    await this.request(`/videos/${id}/save`, { method: 'POST' });
    return { saved: true };
  }

  async unsaveVideo(id: string): Promise<{ saved: boolean }> {
    await this.request(`/videos/${id}/save`, { method: 'DELETE' });
    return { saved: false };
  }

  async shareVideo(id: string, platform?: string): Promise<void> {
    await this.request(`/videos/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ platform }),
    });
  }

  async trackView(id: string, duration?: number): Promise<void> {
    await this.request(`/videos/${id}/track-view`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  // Comment Methods
  async getComments(videoId: string, page = 1, limit = 20): Promise<Comment[]> {
    const response = await this.request<ApiResponse<{ comments: ApiCommentResponse[] }>>(
      `/videos/${videoId}/comments?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data.comments) {
      return response.data.comments.map(transformComment);
    }
    return [];
  }

  async addComment(videoId: string, text: string, parentId?: string): Promise<Comment> {
    const response = await this.request<ApiResponse<ApiCommentResponse>>(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, parentId }),
    });
    
    if (response.success && response.data) {
      return transformComment(response.data);
    }
    throw new Error('Failed to add comment');
  }

  async likeComment(id: string): Promise<{ liked: boolean; likes: number }> {
    await this.request(`/comments/${id}/like`, { method: 'POST' });
    // Note: Backend doesn't return updated likes count, would need to refetch
    return { liked: true, likes: 0 };
  }

  async unlikeComment(id: string): Promise<{ liked: boolean; likes: number }> {
    await this.request(`/comments/${id}/like`, { method: 'DELETE' });
    return { liked: false, likes: 0 };
  }

  async deleteComment(id: string): Promise<void> {
    await this.request(`/comments/${id}`, { method: 'DELETE' });
  }

  // User Methods
  async getCurrentUser(): Promise<ApiUserResponse> {
    const response = await this.request<ApiResponse<ApiUserResponse>>('/users/me');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get current user');
  }

  async getUserByUsername(username: string): Promise<ApiUserResponse> {
    const response = await this.request<ApiResponse<ApiUserResponse>>(`/users/${username}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('User not found');
  }

  async updateProfile(data: {
    fullName?: string;
    bio?: string;
    website?: string;
  }): Promise<ApiUserResponse> {
    const response = await this.request<ApiResponse<ApiUserResponse>>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data));
      }
      return response.data;
    }
    throw new Error('Failed to update profile');
  }

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', file);

    const data = await this.requestFormData<{ success: boolean; data: { avatarUrl: string } }>('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    if (data.success && data.data) {
      return data.data.avatarUrl;
    }
    throw new Error('Upload failed');
  }

  async followUser(username: string): Promise<{ following: boolean }> {
    await this.request(`/users/${username}/follow`, { method: 'POST' });
    return { following: true };
  }

  async unfollowUser(username: string): Promise<{ following: boolean }> {
    await this.request(`/users/${username}/follow`, { method: 'DELETE' });
    return { following: false };
  }

  async getUserVideos(username: string, page = 1, limit = 20): Promise<Video[]> {
    const response = await this.request<ApiResponse<{ videos: ApiVideoResponse[] }>>(
      `/users/${username}/videos?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data.videos) {
      return response.data.videos.map(v => transformVideo(v, v.user));
    }
    return [];
  }

  // Analytics Methods
  async getAnalyticsOverview(): Promise<{
    totalViews: number;
    totalFollowers: number;
    totalLikes: number;
    totalVideos: number;
    avgEngagement: number;
    weeklyGrowth: number;
    watchHours: number;
  }> {
    const response = await this.request<ApiResponse<{
      totalViews: number;
      totalFollowers: number;
      totalLikes: number;
      totalVideos: number;
      avgEngagement: number;
      weeklyGrowth: number;
      watchHours: number;
    }>>('/analytics/overview');
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get analytics overview');
  }

  async getVideoAnalytics(videoId: string): Promise<any> {
    const response = await this.request<ApiResponse<any>>(`/videos/${videoId}/analytics`);
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get video analytics');
  }

  async getMyVideos(page = 1, limit = 20): Promise<Video[]> {
    // Get current user from localStorage
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
    if (!userData) {
      throw new Error('User not authenticated');
    }
    
    const user = JSON.parse(userData);
    const username = user.username?.replace('@', '') || user.username;
    
    return this.getUserVideos(username, page, limit);
  }

  // Search Methods
  async search(query: string, type?: 'all' | 'users' | 'videos' | 'hashtags', page = 1, limit = 20): Promise<ApiSearchResults> {
    const typeParam = type === 'all' ? '' : `&type=${type}`;
    const response = await this.request<ApiResponse<ApiSearchResults>>(
      `/search?q=${encodeURIComponent(query)}${typeParam}&page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    return { users: [], videos: [], hashtags: [] };
  }

  // Notification Methods
  async getNotifications(page = 1, limit = 20): Promise<Notification[]> {
    const response = await this.request<ApiResponse<{ notifications: ApiNotificationResponse[] }>>(
      `/notifications?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data.notifications) {
      return response.data.notifications.map(transformNotification);
    }
    return [];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.request('/notifications/read-all', { method: 'PUT' });
  }

  // Message Methods
  async getConversations(): Promise<Conversation[]> {
    const response = await this.request<ApiResponse<{ conversations: ApiConversationResponse[] }>>('/conversations');
    
    if (response.success && response.data && response.data.conversations) {
      return response.data.conversations.map(transformConversation);
    }
    return [];
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    const response = await this.request<ApiResponse<{ messages: ApiMessageResponse[] }>>(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data.messages) {
      const currentUserId = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('user_data') || '{}').id 
        : undefined;
      return response.data.messages.map(m => transformMessage(m, currentUserId));
    }
    return [];
  }

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const response = await this.request<ApiResponse<ApiMessageResponse>>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    );
    
    if (response.success && response.data) {
      const currentUserId = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('user_data') || '{}').id 
        : undefined;
      return transformMessage(response.data, currentUserId);
    }
    throw new Error('Failed to send message');
  }

  // Hashtag Methods
  async getHashtagPage(tag: string, page = 1, limit = 20): Promise<Video[]> {
    const response = await this.request<ApiResponse<{ videos: ApiVideoResponse[] }>>(
      `/hashtags/${encodeURIComponent(tag)}?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data.videos) {
      return response.data.videos.map(v => transformVideo(v, v.user));
    }
    return [];
  }

  async getTrendingHashtags(limit = 20): Promise<Array<{ tag: string; views: string }>> {
    const response = await this.request<ApiResponse<Array<{ tag: string; views: string; videosCount: number }>>>(
      `/hashtags/trending?limit=${limit}`
    );
    
    if (response.success && response.data) {
      return response.data.map(h => ({ tag: h.tag, views: h.views }));
    }
    return [];
  }

  // Discovery Methods
  async getTrendingVideos(limit = 20): Promise<Video[]> {
    const response = await this.request<ApiResponse<{ videos: ApiVideoResponse[] }>>(
      `/discover/trending?limit=${limit}`
    );
    
    if (response.success && response.data.videos) {
      return response.data.videos.map(v => transformVideo(v, v.user));
    }
    return [];
  }

  async getTopCreators(limit = 20): Promise<ApiUserResponse[]> {
    const response = await this.request<ApiResponse<ApiUserResponse[]>>(
      `/discover/creators?limit=${limit}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Privacy Methods
  async getPrivacySettings(): Promise<{
    profileVisibility: string;
    allowMessages: string;
    allowComments: boolean;
    allowDuet: boolean;
    allowStitch: boolean;
    showActivityStatus: boolean;
  }> {
    const response = await this.request<ApiResponse<{
      profileVisibility: string;
      allowMessages: string;
      allowComments: boolean;
      allowDuet: boolean;
      allowStitch: boolean;
      showActivityStatus: boolean;
    }>>('/users/me/privacy-settings');
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get privacy settings');
  }

  async updatePrivacySettings(data: {
    profileVisibility?: 'public' | 'private';
    allowMessages?: 'everyone' | 'followers' | 'none';
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
    showActivityStatus?: boolean;
  }): Promise<void> {
    await this.request('/users/me/privacy-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(password: string): Promise<void> {
    await this.request('/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    this.clearToken();
    if (typeof window !== 'undefined') {
      const { wsClient } = await import('./websocket');
      wsClient.disconnect();
    }
  }

  async blockUser(username: string): Promise<void> {
    await this.request(`/users/${username}/block`, { method: 'POST' });
  }

  async unblockUser(username: string): Promise<void> {
    await this.request(`/users/${username}/block`, { method: 'DELETE' });
  }

  // Watch History Methods
  async getWatchHistory(page = 1, limit = 50): Promise<Array<{
    id: string;
    video: {
      id: string;
      thumbnail: string | null;
      title: string;
      description: string | null;
      duration: number | null;
      views: number;
      user: {
        id: string;
        username: string;
        avatar: string | null;
        isVerified: boolean;
      };
    };
    watchedDuration: number;
    watchedAt: string;
    createdAt: string;
  }>> {
    const response = await this.request<ApiResponse<{
      history: Array<{
        id: string;
        video: {
          id: string;
          thumbnail: string | null;
          title: string;
          description: string | null;
          duration: number | null;
          views: number;
          user: {
            id: string;
            username: string;
            avatar: string | null;
            isVerified: boolean;
          };
        };
        watchedDuration: number;
        watchedAt: string;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        hasMore: boolean;
      };
    }>>(`/watch-history?page=${page}&limit=${limit}`);
    
    if (response.success && response.data && response.data.history) {
      return response.data.history;
    }
    return [];
  }

  async clearWatchHistory(videoIds?: string[]): Promise<void> {
    await this.request('/watch-history', {
      method: 'DELETE',
      body: JSON.stringify({ videoIds: videoIds || [] }),
    });
  }

  async removeFromWatchHistory(videoId: string): Promise<void> {
    await this.request(`/watch-history/${videoId}`, {
      method: 'DELETE',
    });
  }

  // Sound Methods
  async getSoundById(id: string): Promise<{
    id: string;
    title: string;
    artist: string;
    artistId: string;
    artistInfo: { id: string; username: string; avatar: string | null; isVerified: boolean };
    duration: number | null;
    url: string | null;
    thumbnail: string | null;
    genre: string | null;
    tags: string[];
    totalVideos: number;
    totalViews: string;
    totalLikes: number;
    isFavorited: boolean;
    isOriginal: boolean;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.request<ApiResponse<any>>(`/sounds/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Sound not found');
  }

  async getSoundVideos(id: string, sort?: string, page = 1, limit = 20): Promise<{
    sound: { id: string; title: string };
    videos: Array<{
      id: string;
      thumbnail: string | null;
      caption: string;
      username: string;
      views: string;
      likes: number;
      duration: number | null;
    }>;
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const sortParam = sort ? `&sort=${sort}` : '';
    const response = await this.request<ApiResponse<any>>(
      `/sounds/${id}/videos?page=${page}&limit=${limit}${sortParam}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return { sound: { id, title: '' }, videos: [], pagination: { page, limit, total: 0, hasMore: false } };
  }

  async getTrendingSounds(limit = 20): Promise<{
    sounds: Array<{
      id: string;
      title: string;
      artist: string;
      duration: number | null;
      url: string | null;
      thumbnail: string | null;
      genre: string | null;
      totalVideos: number;
      totalViews: string;
      isOriginal: boolean;
      createdAt: string;
    }>;
    timeframe: string;
  }> {
    const response = await this.request<ApiResponse<any>>(`/sounds/trending?limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { sounds: [], timeframe: 'week' };
  }

  async getSounds(page = 1, limit = 20, options?: {
    sort?: string;
    genre?: string;
    search?: string;
  }): Promise<{
    sounds: Array<{
      id: string;
      title: string;
      artist: string;
      artistId: string;
      artistInfo: { id: string; username: string; avatar: string | null; isVerified: boolean };
      duration: number | null;
      url: string | null;
      thumbnail: string | null;
      genre: string | null;
      totalVideos: number;
      totalViews: string;
      isFavorited: boolean;
      isOriginal: boolean;
      createdAt: string;
    }>;
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (options?.sort) params.set('sort', options.sort);
    if (options?.genre) params.set('genre', options.genre);
    if (options?.search) params.set('search', options.search);
    const response = await this.request<ApiResponse<any>>(`/sounds?${params.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { sounds: [], pagination: { page, limit, total: 0, hasMore: false } };
  }

  async getSoundGenres(): Promise<Array<{ id: string; name: string; soundCount: number }>> {
    const response = await this.request<ApiResponse<{ genres: Array<{ id: string; name: string; soundCount: number }> }>>('/sounds/genres');
    if (response.success && response.data) {
      return response.data.genres;
    }
    return [];
  }

  async searchSounds(query: string, page = 1, limit = 20, genre?: string): Promise<{
    sounds: Array<{
      id: string;
      title: string;
      artist: string;
      artistId: string;
      duration: number | null;
      url: string | null;
      thumbnail: string | null;
      genre: string | null;
      totalVideos: number;
      totalViews: string;
      isFavorited: boolean;
      isOriginal: boolean;
      createdAt: string;
    }>;
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (genre) params.set('genre', genre);
    const response = await this.request<ApiResponse<any>>(`/sounds/search?${params.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { sounds: [], pagination: { page, limit, total: 0, hasMore: false } };
  }

  async toggleSoundFavorite(id: string): Promise<{ favorited: boolean }> {
    const response = await this.request<ApiResponse<{ favorited: boolean }>>(`/sounds/${id}/favorite`, {
      method: 'POST',
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to toggle favorite');
  }

  async getFavoriteSounds(page = 1, limit = 20): Promise<{
    sounds: Array<{
      id: string;
      title: string;
      artist: string;
      artistId: string;
      duration: number | null;
      url: string | null;
      thumbnail: string | null;
      genre: string | null;
      totalVideos: number;
      totalViews: string;
      isFavorited: boolean;
      isOriginal: boolean;
      createdAt: string;
    }>;
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const response = await this.request<ApiResponse<any>>(`/sounds/favorites?page=${page}&limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { sounds: [], pagination: { page, limit, total: 0, hasMore: false } };
  }

  // Chunked Upload Methods
  async initiateChunkedUpload(data: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    title: string;
    description?: string;
    privacy?: string;
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
  }): Promise<{ uploadId: string; chunkSize: number; totalChunks: number }> {
    const response = await this.request<ApiResponse<{ uploadId: string; chunkSize: number; totalChunks: number }>>('/uploads/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) return response.data;
    throw new Error('Failed to initiate upload');
  }

  async uploadChunk(uploadId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/uploads/${uploadId}/chunk/${chunkIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || 'Failed to upload chunk';
      throw new Error(errorMessage);
    }
  }

  async completeChunkedUpload(uploadId: string): Promise<Video> {
    const response = await this.request<ApiResponse<{ video: any }>>(`/uploads/${uploadId}/complete`, {
      method: 'POST',
    });
    if (response.success && response.data?.video) {
      return transformVideo(response.data.video, response.data.video.user);
    }
    throw new Error('Failed to complete upload');
  }

  async getUploadStatus(uploadId: string): Promise<{ uploadedChunks: number; totalChunks: number; status: string }> {
    const response = await this.request<ApiResponse<{ uploadedChunks: number; totalChunks: number; status: string }>>(`/uploads/${uploadId}/status`);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to get upload status');
  }
}

export const api = new ApiClient(API_BASE_URL);

