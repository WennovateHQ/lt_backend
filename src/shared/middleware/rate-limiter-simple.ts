import rateLimit from 'express-rate-limit';
import { isDevelopment } from '@/config/env';
import { Request, Response } from 'express';

// Simple rate limit handler
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60,
  });
};

// Create a simple rate limiter factory
const createSimpleLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max: isDevelopment ? max * 10 : max, // More lenient in development
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
};

// General API rate limiter
export const apiLimiter = createSimpleLimiter(15 * 60 * 1000, 100); // 15 minutes, 100 requests

// Authentication rate limiter (stricter)
export const authLimiter = createSimpleLimiter(15 * 60 * 1000, 5); // 15 minutes, 5 requests

// Registration rate limiter (very strict)
export const registrationLimiter = createSimpleLimiter(60 * 60 * 1000, 3); // 1 hour, 3 requests

// Password reset rate limiter
export const passwordResetLimiter = createSimpleLimiter(60 * 60 * 1000, 5); // 1 hour, 5 requests

// File upload rate limiter
export const uploadLimiter = createSimpleLimiter(15 * 60 * 1000, 20); // 15 minutes, 20 uploads

// Project creation rate limiter
export const projectCreationLimiter = createSimpleLimiter(60 * 60 * 1000, 10); // 1 hour, 10 projects

// Application submission rate limiter
export const applicationLimiter = createSimpleLimiter(60 * 60 * 1000, 20); // 1 hour, 20 applications

// Message sending rate limiter
export const messageLimiter = createSimpleLimiter(15 * 60 * 1000, 50); // 15 minutes, 50 messages

// Search rate limiter
export const searchLimiter = createSimpleLimiter(60 * 1000, 30); // 1 minute, 30 searches

// Admin operations rate limiter
export const adminLimiter = createSimpleLimiter(60 * 1000, 100); // 1 minute, 100 operations

// Webhook rate limiter
export const webhookLimiter = createSimpleLimiter(60 * 1000, 1000); // 1 minute, 1000 webhooks

// Premium user limiter (same as API for now)
export const premiumUserLimiter = createSimpleLimiter(15 * 60 * 1000, 500); // 15 minutes, 500 requests

// Export all limiters
export const rateLimiters = {
  api: apiLimiter,
  auth: authLimiter,
  registration: registrationLimiter,
  passwordReset: passwordResetLimiter,
  upload: uploadLimiter,
  projectCreation: projectCreationLimiter,
  application: applicationLimiter,
  message: messageLimiter,
  search: searchLimiter,
  admin: adminLimiter,
  webhook: webhookLimiter,
  premium: premiumUserLimiter,
};
