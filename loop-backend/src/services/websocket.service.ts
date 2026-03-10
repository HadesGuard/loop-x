import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { messagingService } from './messaging.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface TypingUsers {
  [conversationId: string]: Set<string>;
}

export class WebSocketService {
  private io: SocketIOServer;
  private typingUsers: TypingUsers = {};
  private onlineUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/socket.io',
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token || typeof token !== 'string') {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = verifyAccessToken(token);
        socket.userId = decoded.userId;
        socket.username = decoded.username;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      const username = socket.username!;

      logger.info(`WebSocket client connected: ${userId} (${username})`);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Send connection confirmation
      socket.emit('connection:established', {
        userId,
        serverTime: new Date().toISOString(),
      });

      // Track presence
      this.onlineUsers.set(userId, socket.id);
      this.io.to(`user:${userId}`).emit('presence:update', {
        userId,
        status: 'online',
      });

      /**
       * Handle message:read event
       */
      socket.on('message:read', async (data: { conversationId: string }) => {
        try {
          const { conversationId } = data;

          if (!conversationId) {
            return;
          }

          // Get conversation participants and notify others
          const participants = await this.getConversationParticipants(conversationId);
          participants
            .filter((p) => p !== userId)
            .forEach((participantId) => {
              this.io.to(`user:${participantId}`).emit('message:read', {
                conversationId,
                userId,
              });
            });
        } catch (error) {
          logger.error('Error handling message:read:', error);
        }
      });

      /**
       * Handle message:send event
       */
      socket.on('message:send', async (data: { conversationId: string; text: string; requestId?: string }) => {
        try {
          const { conversationId, text, requestId } = data;

          if (!conversationId || !text) {
            socket.emit('error', {
              code: 'INVALID_PAYLOAD',
              message: 'conversationId and text are required',
              requestId,
            });
            return;
          }

          // Send message via service
          const message = await messagingService.sendMessage(userId, conversationId, text);

          // Format message for real-time
          const formattedMessage = {
            id: message.id,
            sender: message.sender,
            senderId: userId,
            text: message.text,
            timestamp: message.timestamp,
            isMine: true,
            createdAt: message.createdAt,
          };

          // Send confirmation to sender
          socket.emit('message:sent', {
            message: formattedMessage,
            requestId,
          });

          // Get conversation participants
          const participants = await this.getConversationParticipants(conversationId);

          // Send message to other participants
          participants
            .filter((p) => p !== userId)
            .forEach((participantId) => {
              this.io.to(`user:${participantId}`).emit('message:new', {
                conversationId,
                message: {
                  ...formattedMessage,
                  isMine: false,
                },
              });
            });

          logger.info(`Message sent: ${message.id} in conversation ${conversationId}`);
        } catch (error: unknown) {
          logger.error('Error sending message via WebSocket:', error);
          const err = error as { code?: string; message?: string };
          socket.emit('error', {
            code: err.code || 'MESSAGE_SEND_ERROR',
            message: err.message || 'Failed to send message',
            requestId: data.requestId,
          });
        }
      });

      /**
       * Handle typing:start event
       */
      socket.on('typing:start', (data: { conversationId: string }) => {
        try {
          const { conversationId } = data;

          if (!conversationId) {
            return;
          }

          // Track typing user
          if (!this.typingUsers[conversationId]) {
            this.typingUsers[conversationId] = new Set();
          }
          this.typingUsers[conversationId].add(userId);

          // Get conversation participants
          this.getConversationParticipants(conversationId).then((participants) => {
            // Notify other participants
            participants
              .filter((p) => p !== userId)
              .forEach((participantId) => {
                this.io.to(`user:${participantId}`).emit('typing:start', {
                  conversationId,
                  userId,
                  username: `@${username}`,
                });
              });
          });
        } catch (error) {
          logger.error('Error handling typing:start:', error);
        }
      });

      /**
       * Handle typing:stop event
       */
      socket.on('typing:stop', (data: { conversationId: string }) => {
        try {
          const { conversationId } = data;

          if (!conversationId) {
            return;
          }

          // Remove typing user
          if (this.typingUsers[conversationId]) {
            this.typingUsers[conversationId].delete(userId);
            if (this.typingUsers[conversationId].size === 0) {
              delete this.typingUsers[conversationId];
            }
          }

          // Get conversation participants
          this.getConversationParticipants(conversationId).then((participants) => {
            // Notify other participants
            participants
              .filter((p) => p !== userId)
              .forEach((participantId) => {
                this.io.to(`user:${participantId}`).emit('typing:stop', {
                  conversationId,
                  userId,
                });
              });
          });
        } catch (error) {
          logger.error('Error handling typing:stop:', error);
        }
      });

      /**
       * Handle subscribe event
       */
      socket.on('subscribe', (data: { channel: string; conversationId?: string }) => {
        try {
          const { channel, conversationId } = data;

          if (channel === 'messages' || channel.startsWith('messages:')) {
            // Subscribe to messages channel
            if (conversationId) {
              socket.join(`messages:${conversationId}`);
            } else {
              // Already subscribed to user room
            }
          } else if (channel.startsWith('user:')) {
            socket.join(channel);
          } else if (channel.startsWith('video:')) {
            socket.join(channel);
          }

          socket.emit('subscribed', {
            channel,
            success: true,
          });
        } catch (error) {
          logger.error('Error handling subscribe:', error);
          socket.emit('error', {
            code: 'SUBSCRIBE_ERROR',
            message: 'Failed to subscribe',
          });
        }
      });

      /**
       * Handle unsubscribe event
       */
      socket.on('unsubscribe', (data: { channel: string }) => {
        try {
          const { channel } = data;
          socket.leave(channel);

          socket.emit('unsubscribed', {
            channel,
            success: true,
          });
        } catch (error) {
          logger.error('Error handling unsubscribe:', error);
        }
      });

      /**
       * Handle ping (heartbeat)
       */
      socket.on('ping', () => {
        socket.emit('pong', {
          timestamp: new Date().toISOString(),
        });
      });

      /**
       * Handle disconnect
       */
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${userId} (${username})`);

        // Emit offline presence
        this.onlineUsers.delete(userId);
        this.io.to(`user:${userId}`).emit('presence:update', {
          userId,
          status: 'offline',
        });

        // Clean up typing indicators
        Object.keys(this.typingUsers).forEach((conversationId) => {
          if (this.typingUsers[conversationId].has(userId)) {
            this.typingUsers[conversationId].delete(userId);
            if (this.typingUsers[conversationId].size === 0) {
              delete this.typingUsers[conversationId];
            }
          }
        });
      });
    });
  }

  /**
   * Get conversation participants
   */
  private async getConversationParticipants(conversationId: string): Promise<string[]> {
    const { prisma } = await import('../config/database');
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Emit notification to user
   */
  emitNotification(userId: string, notification: Record<string, unknown>) {
    this.io.to(`user:${userId}`).emit('notification:new', {
      notification,
    });
  }

  /**
   * Emit an event to a specific user's room
   */
  emitToUser(userId: string, event: string, data: unknown) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit video processing progress update
   */
  emitVideoProcessingUpdate(userId: string, videoId: string, stage: string, progress: number) {
    this.io.to(`user:${userId}`).emit('video:processing:update', {
      videoId,
      stage,
      progress,
    });
  }

  /**
   * Emit video processing complete
   */
  emitVideoProcessingComplete(userId: string, videoId: string, data: Record<string, unknown>) {
    this.io.to(`user:${userId}`).emit('video:processing:complete', {
      videoId,
      ...data,
    });
  }
}

// Global WebSocket service instance (will be set in server.ts)
let globalWebSocketService: WebSocketService | null = null;

export function setWebSocketService(service: WebSocketService) {
  globalWebSocketService = service;
}

export function getWebSocketService(): WebSocketService | null {
  return globalWebSocketService;
}

