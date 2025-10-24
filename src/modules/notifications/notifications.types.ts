import { z } from 'zod';
import { NotificationType } from '@prisma/client';

// Notification DTOs
export const CreateNotificationSchema = z.object({
  recipientId: z.string().cuid(),
  type: z.enum([
    'APPLICATION_RECEIVED',
    'APPLICATION_STATUS_CHANGED',
    'NEW_MESSAGE',
    'CONTRACT_SIGNED',
    'MILESTONE_SUBMITTED',
    'MILESTONE_APPROVED',
    'PAYMENT_RECEIVED',
    'NEW_REVIEW',
    'SYSTEM_ANNOUNCEMENT',
    'ACCOUNT_UPDATE'
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(500),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().optional()
});

export const NotificationFiltersSchema = z.object({
  type: z.enum([
    'APPLICATION_RECEIVED',
    'APPLICATION_STATUS_CHANGED',
    'NEW_MESSAGE',
    'CONTRACT_SIGNED',
    'MILESTONE_SUBMITTED',
    'MILESTONE_APPROVED',
    'PAYMENT_RECEIVED',
    'NEW_REVIEW',
    'SYSTEM_ANNOUNCEMENT',
    'ACCOUNT_UPDATE'
  ]).optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional()
});

// Type exports
export type CreateNotificationDTO = z.infer<typeof CreateNotificationSchema>;
export type NotificationFilters = z.infer<typeof NotificationFiltersSchema>;

// Response types
export interface NotificationWithDetails {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}
