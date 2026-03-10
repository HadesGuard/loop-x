'use client';

import { io, Socket } from 'socket.io-client';

const WS_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_BASE_URL, {
      auth: {
        token: token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null),
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      // Connected
    });

    this.socket.on('disconnect', () => {
      // Disconnected
    });

    this.socket.on('connect_error', () => {
      // Connection error — will auto-retry
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Remove previous socket-level listeners to avoid duplicates on reconnect
    this.socket.removeAllListeners();

    // Connection confirmation
    this.socket.on('connection:established', () => {
      // Connection established
    });

    // Notification events - backend sends { notification: {...} }
    this.socket.on('notification:new', (data: { notification: any }) => {
      this.emit('notification:new', data.notification || data);
    });

    // Message events - backend sends { conversationId, message: {...} }
    this.socket.on('message:new', (data: { conversationId: string; message: any }) => {
      this.emit('message:new', {
        ...data.message,
        conversationId: data.conversationId,
      });
    });

    this.socket.on('typing:start', (data) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data) => {
      this.emit('typing:stop', data);
    });

    // Video processing events
    this.socket.on('video:processing:update', (data) => {
      this.emit('video:processing:update', data);
    });

    this.socket.on('video:processing:complete', (data) => {
      this.emit('video:processing:complete', data);
    });

    // Message read event
    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Presence events
    this.socket.on('presence:update', (data) => {
      this.emit('presence:update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  updateToken(newToken: string) {
    if (this.socket?.connected) {
      this.socket.auth = { token: newToken };
      this.socket.disconnect().connect();
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  sendMessage(conversationId: string, text: string) {
    if (this.socket?.connected) {
      this.socket.emit('message:send', { conversationId, text });
    }
  }

  startTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  markMessageRead(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('message:read', { conversationId });
    }
  }

  subscribeToVideo(videoId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { channel: `video:${videoId}` });
    }
  }

  unsubscribeFromVideo(videoId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { channel: `video:${videoId}` });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsClient = new WebSocketClient();

