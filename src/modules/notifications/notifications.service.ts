import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../shared/utils/app-error';
import { CreateNotificationDTO, NotificationFilters } from './notifications.types';

export class NotificationsService {
  constructor(private prisma: PrismaClient) {}

  async createNotification(data: CreateNotificationDTO) {
    // Verify the recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: data.recipientId }
    });

    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.recipientId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {}
      }
    });

    return notification;
  }

  async getNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check if user has access to this notification
    if (notification.userId !== userId) {
      throw new ForbiddenError('Access denied to this notification');
    }

    return notification;
  }

  async getMyNotifications(userId: string, filters: NotificationFilters = {}) {
    const where: any = {
      userId: userId
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isRead !== undefined) {
      where.read = filters.isRead;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });

    return notifications;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    // Check if notification exists and belongs to user
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (notification.read) {
      return notification;
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { 
        read: true,
        readAt: new Date()
      }
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId: userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    // Check if notification exists and belongs to user
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId }
    });

    return { success: true };
  }

  async getNotificationStats(userId: string) {
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({
        where: { userId: userId },
      }),
      this.prisma.notification.count({
        where: { 
          userId: userId,
          read: false
        }
      })
    ]);

    return {
      total,
      unread,
      read: total - unread
    };
  }

  // Helper methods for creating specific notification types
  async notifyNewApplication(projectId: string, applicationId: string, talentName: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { business: true }
    });

    if (!project) return;

    await this.createNotification({
      recipientId: project.businessId,
      type: 'APPLICATION_RECEIVED',
      title: 'New Application Received',
      message: `${talentName} has applied to your project "${project.title}"`,
      data: { projectId, applicationId },
      actionUrl: `/dashboard/projects/${projectId}/applications`
    });
  }

  async notifyApplicationStatusChange(applicationId: string, status: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { 
        project: true,
        talent: { include: { profile: true } }
      }
    });

    if (!application) return;

    const statusMessages = {
      'ACCEPTED': 'Your application has been accepted!',
      'REJECTED': 'Your application was not selected this time.',
      'WITHDRAWN': 'Application has been withdrawn.'
    };

    await this.createNotification({
      recipientId: application.talentId,
      type: 'APPLICATION_STATUS_CHANGED',
      title: 'Application Status Update',
      message: `${statusMessages[status as keyof typeof statusMessages]} - ${application.project.title}`,
      data: { applicationId, projectId: application.projectId, status },
      actionUrl: `/dashboard/applications/${applicationId}`
    });
  }

  async notifyNewMessage(senderId: string, recipientId: string, messagePreview: string) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true }
    });

    if (!sender) return;

    const senderName = `${sender.profile?.firstName || 'Someone'} ${sender.profile?.lastName || ''}`.trim();

    await this.createNotification({
      recipientId,
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      data: { senderId },
      actionUrl: `/dashboard/messages`
    });
  }

  async notifyContractSigned(contractId: string, signerType: 'business' | 'talent') {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        business: { include: { profile: true } },
        talent: { include: { profile: true } }
      }
    });

    if (!contract) return;

    const recipientId = signerType === 'business' ? contract.talentId : contract.businessId;
    const signerName = signerType === 'business' 
      ? `${contract.business.profile?.firstName || ''} ${contract.business.profile?.lastName || ''}`.trim()
      : `${contract.talent.profile?.firstName || ''} ${contract.talent.profile?.lastName || ''}`.trim();

    await this.createNotification({
      recipientId,
      type: 'CONTRACT_SIGNED',
      title: 'Contract Signed',
      message: `${signerName} has signed the contract for "${contract.title}"`,
      data: { contractId },
      actionUrl: `/dashboard/contracts/${contractId}`
    });
  }

  async notifyMilestoneSubmitted(milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        contract: {
          include: {
            talent: { include: { profile: true } }
          }
        }
      }
    });

    if (!milestone) return;

    const talentName = `${milestone.contract.talent.profile?.firstName || ''} ${milestone.contract.talent.profile?.lastName || ''}`.trim();

    await this.createNotification({
      recipientId: milestone.contract.businessId,
      type: 'MILESTONE_SUBMITTED',
      title: 'Milestone Submitted',
      message: `${talentName} has submitted milestone "${milestone.title}" for review`,
      data: { milestoneId, contractId: milestone.contractId },
      actionUrl: `/dashboard/contracts/${milestone.contractId}`
    });
  }

  async notifyMilestoneApproved(milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        contract: {
          include: {
            business: { include: { profile: true } }
          }
        }
      }
    });

    if (!milestone) return;

    const businessName = `${milestone.contract.business.profile?.firstName || ''} ${milestone.contract.business.profile?.lastName || ''}`.trim();

    await this.createNotification({
      recipientId: milestone.contract.talentId,
      type: 'MILESTONE_APPROVED',
      title: 'Milestone Approved',
      message: `${businessName} has approved milestone "${milestone.title}"`,
      data: { milestoneId, contractId: milestone.contractId },
      actionUrl: `/dashboard/contracts/${milestone.contractId}`
    });
  }

  async notifyPaymentReceived(paymentId: string, amount: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            business: { include: { profile: true } }
          }
        }
      }
    });

    if (!payment) return;

    await this.createNotification({
      recipientId: payment.contract.talentId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `You have received a payment of $${amount.toFixed(2)} for "${payment.contract.title}"`,
      data: { paymentId, contractId: payment.contractId },
      actionUrl: `/dashboard/payments`
    });
  }

  async notifyNewReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: { include: { profile: true } },
        contract: true
      }
    });

    if (!review) return;

    const reviewerName = `${review.reviewer.profile?.firstName || ''} ${review.reviewer.profile?.lastName || ''}`.trim();

    await this.createNotification({
      recipientId: review.revieweeId,
      type: 'NEW_REVIEW',
      title: 'New Review Received',
      message: `${reviewerName} has left you a ${review.overallRating}-star review for "${review.contract.title}"`,
      data: { reviewId, contractId: review.contractId },
      actionUrl: `/dashboard/reviews`
    });
  }
}
