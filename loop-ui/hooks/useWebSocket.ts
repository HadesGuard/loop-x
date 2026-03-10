'use client';

import { useEffect, useRef } from 'react';
import { wsClient } from '@/lib/api/websocket';
import { transformNotification, transformMessage } from '@/lib/api/transformers';
import type { Notification, Message } from '@/types/video';

interface UseWebSocketOptions {
  onNotification?: (notification: Notification) => void;
  onMessage?: (message: Message) => void;
  onTyping?: (data: { conversationId: string; username: string }) => void;
  onStopTyping?: (data: { conversationId: string }) => void;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onNotification,
    onMessage,
    onTyping,
    onStopTyping,
    enabled = true,
  } = options;

  const callbacksRef = useRef(options);
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = options;
  }, [onNotification, onMessage, onTyping, onStopTyping, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      return;
    }

    // Connect WebSocket
    wsClient.connect(token);

    // Set up event listeners
    const handleNotification = (data: any) => {
      if (callbacksRef.current.onNotification) {
        const notification = transformNotification(data);
        callbacksRef.current.onNotification(notification);
      }
    };

    const handleMessage = (data: any) => {
      if (callbacksRef.current.onMessage) {
        const currentUserId = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('user_data') || '{}').id 
          : undefined;
        const message = transformMessage(data, currentUserId);
        callbacksRef.current.onMessage(message);
      }
    };

    const handleTyping = (data: any) => {
      if (callbacksRef.current.onTyping) {
        callbacksRef.current.onTyping(data);
      }
    };

    const handleStopTyping = (data: any) => {
      if (callbacksRef.current.onStopTyping) {
        callbacksRef.current.onStopTyping(data);
      }
    };

    wsClient.on('notification:new', handleNotification);
    wsClient.on('message:new', handleMessage);
    wsClient.on('typing:start', handleTyping);
    wsClient.on('typing:stop', handleStopTyping);

    // Cleanup on unmount
    return () => {
      wsClient.off('notification:new', handleNotification);
      wsClient.off('message:new', handleMessage);
      wsClient.off('typing:start', handleTyping);
      wsClient.off('typing:stop', handleStopTyping);
    };
  }, [enabled]);

  return {
    isConnected: wsClient.isConnected(),
    sendMessage: wsClient.sendMessage.bind(wsClient),
    startTyping: wsClient.startTyping.bind(wsClient),
    stopTyping: wsClient.stopTyping.bind(wsClient),
  };
}

