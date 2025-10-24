import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  /**
   * Create a notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data || null,
          read: false
        }
      });

      console.log(`✉️ Notification created for user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    
    if (unreadOnly) {
      where.read = false;
    }

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.update({
      where: { 
        id: notificationId,
        userId // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.delete({
      where: {
        id: notificationId,
        userId
      }
    });
  }

  // Helper methods for specific notification types

  static async notifyEscrowFunded(talentId: string, contractId: string, amount: number) {
    return this.createNotification(
      talentId,
      'ESCROW_FUNDED',
      '💰 Escrow Funded',
      `A contract has been funded with $${amount.toFixed(2)}. Set up your payout account to receive payments.`,
      { contractId, amount }
    );
  }

  static async notifyStripeSetupRequired(talentId: string, contractId: string) {
    return this.createNotification(
      talentId,
      'STRIPE_SETUP_REQUIRED',
      '⚠️ Payout Account Required',
      'Please set up your Stripe payout account to receive payments for your work.',
      { contractId }
    );
  }

  static async notifyMilestoneSubmitted(businessId: string, milestoneId: string, contractId: string) {
    return this.createNotification(
      businessId,
      'MILESTONE_SUBMITTED',
      '📋 Milestone Submitted',
      'A milestone has been submitted for your review.',
      { milestoneId, contractId }
    );
  }

  static async notifyMilestoneApproved(talentId: string, milestoneId: string, contractId: string) {
    return this.createNotification(
      talentId,
      'MILESTONE_APPROVED',
      '✅ Milestone Approved',
      'Your milestone has been approved! Payment will be released soon.',
      { milestoneId, contractId }
    );
  }

  static async notifyMilestoneRejected(talentId: string, milestoneId: string, reason: string) {
    return this.createNotification(
      talentId,
      'MILESTONE_REJECTED',
      '❌ Milestone Needs Revision',
      `Your milestone submission needs revision: ${reason}`,
      { milestoneId }
    );
  }

  static async notifyPaymentReceived(talentId: string, amount: number, paymentId: string) {
    return this.createNotification(
      talentId,
      'PAYMENT_RECEIVED',
      '💵 Payment Received',
      `You've received a payment of $${amount.toFixed(2)}. Funds are now in your Stripe account.`,
      { paymentId, amount }
    );
  }

  static async notifyPaymentReleased(businessId: string, amount: number, talentName: string) {
    return this.createNotification(
      businessId,
      'PAYMENT_RELEASED',
      '✅ Payment Released',
      `Payment of $${amount.toFixed(2)} has been released to ${talentName}.`,
      { amount }
    );
  }
}

export default NotificationService;
