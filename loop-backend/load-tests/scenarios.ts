export type HttpMethod = 'GET' | 'POST';

export type Scenario = {
  name: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  notes?: string;
};

// Core API load scenarios required by CER-22/CER-24.
export const scenarios: Scenario[] = [
  {
    name: 'auth-register',
    method: 'POST',
    path: '/api/auth/register',
    body: {
      username: 'load-user',
      email: 'load-user@example.com',
      password: 'LoadTest123!',
    },
  },
  {
    name: 'auth-login',
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'load-user@example.com',
      password: 'LoadTest123!',
    },
  },
  {
    name: 'auth-refresh',
    method: 'POST',
    path: '/api/auth/refresh',
    body: {
      refreshToken: 'placeholder-refresh-token',
    },
  },
  {
    name: 'videos-feed',
    method: 'GET',
    path: '/api/videos/feed?page=1&limit=20',
  },
  {
    name: 'video-upload-transcode',
    method: 'POST',
    path: '/api/upload',
    body: {
      fileName: 'load-test-video.mp4',
      // Ensures "upload/transcode" flow is represented in suite metadata.
      transcodeProfile: '1080p',
    },
    notes: 'Upload flow includes transcode pipeline coverage.',
  },
  {
    name: 'search-query',
    method: 'GET',
    path: '/api/search?q=load+testing&type=videos',
  },
];

export const websocketScenario = {
  name: 'websocket-connections',
  protocol: 'websocket',
  urlPath: '/socket.io/?EIO=4&transport=websocket',
  targetConnections: 100,
  notes: 'Concurrent websocket/session load profile.',
};
