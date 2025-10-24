import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '@/config/logger';

// Enhanced rate limiting with user-specific limits
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Too many requests',
      message: options.message || 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip || 'unknown';
    }),
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });

      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// General API rate limiter (per user/IP)
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per user
  message: 'Too many API requests. Please slow down.'
});

// Authentication endpoints (stricter)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => `auth:${req.ip}` // Always use IP for auth
});

// Password reset (very strict)
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again in an hour.',
  keyGenerator: (req: Request) => `pwd-reset:${req.ip}`
});

// Email sending (prevent spam)
export const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 emails per hour per user
  message: 'Email sending limit reached. Please try again later.',
});

// File upload limiter
export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Upload limit reached. Please try again later.'
});

// Admin operations (moderate limits)
export const adminLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 admin operations per 5 minutes
  message: 'Admin operation limit reached. Please slow down.'
});

// Search operations (prevent abuse)
export const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Search limit reached. Please wait before searching again.'
});

// Application submission (prevent spam applications)
export const applicationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 applications per hour per user
  message: 'Application submission limit reached. Please try again later.'
});

// Project creation (prevent spam projects)
export const projectCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 projects per hour per user
  message: 'Project creation limit reached. Please try again later.'
});

// Message sending (prevent spam)
export const messageLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 messages per 15 minutes
  message: 'Message sending limit reached. Please slow down.'
});

// Export all limiters
export const rateLimiters = {
  api: apiLimiter,
  auth: authLimiter,
  passwordReset: passwordResetLimiter,
  email: emailLimiter,
  upload: uploadLimiter,
  admin: adminLimiter,
  search: searchLimiter,
  application: applicationLimiter,
  projectCreation: projectCreationLimiter,
  message: messageLimiter
};

export default rateLimiters;
