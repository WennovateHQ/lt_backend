import Bull from 'bull';
import { logger } from '../config/logger';

// Create Redis configuration
const redisConfig: any = {
  port: parseInt(process.env['AZURE_REDIS_PORT'] || '6380'),
  host: process.env['AZURE_REDIS_HOST'] || 'localhost',
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Add optional properties
if (process.env['AZURE_REDIS_PASSWORD']) {
  redisConfig.password = process.env['AZURE_REDIS_PASSWORD'];
}

if (process.env['NODE_ENV'] === 'production') {
  redisConfig.tls = {};
}

export const emailQueue = new Bull('email processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

export const notificationQueue = new Bull('notification processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

export const matchingQueue = new Bull('matching processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// Queue event handlers
emailQueue.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`, { jobData: job.data });
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} failed`, { 
    error: err.message,
    jobData: job.data,
    stack: err.stack
  });
});

notificationQueue.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`, { jobData: job.data });
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job ${job.id} failed`, { 
    error: err.message,
    jobData: job.data,
    stack: err.stack
  });
});

matchingQueue.on('completed', (job) => {
  logger.info(`Matching job ${job.id} completed`, { jobData: job.data });
});

matchingQueue.on('failed', (job, err) => {
  logger.error(`Matching job ${job.id} failed`, { 
    error: err.message,
    jobData: job.data,
    stack: err.stack
  });
});

// Graceful shutdown
export const closeQueues = async () => {
  logger.info('Closing job queues...');
  await Promise.all([
    emailQueue.close(),
    notificationQueue.close(),
    matchingQueue.close()
  ]);
  logger.info('Job queues closed');
};

process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);
