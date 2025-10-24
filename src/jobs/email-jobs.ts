import { emailQueue } from './queue';
import { EmailService } from '../shared/services/email.service';
import { logger } from '../config/logger';

const emailService = new EmailService();

// Email job types
export interface EmailJobData {
  type: string;
  to: string;
  data: Record<string, any>;
}

// Process email jobs
emailQueue.process('send-verification-email', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing verification email job for ${to}`);
  
  await emailService.sendVerificationEmail(to, data['token'], data['firstName']);
});

emailQueue.process('send-password-reset-email', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing password reset email job for ${to}`);
  
  await emailService.sendPasswordResetEmail(to, data['token'], data['firstName']);
});

emailQueue.process('send-application-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing application notification email job for ${to}`);
  
  await emailService.sendApplicationNotification(
    to,
    data['projectTitle'],
    data['talentName'],
    data['businessName']
  );
});

emailQueue.process('send-application-status-email', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing application status email job for ${to}`);
  
  await emailService.sendApplicationStatusEmail(
    to,
    data['projectTitle'],
    data['status'],
    data['talentName']
  );
});

emailQueue.process('send-contract-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing contract notification email job for ${to}`);
  
  await emailService.sendContractNotification(
    to,
    data['contractTitle'],
    data['actionType'],
    data['recipientName']
  );
});

emailQueue.process('send-milestone-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing milestone notification email job for ${to}`);
  
  await emailService.sendMilestoneNotification(
    to,
    data['milestoneTitle'],
    data['contractTitle'],
    data['actionType'],
    data['recipientName']
  );
});

emailQueue.process('send-payment-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing payment notification email job for ${to}`);
  
  await emailService.sendPaymentNotification(
    to,
    data['amount'],
    data['contractTitle'],
    data['recipientName']
  );
});

emailQueue.process('send-review-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing review notification email job for ${to}`);
  
  await emailService.sendReviewNotification(
    to,
    data['rating'],
    data['contractTitle'],
    data['reviewerName'],
    data['recipientName']
  );
});

emailQueue.process('send-message-notification', async (job) => {
  const { to, data } = job.data as EmailJobData;
  logger.info(`Processing message notification email job for ${to}`);
  
  await emailService.sendMessageNotification(
    to,
    data['senderName'],
    data['messagePreview'],
    data['recipientName']
  );
});

// Helper functions to add jobs to the queue
export const queueVerificationEmail = async (email: string, token: string, firstName: string) => {
  await emailQueue.add('send-verification-email', {
    to: email,
    data: { token, firstName }
  }, {
    priority: 10, // High priority
    delay: 0
  });
};

export const queuePasswordResetEmail = async (email: string, token: string, firstName: string) => {
  await emailQueue.add('send-password-reset-email', {
    to: email,
    data: { token, firstName }
  }, {
    priority: 10, // High priority
    delay: 0
  });
};

export const queueApplicationNotification = async (
  businessEmail: string,
  projectTitle: string,
  talentName: string,
  businessName: string
) => {
  await emailQueue.add('send-application-notification', {
    to: businessEmail,
    data: { projectTitle, talentName, businessName }
  }, {
    priority: 5, // Medium priority
    delay: 0
  });
};

export const queueApplicationStatusEmail = async (
  talentEmail: string,
  projectTitle: string,
  status: string,
  talentName: string
) => {
  await emailQueue.add('send-application-status-email', {
    to: talentEmail,
    data: { projectTitle, status, talentName }
  }, {
    priority: 5, // Medium priority
    delay: 0
  });
};

export const queueContractNotification = async (
  email: string,
  contractTitle: string,
  actionType: string,
  recipientName: string
) => {
  await emailQueue.add('send-contract-notification', {
    to: email,
    data: { contractTitle, actionType, recipientName }
  }, {
    priority: 7, // High-medium priority
    delay: 0
  });
};

export const queueMilestoneNotification = async (
  email: string,
  milestoneTitle: string,
  contractTitle: string,
  actionType: string,
  recipientName: string
) => {
  await emailQueue.add('send-milestone-notification', {
    to: email,
    data: { milestoneTitle, contractTitle, actionType, recipientName }
  }, {
    priority: 6, // Medium-high priority
    delay: 0
  });
};

export const queuePaymentNotification = async (
  email: string,
  amount: number,
  contractTitle: string,
  recipientName: string
) => {
  await emailQueue.add('send-payment-notification', {
    to: email,
    data: { amount, contractTitle, recipientName }
  }, {
    priority: 8, // High priority
    delay: 0
  });
};

export const queueReviewNotification = async (
  email: string,
  rating: number,
  contractTitle: string,
  reviewerName: string,
  recipientName: string
) => {
  await emailQueue.add('send-review-notification', {
    to: email,
    data: { rating, contractTitle, reviewerName, recipientName }
  }, {
    priority: 3, // Lower priority
    delay: 0
  });
};

export const queueMessageNotification = async (
  email: string,
  senderName: string,
  messagePreview: string,
  recipientName: string
) => {
  await emailQueue.add('send-message-notification', {
    to: email,
    data: { senderName, messagePreview, recipientName }
  }, {
    priority: 4, // Lower-medium priority
    delay: 300000 // 5 minute delay to batch messages
  });
};
