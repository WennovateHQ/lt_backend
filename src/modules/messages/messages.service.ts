import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../shared/utils/app-error';
import { CreateMessageDTO, MessageFilters } from './messages.types';

export class MessagesService {
  constructor(private prisma: PrismaClient) {}

  async sendMessage(data: CreateMessageDTO, senderId: string) {
    // Verify the recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: data.recipientId }
    });

    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    // If projectId is provided, verify sender has access to the project
    if (data.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: data.projectId,
          OR: [
            { businessId: senderId },
            { applications: { some: { talentId: senderId } } }
          ]
        }
      });

      if (!project) {
        throw new ForbiddenError('Access denied to this project');
      }
    }

    // If contractId is provided, verify sender has access to the contract
    if (data.contractId) {
      const contract = await this.prisma.contract.findFirst({
        where: {
          id: data.contractId,
          OR: [
            { businessId: senderId },
            { talentId: senderId }
          ]
        }
      });

      if (!contract) {
        throw new ForbiddenError('Access denied to this contract');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: data.recipientId,  // Map recipientId to receiverId
        content: data.content,
        // subject field removed - doesn't exist in Message schema
        projectId: data.projectId,
        contractId: data.contractId,
        attachments: data.attachments,
        status: 'SENT'
      },
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {  // Changed from recipient to receiver
          include: { profile: true }
        },
        // project removed - use projectId field instead
        contract: {
          select: { id: true, title: true }
        }
      }
    });

    return message;
  }

  async getMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        },
        contract: {
          select: { id: true, title: true }
        }
      }
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user has access to this message
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenError('Access denied to this message');
    }

    // Mark as read if user is the recipient
    if (message.receiverId === userId && message.status === 'SENT') {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });
      message.status = 'READ';
      message.readAt = new Date();
    }

    return message;
  }

  async getConversation(userId: string, otherUserId: string, _projectId?: string, _contractId?: string) {
    const where: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    };

    if (_projectId) {
      where.projectId = _projectId;
    }

    if (_contractId) {
      where.contractId = _contractId;
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        },
        contract: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark unread messages as read for the current user
    const unreadMessageIds = messages
      .filter(msg => msg.receiverId === userId && msg.status === 'SENT')
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await this.prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });
    }

    return messages;
  }

  async getMyMessages(userId: string, filters: MessageFilters = {}) {
    const where: any = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.contractId) {
      where.contractId = filters.contractId;
    }

    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: 'insensitive' } }
        // subject field removed - doesn't exist in Message schema
      ];
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        },
        contract: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });

    return messages;
  }

  async getConversations(userId: string) {
    // Get unique conversations (grouped by other participant)
    const conversations = await this.prisma.$queryRaw`
      SELECT DISTINCT
        CASE 
          WHEN sender_id = ${userId} THEN recipient_id
          ELSE sender_id
        END as other_user_id,
        MAX(created_at) as last_message_at,
        COUNT(CASE WHEN recipient_id = ${userId} AND status = 'SENT' THEN 1 END) as unread_count
      FROM "Message"
      WHERE sender_id = ${userId} OR recipient_id = ${userId}
      GROUP BY other_user_id
      ORDER BY last_message_at DESC
    ` as Array<{
      other_user_id: string;
      last_message_at: Date;
      unread_count: bigint;
    }>;

    // Get user details for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = await this.prisma.user.findUnique({
          where: { id: conv.other_user_id },
          include: { profile: true }
        });

        // Get the last message
        const lastMessage = await this.prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: conv.other_user_id },
              { senderId: conv.other_user_id, receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: {
            project: { select: { id: true, title: true } },
            contract: { select: { id: true, title: true } }
          }
        });

        return {
          otherUser,
          lastMessage,
          unreadCount: Number(conv.unread_count),
          lastMessageAt: conv.last_message_at
        };
      })
    );

    return conversationsWithDetails;
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only recipient can mark as read
    if (message.receiverId !== userId) {
      throw new ForbiddenError('Can only mark your own messages as read');
    }

    if (message.status === 'READ') {
      return message;
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { 
        status: 'READ',
        readAt: new Date()
      },
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        }
      }
    });

    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only sender can delete messages
    if (message.senderId !== userId) {
      throw new ForbiddenError('Can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: { id: messageId }
    });

    return { success: true };
  }

  async getMessageStats(userId: string) {
    const [totalSent, totalReceived, unreadCount] = await Promise.all([
      this.prisma.message.count({
        where: { senderId: userId }
      }),
      this.prisma.message.count({
        where: { receiverId: userId }
      }),
      this.prisma.message.count({
        where: { 
          receiverId: userId,
          status: 'SENT'
        }
      })
    ]);

    return {
      totalSent,
      totalReceived,
      unreadCount
    };
  }

  async searchMessages(userId: string, query: string, limit: number = 20) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ],
        AND: {
          OR: [
            { content: { contains: query, mode: 'insensitive' } }
            // subject field removed - doesn't exist in Message schema
          ]
        }
      },
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        },
        contract: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return messages;
  }

  // Send typing indicator (for real-time features)
  async sendTypingIndicator(_conversationId: string, _userId: string) {
    // In a real implementation, this would:
    // 1. Validate the conversation exists and user has access
    // 2. Emit a WebSocket event to other participants
    // 3. Track typing state with TTL
    
    // For now, return success
    return { success: true };
  }
}
