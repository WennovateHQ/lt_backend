import { notificationQueue } from './queue';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const notificationsService = new NotificationsService(prisma);

// Notification job types
export interface NotificationJobData {
  type: string;
  data: Record<string, any>;
}

// Process notification jobs
notificationQueue.process('create-application-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing application notification job`);
  
  await notificationsService.notifyNewApplication(
    data['projectId'],
    data['applicationId'],
    data['talentName']
  );
});

notificationQueue.process('create-application-status-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing application status notification job`);
  
  await notificationsService.notifyApplicationStatusChange(
    data['applicationId'],
    data['status']
  );
});

notificationQueue.process('create-message-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing message notification job`);
  
  await notificationsService.notifyNewMessage(
    data['senderId'],
    data['recipientId'],
    data['messagePreview']
  );
});

notificationQueue.process('create-contract-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing contract notification job`);
  
  await notificationsService.notifyContractSigned(
    data['contractId'],
    data['signerType']
  );
});

notificationQueue.process('create-milestone-submitted-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing milestone submitted notification job`);
  
  await notificationsService.notifyMilestoneSubmitted(data['milestoneId']);
});

notificationQueue.process('create-milestone-approved-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing milestone approved notification job`);
  
  await notificationsService.notifyMilestoneApproved(data['milestoneId']);
});

notificationQueue.process('create-payment-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing payment notification job`);
  
  await notificationsService.notifyPaymentReceived(
    data['paymentId'],
    data['amount']
  );
});

notificationQueue.process('create-review-notification', async (job) => {
  const { data } = job.data as NotificationJobData;
  logger.info(`Processing review notification job`);
  
  await notificationsService.notifyNewReview(data['reviewId']);
});

// Helper functions to add notification jobs to the queue
export const queueApplicationNotification = async (
  projectId: string,
  applicationId: string,
  talentName: string
) => {
  await notificationQueue.add('create-application-notification', {
    data: { projectId, applicationId, talentName }
  }, {
    priority: 5,
    delay: 0
  });
};

export const queueApplicationStatusNotification = async (
  applicationId: string,
  status: string
) => {
  await notificationQueue.add('create-application-status-notification', {
    data: { applicationId, status }
  }, {
    priority: 5,
    delay: 0
  });
};

export const queueMessageNotification = async (
  senderId: string,
  recipientId: string,
  messagePreview: string
) => {
  await notificationQueue.add('create-message-notification', {
    data: { senderId, recipientId, messagePreview }
  }, {
    priority: 4,
    delay: 0
  });
};

export const queueContractNotification = async (
  contractId: string,
  signerType: 'business' | 'talent'
) => {
  await notificationQueue.add('create-contract-notification', {
    data: { contractId, signerType }
  }, {
    priority: 7,
    delay: 0
  });
};

export const queueMilestoneSubmittedNotification = async (milestoneId: string) => {
  await notificationQueue.add('create-milestone-submitted-notification', {
    data: { milestoneId }
  }, {
    priority: 6,
    delay: 0
  });
};

export const queueMilestoneApprovedNotification = async (milestoneId: string) => {
  await notificationQueue.add('create-milestone-approved-notification', {
    data: { milestoneId }
  }, {
    priority: 6,
    delay: 0
  });
};

export const queuePaymentNotification = async (paymentId: string, amount: number) => {
  await notificationQueue.add('create-payment-notification', {
    data: { paymentId, amount }
  }, {
    priority: 8,
    delay: 0
  });
};

export const queueReviewNotification = async (reviewId: string) => {
  await notificationQueue.add('create-review-notification', {
    data: { reviewId }
  }, {
    priority: 3,
    delay: 0
  });
};
