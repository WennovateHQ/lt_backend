import { z } from 'zod';
import { MessageStatus } from '@prisma/client';

// Message DTOs
export const CreateMessageSchema = z.object({
  recipientId: z.string().cuid(),
  content: z.string().min(1, 'Message content is required'),
  subject: z.string().optional(),
  projectId: z.string().cuid().optional(),
  contractId: z.string().cuid().optional(),
  attachments: z.array(z.string()).optional()
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  subject: z.string().optional()
});

export const MessageFiltersSchema = z.object({
  status: z.enum(['SENT', 'READ']).optional(),
  projectId: z.string().cuid().optional(),
  contractId: z.string().cuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const SearchMessagesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().int().positive().max(50).optional().default(20)
});

// Type exports
export type CreateMessageDTO = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageDTO = z.infer<typeof UpdateMessageSchema>;
export type MessageFilters = z.infer<typeof MessageFiltersSchema>;
export type SearchMessagesDTO = z.infer<typeof SearchMessagesSchema>;

// Response types
export interface MessageWithDetails {
  id: string;
  content: string;
  subject?: string;
  status: MessageStatus;
  attachments?: string[];
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  recipient: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  project?: {
    id: string;
    title: string;
  };
  contract?: {
    id: string;
    title: string;
  };
}

export interface ConversationSummary {
  otherUser: {
    id: string;
    email: string;
    userType: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
      companyName?: string;
      title?: string;
    };
  };
  lastMessage: {
    id: string;
    content: string;
    subject?: string;
    status: MessageStatus;
    createdAt: Date;
    senderId: string;
    project?: {
      id: string;
      title: string;
    };
    contract?: {
      id: string;
      title: string;
    };
  };
  unreadCount: number;
  lastMessageAt: Date;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  unreadCount: number;
}
