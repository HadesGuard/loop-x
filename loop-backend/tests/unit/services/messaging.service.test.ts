import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../../src/middleware/error.middleware';

// Mock prisma
vi.mock('../../../src/config/database', () => ({
  prisma: {
    conversationParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('2 hours ago'),
  format: vi.fn().mockReturnValue('3:30 PM'),
}));

import { MessagingService } from '../../../src/services/messaging.service';
import { prisma } from '../../../src/config/database';

const mockPrisma = vi.mocked(prisma);
const messagingService = new MessagingService();

describe('MessagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should return formatted conversations', async () => {
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        {
          conversation: {
            id: 'conv-1',
            updatedAt: new Date('2024-01-01'),
            participants: [
              { userId: 'user-1', user: { id: 'user-1', username: 'me', avatarUrl: null } },
              { userId: 'user-2', user: { id: 'user-2', username: 'other', avatarUrl: 'avatar.jpg' } },
            ],
            messages: [
              {
                text: 'Hello!',
                createdAt: new Date('2024-01-01'),
                sender: { username: 'other' },
              },
            ],
          },
        },
      ] as any);

      const result = await messagingService.getConversations('user-1');

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0]).toEqual(
        expect.objectContaining({
          id: 'conv-1',
          username: '@other',
          lastMessage: 'Hello!',
          unread: undefined, // unreadCount from participant
        })
      );
    });

    it('should return empty array when no conversations', async () => {
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);

      const result = await messagingService.getConversations('user-1');
      expect(result.conversations).toHaveLength(0);
    });
  });

  describe('createOrGetConversation', () => {
    it('should throw when trying to message yourself', async () => {
      await expect(
        messagingService.createOrGetConversation('user-1', 'user-1')
      ).rejects.toThrow(AppError);
    });

    it('should throw when other user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.createOrGetConversation('user-1', 'user-2')
      ).rejects.toThrow(AppError);
    });

    it('should throw when other user is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        username: 'other',
        avatarUrl: null,
        isActive: false,
      } as any);

      await expect(
        messagingService.createOrGetConversation('user-1', 'user-2')
      ).rejects.toThrow(AppError);
    });

    it('should return existing conversation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        username: 'other',
        avatarUrl: 'avatar.jpg',
        isActive: true,
      } as any);

      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          createdAt: new Date('2024-01-01'),
          participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
        },
      ] as any);

      const result = await messagingService.createOrGetConversation('user-1', 'user-2');

      expect(result.id).toBe('conv-1');
      expect(result.username).toBe('@other');
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if none exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        username: 'other',
        avatarUrl: null,
        isActive: true,
      } as any);

      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-new',
        createdAt: new Date('2024-01-01'),
        participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
      } as any);

      const result = await messagingService.createOrGetConversation('user-1', 'user-2');

      expect(result.id).toBe('conv-new');
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should throw if user is not a participant', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.getMessages('user-1', 'conv-1')
      ).rejects.toThrow(AppError);
    });

    it('should return paginated messages', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      } as any);

      mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          text: 'Hello',
          senderId: 'user-2',
          createdAt: new Date('2024-01-01'),
          sender: { id: 'user-2', username: 'other' },
        },
      ] as any);

      const result = await messagingService.getMessages('user-1', 'conv-1');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(
        expect.objectContaining({
          id: 'msg-1',
          text: 'Hello',
          isMine: false,
        })
      );
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should throw if user is not a participant', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.sendMessage('user-1', 'conv-1', 'Hello')
      ).rejects.toThrow(AppError);
    });

    it('should throw if message is empty', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      } as any);

      await expect(
        messagingService.sendMessage('user-1', 'conv-1', '   ')
      ).rejects.toThrow(AppError);
    });

    it('should throw if message is too long', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      } as any);

      const longMessage = 'a'.repeat(5001);
      await expect(
        messagingService.sendMessage('user-1', 'conv-1', longMessage)
      ).rejects.toThrow(AppError);
    });

    it('should send message via transaction', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      } as any);

      const mockMessage = {
        id: 'msg-new',
        text: 'Hello!',
        senderId: 'user-1',
        createdAt: new Date('2024-01-01'),
        sender: { id: 'user-1', username: 'me' },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          message: { create: vi.fn().mockResolvedValue(mockMessage) },
          conversation: { update: vi.fn().mockResolvedValue({}) },
          conversationParticipant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return callback(tx);
      });

      const result = await messagingService.sendMessage('user-1', 'conv-1', 'Hello!');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'msg-new',
          text: 'Hello!',
          isMine: true,
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should throw if user is not a participant', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.markAsRead('user-1', 'conv-1')
      ).rejects.toThrow(AppError);
    });

    it('should reset unread count', async () => {
      mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      } as any);
      mockPrisma.conversationParticipant.update.mockResolvedValue({} as any);

      await messagingService.markAsRead('user-1', 'conv-1');

      expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unreadCount: 0,
          }),
        })
      );
    });
  });
});
