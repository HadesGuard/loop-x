import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { formatDistanceToNow, format } from 'date-fns';

export class MessagingService {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    // Get all conversations where user is a participant
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              include: {
                sender: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    });

    // Format conversations
    const conversations = participants.map((participant) => {
      const otherParticipant = participant.conversation.participants.find(
        (p) => p.userId !== userId
      );
      const lastMessage = participant.conversation.messages[0];

      return {
        id: participant.conversation.id,
        username: otherParticipant ? `@${otherParticipant.user.username}` : null,
        user: otherParticipant
          ? {
              id: otherParticipant.user.id,
              username: `@${otherParticipant.user.username}`,
              avatar: otherParticipant.user.avatarUrl || null,
            }
          : null,
        lastMessage: lastMessage ? lastMessage.text : null,
        timestamp: lastMessage
          ? formatDistanceToNow(lastMessage.createdAt, { addSuffix: true })
          : 'Just now',
        unread: participant.unreadCount,
        updatedAt: participant.conversation.updatedAt.toISOString(),
      };
    });

    return { conversations };
  }

  /**
   * Create or get existing conversation with a user
   */
  async createOrGetConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new AppError('Cannot create conversation with yourself', 400, 'INVALID_USER');
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    if (!otherUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!otherUser.isActive) {
      throw new AppError('User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Check if conversation already exists
    const existingConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId, otherUserId],
            },
          },
        },
      },
      include: {
        participants: {
          where: {
            userId: {
              in: [userId, otherUserId],
            },
          },
        },
      },
    });

    // Find conversation with exactly 2 participants (direct message)
    let conversation = existingConversations.find(
      (conv) => conv.participants.length === 2
    );

    if (conversation) {
      // Return existing conversation
      return {
        id: conversation.id,
        username: `@${otherUser.username}`,
        user: {
          id: otherUser.id,
          username: `@${otherUser.username}`,
          avatar: otherUser.avatarUrl || null,
        },
        lastMessage: null,
        timestamp: 'Just now',
        unread: 0,
        createdAt: conversation.createdAt.toISOString(),
      };
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            {
              userId,
            },
            {
              userId: otherUserId,
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    return {
      id: newConversation.id,
      username: `@${otherUser.username}`,
      user: {
        id: otherUser.id,
        username: `@${otherUser.username}`,
        avatar: otherUser.avatarUrl || null,
      },
      lastMessage: null,
      timestamp: 'Just now',
      unread: 0,
      createdAt: newConversation.createdAt.toISOString(),
    };
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options: {
      page?: number;
      limit?: number;
      before?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, before } = options;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Build where clause
    const where: any = {
      conversationId,
    };

    if (before) {
      where.id = {
        lt: before,
      };
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      skip: before ? 0 : (page - 1) * limit,
    });

    const hasMore = messages.length > limit;
    const messagesToReturn = messages.slice(0, limit).reverse(); // Reverse to get chronological order

    // Format messages
    const formattedMessages = messagesToReturn.map((message) => ({
      id: message.id,
      sender: `@${message.sender.username}`,
      senderId: message.sender.id,
      text: message.text,
      timestamp: format(message.createdAt, 'h:mm a'),
      isMine: message.senderId === userId,
      createdAt: message.createdAt.toISOString(),
    }));

    return {
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(userId: string, conversationId: string, text: string) {
    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Validate message text
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length === 0) {
      throw new AppError('Message text is required', 400, 'INVALID_MESSAGE');
    }

    if (trimmedText.length > 5000) {
      throw new AppError('Message is too long (max 5000 characters)', 400, 'MESSAGE_TOO_LONG');
    }

    // Create message and update conversation
    const message = await prisma.$transaction(async (tx) => {
      // Create message
      const newMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          text: trimmedText,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
        },
      });

      // Increment unread count for other participants
      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: {
            not: userId,
          },
        },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      });

      return newMessage;
    });

    return {
      id: message.id,
      sender: `@${message.sender.username}`,
      text: message.text,
      timestamp: format(message.createdAt, 'h:mm a'),
      isMine: true,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(userId: string, conversationId: string) {
    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Update unread count and last read timestamp
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    logger.info(`Conversation ${conversationId} marked as read by user ${userId}`);
  }
}

export const messagingService = new MessagingService();

